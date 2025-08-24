import * as vscode from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { parseJsonKeyValueAtPosition } from './json-parser'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

export class ClickHandler {
  private disposables: vscode.Disposable[] = []

  constructor() {
    this.setupClickHandler()
  }

  private setupClickHandler(): void {
    // Listen for editor selection change events (including clicks)
    const selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection(async (event) => {
      await this.handleSelectionChange(event)
    })

    this.disposables.push(selectionChangeDisposable)
  }

  private async handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
    // Remove automatic click handling functionality
    // Users can now only edit code snippets through right-click menu, command palette, or hover buttons
    // This prevents accidentally opening temporary editor on left clicks
    // eslint-disable-next-line no-useless-return
    return
  }

  private async handleCodeSnippetClick(snippet: any, document: vscode.TextDocument): Promise<void> {
    try {
      if (config.enableLogging) {
        logger.info(`Code snippet clicked: ${snippet.key}`)
      }

      // Create and open temporary file
      const editor = await tempFileManager.createTempFile(snippet, document)

      if (editor) {
        // Show success message
        vscode.window.showInformationMessage(
          `Opened code editor for "${snippet.key}". Save to sync changes.`,
        )
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to handle code snippet click: ${error}`)
      }
      vscode.window.showErrorMessage(`Failed to open code editor: ${String(error)}`)
    }
  }

  /**
   * Manually trigger code snippet editing (for context menu, etc.)
   */
  async editCodeSnippetAtPosition(editor: vscode.TextEditor, position: vscode.Position): Promise<void> {
    // First try to get code snippet from decoration manager
    let snippet = decorationManager.isPositionInCodeSnippet(editor, position)

    // If no code snippet decoration found, try parsing JSON key-value pair at position
    if (!snippet) {
      snippet = parseJsonKeyValueAtPosition(editor.document, position)
    }

    if (snippet) {
      await this.handleCodeSnippetClick(snippet, editor.document)
    }
    else {
      vscode.window.showWarningMessage('No code snippet found at cursor position')
    }
  }

  /**
   * Manually trigger code snippet editing (for command palette, etc.)
   */
  async editCodeSnippetAtCursor(): Promise<void> {
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showWarningMessage('No active editor found')
      return
    }

    if (!this.isJsonDocument(editor.document)) {
      vscode.window.showWarningMessage('This command only works with JSON/JSONC files')
      return
    }

    const position = editor.selection.active
    await this.editCodeSnippetAtPosition(editor, position)
  }

  /**
   * Show all available code snippets for user selection
   */
  async showCodeSnippetPicker(): Promise<void> {
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showWarningMessage('No active editor found')
      return
    }

    if (!this.isJsonDocument(editor.document)) {
      vscode.window.showWarningMessage('This command only works with JSON/JSONC files')
      return
    }

    const snippets = decorationManager.getActiveSnippets(editor.document.uri.toString())

    if (snippets.length === 0) {
      vscode.window.showInformationMessage('No code snippet found at cursor position')
      return
    }

    // Create quick pick items
    const quickPickItems: vscode.QuickPickItem[] = snippets.map(snippet => ({
      label: snippet.key,
      description: snippet.isForced ? '🔒 Forced' : 'Auto-detected',
      detail: snippet.value.length > 100
        ? `${snippet.value.substring(0, 100)}...`
        : snippet.value,
      snippet, // Store original snippet data
    } as any))

    const selected = await vscode.window.showQuickPick(quickPickItems, {
      placeHolder: 'Select a code snippet to edit',
      matchOnDescription: true,
      matchOnDetail: true,
    })

    if (selected && (selected as any).snippet) {
      await this.handleCodeSnippetClick((selected as any).snippet, editor.document)
    }
  }

  /**
   * Check if document is a JSON document
   */
  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }
}

export const clickHandler = new ClickHandler()
