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
    // 监听活动编辑器变化
    const activeEditorDisposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        this.handleEditorActivation(editor)
      }
    })

    // 监听可见编辑器变化
    const visibleEditorsDisposable = vscode.window.onDidChangeVisibleTextEditors((editors) => {
      editors.forEach(editor => this.handleEditorActivation(editor))
    })

    // 监听文档内容变化
    const documentChangeDisposable = vscode.workspace.onDidChangeTextDocument((event) => {
      this.handleDocumentChange(event)
    })

    // 监听文档打开
    const documentOpenDisposable = vscode.workspace.onDidOpenTextDocument((document) => {
      this.handleDocumentOpen(document)
    })

    // 监听文档关闭
    const documentCloseDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
      this.handleDocumentClose(document)
    })

    // 监听配置变化
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

    // 初始化当前打开的编辑器
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
      // 清除非JSON文档的装饰
      decorationManager.clearDecorations(editor)
    }
  }

  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    const document = event.document

    if (!this.shouldProcessDocument(document)) {
      return
    }

    // 防抖处理，避免频繁更新
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

    // 重新处理所有活动文档
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
    // 检查文档类型
    if (!this.isJsonDocument(document)) {
      return false
    }

    // 检查文件路径是否匹配include模式
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
      // 解析JSON文档并识别代码片段
      const snippets = parseJsonDocument(document)

      // 更新装饰
      decorationManager.updateDecorations(editor, snippets)

      // 标记为活动文档
      this.activeDocuments.add(documentUri)

      if (config.enableLogging) {
        logger.info(`Processed document: ${document.fileName}, found ${snippets.length} code snippets`)
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to process document ${document.fileName}: ${error}`)
      }

      // 清除装饰以防出错
      decorationManager.clearDecorations(editor)
    }
  }

  // 防抖处理文档变化
  private debounceTimers = new Map<string, NodeJS.Timeout>()

  private debounceProcessDocument(document: vscode.TextDocument): void {
    const documentUri = document.uri.toString()

    // 清除之前的定时器
    const existingTimer = this.debounceTimers.get(documentUri)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      const editor = vscode.window.visibleTextEditors.find(e => e.document === document)
      if (editor) {
        this.processDocument(editor)
      }
      this.debounceTimers.delete(documentUri)
    }, 500) // 500ms 防抖延迟

    this.debounceTimers.set(documentUri, timer)
  }

  /**
   * 手动刷新指定文档的装饰
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
   * 获取活动文档列表
   */
  getActiveDocuments(): string[] {
    return Array.from(this.activeDocuments)
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // 清除所有防抖定时器
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()

    // 清除事件监听器
    this.disposables.forEach(d => d.dispose())
    this.disposables = []

    // 清除活动文档记录
    this.activeDocuments.clear()
  }
}

export const fileWatcher = new FileWatcher()
