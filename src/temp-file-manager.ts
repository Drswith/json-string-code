import type { CodeSnippet } from './json-parser'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import jsesc from 'jsesc'
import * as jsonc from 'jsonc-parser'
import * as vscode from 'vscode'
import { config } from './config'
import { i18n } from './i18n'
import { logger } from './utils'

export interface TempFileInfo {
  tempUri: vscode.Uri
  originalDocument: vscode.TextDocument
  snippet: CodeSnippet
  language: string
}

class TempFileManager {
  private tempFiles = new Map<string, TempFileInfo>()
  private tempDir: string
  private disposables: vscode.Disposable[] = []

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'json-string-code')
    this.ensureTempDir()
    this.setupFileWatcher()
  }

  private async ensureTempDir(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true })
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to create temp directory: ${error}`)
      }
    }
  }

  private setupFileWatcher(): void {
    // 监听临时文件的保存事件
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
      const tempInfo = this.getTempFileInfo(document.uri)
      if (tempInfo) {
        await this.syncTempFileToOriginal(tempInfo)
      }
    })

    // 监听临时文件的关闭事件
    const closeDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
      const tempInfo = this.getTempFileInfo(document.uri)
      if (tempInfo) {
        this.cleanupTempFile(document.uri)
      }
    })

    this.disposables.push(saveDisposable, closeDisposable)
  }

  /**
   * 检测代码语言类型
   */
  private detectLanguage(key: string, value: string): string {
    // 根据键名推断语言
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

    // 默认使用配置中的默认语言
    return config.defaultLanguage || 'javascript'
  }

  /**
   * 创建临时文件并打开编辑器
   */
  async createTempFile(snippet: CodeSnippet, originalDocument: vscode.TextDocument): Promise<vscode.TextEditor | undefined> {
    try {
      const language = this.detectLanguage(snippet.key, snippet.value)
      const extension = this.getFileExtension(language)
      const fileName = `${snippet.key.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}${extension}`
      const tempFilePath = path.join(this.tempDir, fileName)
      const tempUri = vscode.Uri.file(tempFilePath)

      // 写入临时文件
      await fs.writeFile(tempFilePath, snippet.value, 'utf8')

      // 存储临时文件信息
      const tempInfo: TempFileInfo = {
        tempUri,
        originalDocument,
        snippet,
        language,
      }
      this.tempFiles.set(tempUri.toString(), tempInfo)

      // 打开临时文件
      const document = await vscode.workspace.openTextDocument(tempUri)
      const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      })

      // 设置语言模式
      await vscode.languages.setTextDocumentLanguage(document, language)

      if (config.enableLogging) {
        logger.info(`Created temp file: ${tempFilePath} for key: ${snippet.key}`)
      }

      return editor
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to create temp file: ${error}`)
      }
      vscode.window.showErrorMessage(i18n.t('notification.failedToCreate', String(error)))
      return undefined
    }
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      javascript: '.js',
      typescript: '.ts',
      python: '.py',
      sql: '.sql',
      html: '.html',
      css: '.css',
      xml: '.xml',
      yaml: '.yaml',
      markdown: '.md',
      json: '.json',
    }
    return extensions[language] || '.txt'
  }

  /**
   * 同步临时文件内容到原始JSON文件
   */
  private async syncTempFileToOriginal(tempInfo: TempFileInfo): Promise<void> {
    try {
      const tempDocument = await vscode.workspace.openTextDocument(tempInfo.tempUri)
      const newContent = tempDocument.getText()

      // 获取原始文档的最新版本
      const originalDocument = await vscode.workspace.openTextDocument(tempInfo.originalDocument.uri)
      const edit = new vscode.WorkspaceEdit()

      // 重新解析JSON以获取最新的valueRange，避免使用过期的范围
      const currentContent = originalDocument.getText()
      const updatedSnippet = this.findCodeSnippetByKey(currentContent, tempInfo.snippet.key)

      if (!updatedSnippet) {
        throw new Error(`Key "${tempInfo.snippet.key}" not found in current document`)
      }

      // 替换原始文档中的字符串值（保留引号）
      // valueRange已经包含了完整的字符串值位置，我们需要跳过引号
      const startPos = originalDocument.offsetAt(updatedSnippet.valueRange.start) + 1 // 跳过开始引号
      const endPos = originalDocument.offsetAt(updatedSnippet.valueRange.end) - 1 // 跳过结束引号
      const valueRange = new vscode.Range(
        originalDocument.positionAt(startPos),
        originalDocument.positionAt(endPos),
      )

      // 使用专门的转义方法来正确转义内容
      const escapedContent = this.escapeJsonString(newContent)
      edit.replace(originalDocument.uri, valueRange, escapedContent)

      const success = await vscode.workspace.applyEdit(edit)
      if (success) {
        // 自动保存原始文档
        await originalDocument.save()

        // 如果配置了自动关闭临时tab，则关闭临时文件
        if (config.autoCloseTempTab) {
          await this.closeTempFile(tempInfo.tempUri)
        }

        if (config.enableLogging) {
          logger.info(`Synced temp file content to original document for key: ${tempInfo.snippet.key}`)
        }
        vscode.window.showInformationMessage(i18n.t('notification.changesSynced'))
      }
      else {
        vscode.window.showErrorMessage(i18n.t('notification.syncFailed', tempInfo.snippet.key))
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to sync temp file: ${error}`)
      }
      vscode.window.showErrorMessage(i18n.t('notification.syncFailed', String(error)))
    }
  }

  /**
   * 转义JSON字符串
   * 使用jsesc库提供更可靠的JSON字符串转义
   */
  private escapeJsonString(str: string): string {
    return jsesc(str.toString(), {
      json: true, // 确保输出是有效的JSON
      wrap: false, // 不包含外层引号，因为我们只替换引号内的内容
    })
  }

  /**
   * 在JSON内容中查找指定键的代码片段
   */
  private findCodeSnippetByKey(content: string, targetKey: string): CodeSnippet | null {
    try {
      const tree = jsonc.parseTree(content)
      if (!tree)
        return null

      function visitNode(node: jsonc.Node): CodeSnippet | null {
        if (node.type === 'object' && node.children) {
          for (const child of node.children) {
            if (child.type === 'property' && child.children && child.children.length === 2) {
              const keyNode = child.children[0]
              const valueNode = child.children[1]

              if (keyNode.type === 'string' && valueNode.type === 'string') {
                const key = keyNode.value as string
                const value = valueNode.value as string

                if (key === targetKey) {
                  // 创建一个临时文档来计算位置
                  const lines = content.split('\n')
                  const positionAt = (offset: number): vscode.Position => {
                    let currentOffset = 0
                    for (let line = 0; line < lines.length; line++) {
                      const lineLength = lines[line].length
                      if (currentOffset + lineLength >= offset) {
                        return new vscode.Position(line, offset - currentOffset)
                      }
                      currentOffset += lineLength + 1 // +1 for newline
                    }
                    return new vscode.Position(lines.length - 1, lines[lines.length - 1].length)
                  }

                  const keyRange = new vscode.Range(
                    positionAt(keyNode.offset),
                    positionAt(keyNode.offset + keyNode.length),
                  )

                  const valueRange = new vscode.Range(
                    positionAt(valueNode.offset),
                    positionAt(valueNode.offset + valueNode.length),
                  )

                  const range = new vscode.Range(
                    keyRange.start,
                    valueRange.end,
                  )

                  return {
                    key,
                    value,
                    range,
                    keyRange,
                    valueRange,
                    isForced: false, // 这里简化处理
                  }
                }
              }

              // 递归搜索嵌套对象和数组
              if (valueNode.type === 'object' || valueNode.type === 'array') {
                const result = visitNode(valueNode)
                if (result)
                  return result
              }
            }
          }
        }
        return null
      }

      return visitNode(tree)
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to find code snippet by key: ${error}`)
      }
      return null
    }
  }

  /**
   * 获取临时文件信息
   */
  private getTempFileInfo(uri: vscode.Uri): TempFileInfo | undefined {
    return this.tempFiles.get(uri.toString())
  }

  /**
   * 关闭临时文件tab
   */
  private async closeTempFile(uri: vscode.Uri): Promise<void> {
    try {
      // 查找并关闭对应的编辑器tab
      const tabs = vscode.window.tabGroups.all.flatMap(group => group.tabs)
      const tempTab = tabs.find(tab =>
        tab.input instanceof vscode.TabInputText
        && tab.input.uri.fsPath === uri.fsPath,
      )

      if (tempTab) {
        await vscode.window.tabGroups.close(tempTab)
        if (config.enableLogging) {
          logger.info(`Closed temp file tab: ${uri.fsPath}`)
        }
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to close temp file tab: ${error}`)
      }
    }
  }

  /**
   * 清理临时文件
   */
  private async cleanupTempFile(uri: vscode.Uri): Promise<void> {
    try {
      const tempInfo = this.tempFiles.get(uri.toString())
      if (tempInfo) {
        this.tempFiles.delete(uri.toString())
        await fs.unlink(tempInfo.tempUri.fsPath)

        if (config.enableLogging) {
          logger.info(`Cleaned up temp file: ${tempInfo.tempUri.fsPath}`)
        }
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to cleanup temp file: ${error}`)
      }
    }
  }

  /**
   * 获取当前临时文件数量
   */
  getTempFileCount(): number {
    return this.tempFiles.size
  }

  /**
   * 清理所有临时文件
   */
  async dispose(): Promise<void> {
    // 清理所有临时文件
    for (const [, tempInfo] of this.tempFiles) {
      try {
        await fs.unlink(tempInfo.tempUri.fsPath)
      }
      catch (error) {
        // 忽略删除错误
      }
    }
    this.tempFiles.clear()

    // 清理事件监听器
    this.disposables.forEach(d => d.dispose())
    this.disposables = []

    // 清理临时目录
    try {
      await fs.rmdir(this.tempDir)
    }
    catch (error) {
      // 忽略删除错误
    }
  }
}

export const tempFileManager = new TempFileManager()
