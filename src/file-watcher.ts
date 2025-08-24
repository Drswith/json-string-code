import { minimatch } from 'minimatch'
import * as vscode from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { parseJsonDocument } from './json-parser'
import { logger } from './utils'

class FileWatcher {
  private disposables: vscode.Disposable[] = []
  private activeDocuments = new Set<string>()

  constructor() {
    this.setupWatchers()
  }

  private setupWatchers(): void {
    // Listen for active editor changes
    const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.handleEditorActivation(editor)
      }
    })

    // Listen for visible editor changes
    const visibleEditorsDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
      editors.forEach(editor => this.handleEditorActivation(editor))
    })

    // Listen for document content changes
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      this.handleDocumentChange(event)
    })

    // Listen for document open
    const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
      this.handleDocumentOpen(document)
    })

    // Listen for document close
    const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
      this.handleDocumentClose(document)
    })

    // Listen for configuration changes
    const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('vscode-json-string-code-editor')) {
        this.handleConfigurationChange()
      }
    })

    this.disposables.push(
      activeEditorDisposable,
      visibleEditorsDisposable,
      documentChangeDisposable,
      documentOpenDisposable,
      documentCloseDisposable,
      configChangeDisposable,
    )

    // Initialize currently open editors
    this.initializeOpenEditors()
  }

  private initializeOpenEditors(): void {
    vscode.window.visibleTextEditors.forEach((editor) => {
      this.handleEditorActivation(editor)
    })
  }

  private handleEditorActivation(editor: vscode.TextEditor): void {
    const document = editor.document

    if (this.shouldProcessDocument(document)) {
      this.processDocument(editor)
    }
    else {
      // Clear decorations for non-JSON documents
      decorationManager.clearDecorations(editor)
    }
  }

  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    const document = event.document

    if (!this.shouldProcessDocument(document)) {
      return
    }

    // Debounce to avoid frequent updates
    this.debounceProcessDocument(document)
  }

  private handleDocumentOpen(document: vscode.TextDocument): void {
    if (this.shouldProcessDocument(document)) {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document)
      if (editor) {
        this.processDocument(editor)
      }
    }
  }

  private handleDocumentClose(document: vscode.TextDocument): void {
    const documentUri = document.uri.toString()
    this.activeDocuments.delete(documentUri)

    if (config.enableLogging) {
      logger.info(`Document closed: ${document.fileName}`)
    }
  }

  private handleConfigurationChange(): void {
    if (config.enableLogging) {
      logger.info('Configuration changed, refreshing all decorations')
    }

    // Reprocess all active documents
    vscode.window.visibleTextEditors.forEach((editor) => {
      if (this.shouldProcessDocument(editor.document)) {
        this.processDocument(editor)
      }
      else {
        decorationManager.clearDecorations(editor)
      }
    })
  }

  private shouldProcessDocument(document: vscode.TextDocument): boolean {
    // Check document type
    if (!this.isJsonDocument(document)) {
      return false
    }

    // Check if file path matches include patterns
    const includePatterns = config.include || ['**/*.json', '**/*.jsonc']
    const filePath = document.uri.fsPath

    return includePatterns.some((pattern: any) => {
      try {
        return minimatch(filePath, pattern, { matchBase: true })
      }
      catch (error) {
        if (config.enableLogging) {
          logger.error(`Invalid glob pattern: ${pattern}, error: ${error}`)
        }
        return false
      }
    })
  }

  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }

  private processDocument(editor: vscode.TextEditor): void {
    const document = editor.document
    const documentUri = document.uri.toString()

    try {
      // Parse JSON document and identify code snippets
      const snippets = parseJsonDocument(document)

      // Update decorations
      decorationManager.updateDecorations(editor, snippets)

      // Mark as active document
      this.activeDocuments.add(documentUri)

      if (config.enableLogging) {
        logger.info(`Processed document: ${document.fileName}, found ${snippets.length} code snippets`)
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to process document ${document.fileName}: ${error}`)
      }

      // Clear decorations in case of error
      decorationManager.clearDecorations(editor)
    }
  }

  // Debounce document changes
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  private debounceProcessDocument(document: vscode.TextDocument): void {
    const documentUri = document.uri.toString()

    // Clear previous timer
    const existingTimer = this.debounceTimers.get(documentUri)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Set new timer
    const timer = setTimeout(() => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document)
      if (editor) {
        this.processDocument(editor)
      }
      this.debounceTimers.delete(documentUri)
    }, 500) // 500ms debounce delay

    this.debounceTimers.set(documentUri, timer)
  }

  /**
   * Manually refresh decorations for specified document
   */
  refreshDocument(documentUri: vscode.Uri): void {
    const editor = vscode.window.visibleTextEditors.find(e =>
      e.document.uri.toString() === documentUri.toString(),
    )

    if (editor && this.shouldProcessDocument(editor.document)) {
      this.processDocument(editor)
    }
  }

  /**
   * Get list of active documents
   */
  getActiveDocuments(): string[] {
    return Array.from(this.activeDocuments)
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    // Clear all debounce timers
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // Clear event listeners
    this.disposables.forEach(d => d.dispose())
    this.disposables = []

    // Clear active document records
    this.activeDocuments.clear()
  }
}

export const fileWatcher = new FileWatcher()
