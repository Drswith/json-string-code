import * as vscode from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { i18n } from './i18n'
import { parseJsonKeyValueAtPosition } from './json-parser'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

export class ClickHandler {
  private disposables: vscode.Disposable[] = []

  constructor() {
    this.setupClickHandler()
  }

  private setupClickHandler(): void {
    // 监听编辑器选择变化事件（包括点击）
    const selectionChangeDisposable = vscode.window.onDidChangeTextEditorSelection(async (event) => {
      await this.handleSelectionChange(event)
    })

    this.disposables.push(selectionChangeDisposable)
  }

  private async handleSelectionChange(event: vscode.TextEditorSelectionChangeEvent): Promise<void> {
    // 移除自动点击处理功能
    // 用户现在只能通过右键菜单、命令面板或悬停按钮来编辑代码片段
    // 这样可以避免左键点击时意外打开临时编辑器
    // eslint-disable-next-line no-useless-return
    return
  }

  private async handleCodeSnippetClick(snippet: any, document: vscode.TextDocument): Promise<void> {
    try {
      if (config.enableLogging) {
        logger.info(`Code snippet clicked: ${snippet.key}`)
      }

      // 创建并打开临时文件
      const editor = await tempFileManager.createTempFile(snippet, document)

      if (editor) {
        // 显示成功消息
        vscode.window.showInformationMessage(
          i18n.t('notification.openedEditor', snippet.key),
        )
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to handle code snippet click: ${error}`)
      }
      vscode.window.showErrorMessage(i18n.t('notification.failedToOpen', String(error)))
    }
  }

  /**
   * 手动触发代码片段编辑（用于右键菜单等）
   */
  async editCodeSnippetAtPosition(editor: vscode.TextEditor, position: vscode.Position): Promise<void> {
    // 首先尝试从装饰管理器获取代码片段
    let snippet = decorationManager.isPositionInCodeSnippet(editor, position)

    // 如果没有找到代码片段装饰，尝试解析位置上的JSON键值对
    if (!snippet) {
      snippet = parseJsonKeyValueAtPosition(editor.document, position)
    }

    if (snippet) {
      await this.handleCodeSnippetClick(snippet, editor.document)
    }
    else {
      vscode.window.showWarningMessage(i18n.t('notification.noCodeSnippet'))
    }
  }

  /**
   * 手动触发代码片段编辑（用于命令面板等）
   */
  async editCodeSnippetAtCursor(): Promise<void> {
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showWarningMessage(i18n.t('notification.noActiveEditor'))
      return
    }

    if (!this.isJsonDocument(editor.document)) {
      vscode.window.showWarningMessage(i18n.t('notification.jsonFilesOnly'))
      return
    }

    const position = editor.selection.active
    await this.editCodeSnippetAtPosition(editor, position)
  }

  /**
   * 显示所有可用的代码片段供用户选择
   */
  async showCodeSnippetPicker(): Promise<void> {
    const editor = vscode.window.activeTextEditor

    if (!editor) {
      vscode.window.showWarningMessage(i18n.t('notification.noActiveEditor'))
      return
    }

    if (!this.isJsonDocument(editor.document)) {
      vscode.window.showWarningMessage(i18n.t('notification.jsonFilesOnly'))
      return
    }

    const snippets = decorationManager.getActiveSnippets(editor.document.uri.toString())

    if (snippets.length === 0) {
      vscode.window.showInformationMessage(i18n.t('notification.noCodeSnippet'))
      return
    }

    // 创建快速选择项
    const quickPickItems: vscode.QuickPickItem[] = snippets.map(snippet => ({
      label: snippet.key,
      description: snippet.isForced ? '🔒 Forced' : 'Auto-detected',
      detail: snippet.value.length > 100
        ? `${snippet.value.substring(0, 100)}...`
        : snippet.value,
      snippet, // 存储原始片段数据
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
   * 检查文档是否为JSON文档
   */
  private isJsonDocument(document: vscode.TextDocument): boolean {
    return document.languageId === 'json' || document.languageId === 'jsonc'
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.disposables.forEach(d => d.dispose())
    this.disposables = []
  }
}

export const clickHandler = new ClickHandler()
