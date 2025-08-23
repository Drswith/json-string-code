import * as vscode from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { i18n } from './i18n'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

export class JsonCodeHoverProvider implements vscode.HoverProvider {
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    // 只处理JSON文档
    if (!this.isJsonDocument(document)) {
      return undefined
    }

    // 检查位置是否在代码片段范围内
    const editor = vscode.window.activeTextEditor
    if (!editor || editor.document !== document) {
      return undefined
    }

    const snippet = decorationManager.isPositionInCodeSnippet(editor, position)
    if (!snippet) {
      return undefined
    }

    // 只在值范围内显示悬停
    if (!snippet.valueRange.contains(position)) {
      return undefined
    }

    return this.createHover(snippet, document)
  }

  private createHover(snippet: any, document: vscode.TextDocument): vscode.Hover {
    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // 标题
    const title = snippet.isForced
      ? `🔒 **Forced Code Snippet**: \`${snippet.key}\``
      : `💡 **Code Snippet**: \`${snippet.key}\``

    markdown.appendMarkdown(`${title}\n\n`)

    // 检测到的语言信息
    const language = this.detectLanguage(snippet.key, snippet.value)
    markdown.appendMarkdown(`**${i18n.t('hover.language')}**: ${language}\n\n`)

    // 操作按钮 - 移到预览之前
    const editCommand = {
      title: i18n.t('hover.editButton'),
      command: 'vscode-json-string-code-editor.editSnippetFromHover',
      arguments: [document.uri, snippet],
    }

    const copyCommand = {
      title: i18n.t('hover.copyButton'),
      command: 'vscode-json-string-code-editor.copySnippetCode',
      arguments: [snippet.value],
    }

    // 添加命令链接
    markdown.appendMarkdown(
      `[${editCommand.title}](command:${editCommand.command}?${encodeURIComponent(JSON.stringify(editCommand.arguments))}) | `
      + `[${copyCommand.title}](command:${copyCommand.command}?${encodeURIComponent(JSON.stringify(copyCommand.arguments))})`,
    )
    markdown.appendMarkdown('\n\n---\n\n')

    // 代码预览
    const previewLength = 300
    const preview = snippet.value.length > previewLength
      ? `${snippet.value.substring(0, previewLength)}...`
      : snippet.value

    markdown.appendMarkdown(`**${i18n.t('hover.preview')}**:\n\n`)
    markdown.appendCodeblock(preview, language)
    markdown.appendMarkdown('\n')

    // 如果是强制代码片段，添加说明
    if (snippet.isForced) {
      markdown.appendMarkdown('\n\n---\n\n')
      markdown.appendMarkdown(`🔒 ${i18n.t('hover.forceCodeSnippet')}`)
    }

    return new vscode.Hover(markdown, snippet.valueRange)
  }

  /**
   * 检测代码语言类型
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

    // 根据内容推断语言
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
   * 检查文档是否为JSON文档
   */
  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }
}

/**
 * 悬停命令处理器
 */
export class HoverCommandHandler {
  private disposables: vscode.Disposable[] = []

  constructor() {
    this.registerCommands()
  }

  private registerCommands(): void {
    // 从悬停面板编辑代码片段
    const editCommand = vscode.commands.registerCommand(
      'vscode-json-string-code-editor.editSnippetFromHover',
      async (documentUri: vscode.Uri, snippet: any) => {
        try {
          const document = await vscode.workspace.openTextDocument(documentUri)
          const editor = await tempFileManager.createTempFile(snippet, document)

          if (editor) {
            vscode.window.showInformationMessage(
              i18n.t('notification.tempFileCreated', snippet.key),
            )
          }
        }
        catch (error) {
          if (config.enableLogging) {
            logger.error(`Failed to edit snippet from hover: ${error}`)
          }
          vscode.window.showErrorMessage(i18n.t('notification.failedToOpen', String(error)))
        }
      },
    )

    // 复制代码片段
    const copyCommand = vscode.commands.registerCommand(
      'vscode-json-string-code-editor.copySnippetCode',
      async (code: string) => {
        try {
          await vscode.env.clipboard.writeText(code)
          vscode.window.showInformationMessage(i18n.t('notification.codeCopied'))
        }
        catch (error) {
          if (config.enableLogging) {
            logger.error(`Failed to copy code: ${error}`)
          }
          vscode.window.showErrorMessage(i18n.t('notification.failedToCopy', String(error)))
        }
      },
    )

    this.disposables.push(editCommand, copyCommand)
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }
}

export const hoverProvider = new JsonCodeHoverProvider()
// HoverCommandHandler 实例应该在 index.ts 中创建，避免重复注册命令
// export const hoverCommandHandler = new HoverCommandHandler()
