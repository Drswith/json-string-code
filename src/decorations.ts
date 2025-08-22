import type { CodeSnippet } from './json-parser'
import * as vscode from 'vscode'
import { config } from './config'
import { logger } from './utils'

class DecorationManager {
  private codeSnippetDecorationType: vscode.TextEditorDecorationType
  private forcedCodeSnippetDecorationType: vscode.TextEditorDecorationType
  private activeDecorations = new Map<string, CodeSnippet[]>()

  constructor() {
    // 创建普通代码片段装饰类型
    this.codeSnippetDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
    })

    // 创建强制识别代码片段装饰类型（与普通代码片段相同背景色，但保留边框）
    this.forcedCodeSnippetDecorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
      border: '1px solid rgba(255, 107, 53, 0.3)',
    })
  }

  /**
   * 更新编辑器中的装饰
   */
  updateDecorations(editor: vscode.TextEditor, snippets: CodeSnippet[]): void {
    if (!editor || !editor.document) {
      return
    }

    const documentUri = editor.document.uri.toString()
    this.activeDecorations.set(documentUri, snippets)

    // 分离普通代码片段和强制代码片段
    const normalSnippets = snippets.filter(s => !s.isForced)
    const forcedSnippets = snippets.filter(s => s.isForced)

    // 创建普通代码片段装饰
    const normalDecorations: vscode.DecorationOptions[] = normalSnippets.map(snippet => ({
      range: snippet.valueRange,
    }))

    // 创建强制代码片段装饰
    const forcedDecorations: vscode.DecorationOptions[] = forcedSnippets.map(snippet => ({
      range: snippet.valueRange,
    }))

    // 应用装饰
    editor.setDecorations(this.codeSnippetDecorationType, normalDecorations)
    editor.setDecorations(this.forcedCodeSnippetDecorationType, forcedDecorations)

    if (config.enableLogging) {
      logger.info(`Applied decorations: ${normalSnippets.length} normal, ${forcedSnippets.length} forced`)
    }
  }

  /**
   * 清除编辑器中的装饰
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
   * 获取指定文档的活动代码片段
   */
  getActiveSnippets(documentUri: string): CodeSnippet[] {
    return this.activeDecorations.get(documentUri) || []
  }

  /**
   * 检查位置是否在代码片段装饰范围内
   */
  isPositionInCodeSnippet(editor: vscode.TextEditor, position: vscode.Position): CodeSnippet | undefined {
    const documentUri = editor.document.uri.toString()
    const snippets = this.activeDecorations.get(documentUri) || []

    return snippets.find(snippet => snippet.valueRange.contains(position))
  }

  /**
   * 获取指定范围内的代码片段
   */
  getSnippetsInRange(editor: vscode.TextEditor, range: vscode.Range): CodeSnippet[] {
    const documentUri = editor.document.uri.toString()
    const snippets = this.activeDecorations.get(documentUri) || []

    return snippets.filter(snippet =>
      snippet.valueRange.intersection(range) !== undefined,
    )
  }

  /**
   * 刷新所有活动编辑器的装饰
   */
  refreshAllDecorations(): void {
    vscode.window.visibleTextEditors.forEach((editor) => {
      if (this.isJsonDocument(editor.document)) {
        // 这里需要重新解析文档并更新装饰
        // 这个方法会在主模块中调用
        vscode.commands.executeCommand('json-string-code.refreshDecorations', editor.document.uri)
      }
    })
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
    this.codeSnippetDecorationType.dispose()
    this.forcedCodeSnippetDecorationType.dispose()
    this.activeDecorations.clear()
  }
}

export const decorationManager = new DecorationManager()
