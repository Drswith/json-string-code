import type { CodeSnippet } from './json-parser'
import * as vscode from 'vscode'
import { config } from './config'
import { logger } from './utils'

class DecorationManager {
  private codeSnippetDecorationType: vscode.TextEditorDecorationType
  private forcedCodeSnippetDecorationType: vscode.TextEditorDecorationType
  private activeDecorations = new Map<string, CodeSnippet[]>()

  constructor() {
    // Create normal code snippet decoration type
    this.codeSnippetDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
    })

    // Create forced code snippet decoration type (same background as normal snippets, but with border)
    this.forcedCodeSnippetDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
      border: '1px solid rgba(255, 107, 53, 0.3)',
    })
  }

  /**
   * Update decorations in the editor
   */
  updateDecorations(editor: vscode.TextEditor, snippets: CodeSnippet[]): void {
    if (!editor || !editor.document) {
      return
    }

    const documentUri = editor.document.uri.toString()
    this.activeDecorations.set(documentUri, snippets)

    // Separate normal and forced code snippets
    const normalSnippets = snippets.filter(s => !s.isForced)
    const forcedSnippets = snippets.filter(s => s.isForced)

    // Create normal code snippet decorations
    const normalDecorations: vscode.DecorationOptions[] = normalSnippets.map(snippet => ({
      range: snippet.valueRange,
    }))

    // Create forced code snippet decorations
    const forcedDecorations: vscode.DecorationOptions[] = forcedSnippets.map(snippet => ({
      range: snippet.valueRange,
    }))

    // Apply decorations
    editor.setDecorations(this.codeSnippetDecorationType, normalDecorations)
    editor.setDecorations(this.forcedCodeSnippetDecorationType, forcedDecorations)

    if (config.enableLogging) {
      logger.info(`Applied decorations: ${normalSnippets.length} normal, ${forcedSnippets.length} forced`)
    }
  }

  /**
   * Clear decorations in the editor
   */
  clearDecorations(editor: vscode.TextEditor): void {
    if (!editor) {
      return
    }

    const documentUri = editor.document.uri.toString()
    this.activeDecorations.delete(documentUri)

    editor.setDecorations(this.codeSnippetDecorationType, [])
    editor.setDecorations(this.forcedCodeSnippetDecorationType, [])

    if (config.enableLogging) {
      logger.info('Cleared decorations')
    }
  }

  /**
   * Get active code snippets for the specified document
   */
  getActiveSnippets(documentUri: string): CodeSnippet[] {
    return this.activeDecorations.get(documentUri) || []
  }

  /**
   * Check if position is within code snippet decoration range
   */
  isPositionInCodeSnippet(editor: vscode.TextEditor, position: vscode.Position): CodeSnippet | undefined {
    const documentUri = editor.document.uri.toString()
    const snippets = this.activeDecorations.get(documentUri) || []

    return snippets.find(snippet => snippet.valueRange.contains(position))
  }

  /**
   * Get code snippets within the specified range
   */
  getSnippetsInRange(editor: vscode.TextEditor, range: vscode.Range): CodeSnippet[] {
    const documentUri = editor.document.uri.toString()
    const snippets = this.activeDecorations.get(documentUri) || []

    return snippets.filter(snippet =>
      snippet.valueRange.intersection(range) !== undefined,
    )
  }

  /**
   * Refresh decorations for all active editors
   */
  refreshAllDecorations(): void {
    vscode.window.visibleTextEditors.forEach((editor) => {
      if (this.isJsonDocument(editor.document)) {
        // Need to re-parse document and update decorations
        // This method will be called from the main module
        vscode.commands.executeCommand('vscode-json-string-code-editor.refreshDecorations', editor.document.uri)
      }
    })
  }

  /**
   * Check if document is a JSON document
   */
  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }

  /**
   * Release resources
   */
  dispose(): void {
    this.codeSnippetDecorationType.dispose()
    this.forcedCodeSnippetDecorationType.dispose()
    this.activeDecorations.clear()
  }
}

export const decorationManager = new DecorationManager()
