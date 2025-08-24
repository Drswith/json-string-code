import type { TextDocument, TextDocumentChangeEvent, TextEditor, Uri } from 'vscode'
import { minimatch } from 'minimatch'
import { useDisposable, useFsWatcher } from 'reactive-vscode'
import { window, workspace } from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { parseJsonDocument } from './json-parser'
import { logger } from './utils'

// Active documents tracking
const activeDocuments = new Set<string>()

// Debounce timers
const debounceTimers = new Map<string, NodeJS.Timeout>()

/**
 * 设置文件监听器
 */
export function setupFileWatchers(): void {
  // 使用 reactive-vscode 的 useFsWatcher 来监听 JSON 文件变化
  const includePatterns = config.include || ['**/*.json', '**/*.jsonc']

  includePatterns.forEach((pattern) => {
    const watcher = useFsWatcher(pattern)

    watcher.onDidChange((uri: Uri) => {
      if (config.enableLogging) {
        logger.info(`File changed: ${uri.fsPath}`)
      }

      // 当文件变化时，刷新对应的编辑器
      const editor = window.visibleTextEditors.find(e =>
        e.document.uri.toString() === uri.toString(),
      )

      if (editor && shouldProcessDocument(editor.document)) {
        processDocument(editor)
      }
    })

    watcher.onDidDelete((uri: Uri) => {
      if (config.enableLogging) {
        logger.info(`File deleted: ${uri.fsPath}`)
      }

      // 当文件删除时，处理文档关闭
      const editor = window.visibleTextEditors.find(e =>
        e.document.uri.toString() === uri.toString(),
      )

      if (editor && shouldProcessDocument(editor.document)) {
        handleDocumentClose(editor.document)
      }
    })
  })

  // Listen for active editor changes
  useDisposable(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        handleEditorActivation(editor)
      }
    }),
  )

  // Listen for visible editor changes
  useDisposable(
    window.onDidChangeVisibleTextEditors((editors) => {
      editors.forEach(editor => handleEditorActivation(editor))
    }),
  )

  // Listen for document content changes
  useDisposable(
    workspace.onDidChangeTextDocument((event) => {
      handleDocumentChange(event)
    }),
  )

  // Listen for document open
  useDisposable(
    workspace.onDidOpenTextDocument((document) => {
      handleDocumentOpen(document)
    }),
  )

  // Listen for document close
  useDisposable(
    workspace.onDidCloseTextDocument((document) => {
      handleDocumentClose(document)
    }),
  )

  // Listen for configuration changes
  useDisposable(
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('vscode-json-string-code-editor')) {
        handleConfigurationChange()
      }
    }),
  )

  // Initialize currently open editors
  initializeOpenEditors()
}

function initializeOpenEditors(): void {
  window.visibleTextEditors.forEach((editor) => {
    handleEditorActivation(editor)
  })
}

function handleEditorActivation(editor: TextEditor): void {
  const document = editor.document

  if (shouldProcessDocument(document)) {
    processDocument(editor)
  }
  else {
    // Clear decorations for non-JSON documents
    decorationManager.clearDecorations(editor)
  }
}

function handleDocumentChange(event: TextDocumentChangeEvent): void {
  const document = event.document

  if (!shouldProcessDocument(document)) {
    return
  }

  // Debounce to avoid frequent updates
  debounceProcessDocument(document)
}

function handleDocumentOpen(document: TextDocument): void {
  if (shouldProcessDocument(document)) {
    const editor = window.visibleTextEditors.find(e => e.document === document)
    if (editor) {
      processDocument(editor)
    }
  }
}

function handleDocumentClose(document: TextDocument): void {
  const documentUri = document.uri.toString()
  activeDocuments.delete(documentUri)

  if (config.enableLogging) {
    logger.info(`Document closed: ${document.fileName}`)
  }
}

function handleConfigurationChange(): void {
  if (config.enableLogging) {
    logger.info('Configuration changed, refreshing all decorations')
  }

  // Reprocess all active documents
  window.visibleTextEditors.forEach((editor) => {
    if (shouldProcessDocument(editor.document)) {
      processDocument(editor)
    }
    else {
      decorationManager.clearDecorations(editor)
    }
  })
}

function shouldProcessDocument(document: TextDocument): boolean {
  // Check document type
  if (!isJsonDocument(document)) {
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

function isJsonDocument(document: TextDocument): boolean {
  return document.languageId === 'json' || document.languageId === 'jsonc'
}

export function processDocument(editor: TextEditor): void {
  const document = editor.document
  const documentUri = document.uri.toString()

  try {
    // Parse JSON document and identify code snippets
    const snippets = parseJsonDocument(document)

    // Update decorations
    decorationManager.updateDecorations(editor, snippets)

    // Mark as active document
    activeDocuments.add(documentUri)

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

function debounceProcessDocument(document: TextDocument): void {
  const documentUri = document.uri.toString()

  // Clear previous timer
  const existingTimer = debounceTimers.get(documentUri)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  // Set new timer
  const timer = setTimeout(() => {
    const editor = window.visibleTextEditors.find(e => e.document === document)
    if (editor) {
      processDocument(editor)
    }
    debounceTimers.delete(documentUri)
  }, 500) // 500ms debounce delay

  debounceTimers.set(documentUri, timer)
}

/**
 * Manually refresh decorations for specified document
 */
export function refreshDocument(documentUri: Uri): void {
  const editor = window.visibleTextEditors.find(e =>
    e.document.uri.toString() === documentUri.toString(),
  )

  if (editor && shouldProcessDocument(editor.document)) {
    processDocument(editor)
  }
}

/**
 * Get list of active documents
 */
export function getActiveDocuments(): string[] {
  return Array.from(activeDocuments)
}

/**
 * Dispose resources
 */
export function dispose(): void {
  // Clear all debounce timers
  debounceTimers.forEach(timer => clearTimeout(timer))
  debounceTimers.clear()

  // Clear active document records
  activeDocuments.clear()
}

export const fileWatcher = {
  setupFileWatchers,
  processDocument,
  refreshDocument,
  getActiveDocuments,
  dispose,
}
