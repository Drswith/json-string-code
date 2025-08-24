import * as vscode from 'vscode'
import { decorationManager } from './decorations'

export class JsonCodeHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    // Only handle JSON documents
    if (!this.isJsonDocument(document)) {
      return undefined
    }

    // Check if position is within code snippet range
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document !== document) {
      return undefined
    }

    const snippet = decorationManager.isPositionInCodeSnippet(editor, position)
    if (!snippet) {
      return undefined
    }

    // Only show hover within value range
    if (!snippet.valueRange.contains(position)) {
      return undefined
    }

    return this.createHover(snippet, document)
  }

  private createHover(snippet: any, document: vscode.TextDocument): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // Title
    const title = snippet.isForced
      ? `🔒 **Forced Code Snippet**: \`${snippet.key}\``
      : `💡 **Code Snippet**: \`${snippet.key}\``

    markdown.appendMarkdown(`${title}\n\n`)

    // Detected language information
    const language = this.detectLanguage(snippet.key, snippet.value)
    markdown.appendMarkdown(`**Language**: ${language}\n\n`)

    // Action buttons - moved before preview
    const editCommand = {
      title: '✏️ Edit in Temporary Tab',
      command: 'vscode-json-string-code-editor.editSnippetFromHover',
      arguments: [document.uri, snippet],
    }

    const copyCommand = {
      title: '📋 Copy Code',
      command: 'vscode-json-string-code-editor.copySnippetCode',
      arguments: [snippet.value],
    }

    // Add command links
    markdown.appendMarkdown(
      `[${editCommand.title}](command:${editCommand.command}?${encodeURIComponent(JSON.stringify(editCommand.arguments))}) | `
      + `[${copyCommand.title}](command:${copyCommand.command}?${encodeURIComponent(JSON.stringify(copyCommand.arguments))})`,
    )
    markdown.appendMarkdown('\n\n---\n\n')

    // Code preview
    const previewLength = 300
    const preview = snippet.value.length > previewLength
      ? `${snippet.value.substring(0, previewLength)}...`
      : snippet.value

    markdown.appendMarkdown(`**Preview**:\n\n`)
    markdown.appendCodeblock(preview, language)
    markdown.appendMarkdown('\n')

    // If it's a forced code snippet, add explanation
    if (snippet.isForced) {
      markdown.appendMarkdown('\n\n---\n\n')
      markdown.appendMarkdown(`🔒 This is a force code snippet (key matches configured patterns)`)
    }

    return new vscode.Hover(markdown, snippet.valueRange)
  }

  /**
   * Detect code language type
   */
  private detectLanguage(key: string, value: string): string {
    const keyLower = key.toLowerCase()

    if (keyLower.includes('sql') || keyLower.includes('query')) {
      return 'sql'
    }
    if (keyLower.includes('html') || keyLower.includes('template')) {
      return 'html'
    }
    if (keyLower.includes('css') || keyLower.includes('style')) {
      return 'css'
    }
    if (keyLower.includes('xml')) {
      return 'xml'
    }
    if (keyLower.includes('yaml') || keyLower.includes('yml')) {
      return 'yaml'
    }
    if (keyLower.includes('markdown') || keyLower.includes('md')) {
      return 'markdown'
    }
    if (keyLower.includes('python') || keyLower.includes('py')) {
      return 'python'
    }
    if (keyLower.includes('typescript') || keyLower.includes('ts')) {
      return 'typescript'
    }

    // Infer language based on content
    if (value.includes('function') || value.includes('=>') || value.includes('const ') || value.includes('let ')) {
      return 'javascript'
    }
    if (value.includes('def ') || value.includes('import ') || value.includes('from ')) {
      return 'python'
    }
    if (value.includes('SELECT') || value.includes('INSERT') || value.includes('UPDATE')) {
      return 'sql'
    }
    if (value.includes('<') && value.includes('>')) {
      return 'html'
    }

    return 'javascript'
  }

  /**
   * Check if document is a JSON document
   */
  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }
}

/**
 * Hover command handler
 * Note: Command registration is now managed centrally in index.ts
 */
// export class HoverCommandHandler {
//   dispose(): void {
//     // Commands are now registered and managed in index.ts, no additional cleanup needed here
//   }
// }

export const hoverProvider = new JsonCodeHoverProvider()
// HoverCommandHandler instance should be created in index.ts to avoid duplicate command registration
// export const hoverCommandHandler = new HoverCommandHandler()
