import type { TextDocument } from 'vscode'
import type { CodeSnippet } from './json-parser'
import jsesc from 'jsesc'
import * as jsonc from 'jsonc-parser'
import { useDisposable } from 'reactive-vscode'
import { languages, Position, Range, TabInputText, Uri, ViewColumn, window, workspace, WorkspaceEdit } from 'vscode'

import { config } from './config'
import { logger } from './utils'

export interface TempFileInfo {
  tempUri: Uri
  originalDocument: TextDocument
  snippet: CodeSnippet
  language: string
}

// 临时文件映射
const tempFiles = new Map<string, TempFileInfo>()

// 获取临时目录
function getTempDir(): string {
  // 使用VSCode的全局存储路径作为临时目录
  const workspaceFolder = workspace.workspaceFolders?.[0]
  if (workspaceFolder) {
    return Uri.joinPath(workspaceFolder.uri, '.vscode', 'temp', 'json-string-editor').fsPath
  }
  // 如果没有工作区，使用一个相对路径作为临时目录
  // 这将在当前工作目录下创建临时文件夹
  return Uri.file('./tmp/vscode-json-string-code-editor').fsPath
}

/**
 * 设置临时文件管理器
 */
export async function setupTempFileManager(): Promise<void> {
  try {
    await ensureTempDir()
    setupFileWatcher()
    if (config.enableLogging) {
      logger.info('Temp file manager initialized successfully')
    }
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Failed to setup temp file manager: ${error}`)
    }
    // 不抛出错误，允许扩展继续运行但禁用临时文件功能
    window.showWarningMessage('Temporary file editing feature is disabled due to initialization error')
  }
}

/**
 * 确保临时目录存在
 */
async function ensureTempDir(): Promise<void> {
  try {
    const tempDir = getTempDir()
    const tempDirUri = Uri.file(tempDir)

    // 使用VSCode的workspace API创建目录
    try {
      await workspace.fs.stat(tempDirUri)
    }
    catch {
      // 目录不存在，创建它
      await workspace.fs.createDirectory(tempDirUri)
    }
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Failed to create temp directory: ${error}`)
    }
  }
}

/**
 * 设置文件监听器
 */
function setupFileWatcher(): void {
  // Listen for temporary file save events
  useDisposable(
    workspace.onDidSaveTextDocument(async (document) => {
      const tempInfo = getTempFileInfo(document.uri)
      if (tempInfo) {
        await syncTempFileToOriginal(tempInfo)
      }
    }),
  )

  // Listen for temporary file close events
  useDisposable(
    workspace.onDidCloseTextDocument((document) => {
      const tempInfo = getTempFileInfo(document.uri)
      if (tempInfo) {
        cleanupTempFile(document.uri)
      }
    }),
  )
}

/**
 * Detect code language type
 */
function detectLanguage(key: string, value: string): string {
  // Infer language based on key name
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

  // Default to configured default language
  return config.defaultLanguage || 'javascript'
}

/**
 * Create temporary file and open editor
 */
export async function createTempFile(snippet: CodeSnippet, originalDocument: TextDocument): Promise<any | undefined> {
  try {
    const language = detectLanguage(snippet.key, snippet.value)
    const extension = getFileExtension(language)
    const fileName = `${snippet.key.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}${extension}`
    const tempDir = getTempDir()
    const tempUri = Uri.joinPath(Uri.file(tempDir), fileName)

    // Write to temporary file using VSCode API
    const content = new TextEncoder().encode(snippet.value)
    await workspace.fs.writeFile(tempUri, content)

    // Store temporary file information
    const tempInfo: TempFileInfo = {
      tempUri,
      originalDocument,
      snippet,
      language,
    }
    tempFiles.set(tempUri.toString(), tempInfo)

    // Open temporary file
    const document = await workspace.openTextDocument(tempUri)
    const editor = await window.showTextDocument(document, {
      preview: false,
      viewColumn: ViewColumn.Beside,
    })

    // Set language mode
    await languages.setTextDocumentLanguage(document, language)

    if (config.enableLogging) {
      logger.info(`Created temp file: ${tempUri.fsPath} for key: ${snippet.key}`)
    }

    return editor
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Failed to create temp file: ${error}`)
    }
    window.showErrorMessage(`Failed to create temporary file: ${String(error)}`)
    return undefined
  }
}

/**
 * Get file extension
 */
function getFileExtension(language: string): string {
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
 * Sync temporary file content to original JSON file
 */
async function syncTempFileToOriginal(tempInfo: TempFileInfo): Promise<void> {
  try {
    const tempDocument = await workspace.openTextDocument(tempInfo.tempUri)
    const newContent = tempDocument.getText()

    // Get the latest version of original document
    const originalDocument = await workspace.openTextDocument(tempInfo.originalDocument.uri)
    const edit = new WorkspaceEdit()

    // Re-parse JSON to get latest valueRange, avoid using stale ranges
    const currentContent = originalDocument.getText()
    const updatedSnippet = findCodeSnippetByKey(currentContent, tempInfo.snippet.key)

    if (!updatedSnippet) {
      throw new Error(`Key "${tempInfo.snippet.key}" not found in current document`)
    }

    // Detect original value type to decide how to handle
    const tree = jsonc.parseTree(currentContent)
    let originalValueType = 'string' // Default to string
    let valueRange: Range
    let replacementContent: string

    if (tree) {
      // Find corresponding value node to determine type
      function findValueNode(node: jsonc.Node): jsonc.Node | null {
        if (node.type === 'object' && node.children) {
          for (const child of node.children) {
            if (child.type === 'property' && child.children && child.children.length === 2) {
              const keyNode = child.children[0]
              const valueNode = child.children[1]
              if (keyNode.type === 'string' && keyNode.value === tempInfo.snippet.key) {
                return valueNode
              }
            }
            // Recursive search
            if (child.children && child.children[1] && (child.children[1].type === 'object' || child.children[1].type === 'array')) {
              const result = findValueNode(child.children[1])
              if (result)
                return result
            }
          }
        }
        return null
      }

      const valueNode = findValueNode(tree)
      if (valueNode) {
        originalValueType = valueNode.type
      }
    }

    // Decide how to handle replacement based on original value type
    if (originalValueType === 'string') {
      // String value: skip quotes, only replace content
      const startPos = originalDocument.offsetAt(updatedSnippet.valueRange.start) + 1 // Skip start quote
      const endPos = originalDocument.offsetAt(updatedSnippet.valueRange.end) - 1 // Skip end quote
      valueRange = new Range(
        originalDocument.positionAt(startPos),
        originalDocument.positionAt(endPos),
      )
      // Use specialized escape method to properly escape content
      replacementContent = escapeJsonString(newContent)
    }
    else {
      // Non-string value: replace entire value, need to decide new type based on content
      valueRange = updatedSnippet.valueRange

      // Try to parse new content as appropriate JSON value
      const trimmedContent = newContent.trim()
      if (trimmedContent === 'true' || trimmedContent === 'false') {
        // Boolean value
        replacementContent = trimmedContent
      }
      else if (trimmedContent === 'null') {
        // null value
        replacementContent = 'null'
      }
      else if (/^-?\d+(?:\.\d+)?$/.test(trimmedContent)) {
        // Number
        replacementContent = trimmedContent
      }
      else {
        // Other cases, treat as string
        replacementContent = `"${escapeJsonString(newContent)}"`
      }
    }

    edit.replace(originalDocument.uri, valueRange, replacementContent)

    const success = await workspace.applyEdit(edit)
    if (success) {
      // Auto save original document
      await originalDocument.save()

      // If configured to auto close temp tab, close temporary file
      if (config.autoCloseTempTab) {
        await closeTempFile(tempInfo.tempUri)
      }

      if (config.enableLogging) {
        logger.info(`Synced temp file content to original document for key: ${tempInfo.snippet.key}`)
      }
      window.showInformationMessage('Changes synced to original file')
    }
    else {
      window.showErrorMessage(`Failed to sync changes: ${tempInfo.snippet.key}`)
    }
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Failed to sync temp file: ${error}`)
    }
    window.showErrorMessage(`Failed to sync changes: ${String(error)}`)
  }
}

/**
 * Escape JSON string
 * Use jsesc library for more reliable JSON string escaping
 */
function escapeJsonString(str: string): string {
  return jsesc(str.toString(), {
    json: true, // Ensure output is valid JSON
    wrap: false, // Don't include outer quotes, as we only replace content within quotes
  })
}

/**
 * Find code snippet with specified key in JSON content
 */
function findCodeSnippetByKey(content: string, targetKey: string): CodeSnippet | null {
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

            // Support all types of key-value pairs, not just strings
            if (keyNode.type === 'string') {
              const key = keyNode.value as string
              let value: string

              // Handle differently based on value type
              if (valueNode.type === 'string') {
                value = valueNode.value as string
              }
              else if (valueNode.type === 'number') {
                value = String(valueNode.value)
              }
              else if (valueNode.type === 'boolean') {
                value = String(valueNode.value)
              }
              else if (valueNode.type === 'null') {
                value = 'null'
              }
              else {
                // For complex types like objects and arrays, use original text
                const startOffset = valueNode.offset
                const endOffset = valueNode.offset + valueNode.length
                value = content.substring(startOffset, endOffset)
              }

              if (key === targetKey) {
                // Create a temporary document to calculate positions
                const lines = content.split('\n')
                const positionAt = (offset: number): Position => {
                  let currentOffset = 0
                  for (let line = 0; line < lines.length; line++) {
                    const lineLength = lines[line].length
                    if (currentOffset + lineLength >= offset) {
                      return new Position(line, offset - currentOffset)
                    }
                    currentOffset += lineLength + 1 // +1 for newline
                  }
                  return new Position(lines.length - 1, lines[lines.length - 1].length)
                }

                const keyRange = new Range(
                  positionAt(keyNode.offset),
                  positionAt(keyNode.offset + keyNode.length),
                )

                const valueRange = new Range(
                  positionAt(valueNode.offset),
                  positionAt(valueNode.offset + valueNode.length),
                )

                const range = new Range(
                  keyRange.start,
                  valueRange.end,
                )

                return {
                  key,
                  value,
                  range,
                  keyRange,
                  valueRange,
                  isForced: false, // Simplified handling here
                }
              }
            }

            // Recursively search nested objects and arrays
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
 * Get temporary file information
 */
function getTempFileInfo(uri: Uri): TempFileInfo | undefined {
  return tempFiles.get(uri.toString())
}

/**
 * Close temporary file tab
 */
async function closeTempFile(uri: Uri): Promise<void> {
  try {
    // Find and close corresponding editor tab
    const tabs = window.tabGroups.all.flatMap(group => group.tabs)
    const tempTab = tabs.find(tab =>
      tab.input instanceof TabInputText
      && tab.input.uri.fsPath === uri.fsPath,
    )

    if (tempTab) {
      await window.tabGroups.close(tempTab)
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
 * Clean up temporary files
 */
async function cleanupTempFile(uri: Uri): Promise<void> {
  try {
    const tempInfo = tempFiles.get(uri.toString())
    if (tempInfo) {
      tempFiles.delete(uri.toString())

      // 使用VSCode API删除文件
      try {
        await workspace.fs.delete(tempInfo.tempUri)
      }
      catch {
        // 忽略删除错误，文件可能已经不存在
      }

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
 * Get current temporary file count
 */
export function getTempFileCount(): number {
  return tempFiles.size
}

/**
 * Clean up all temporary files
 */
export async function dispose(): Promise<void> {
  // Clean up all temporary files
  for (const [, tempInfo] of tempFiles) {
    try {
      await workspace.fs.delete(tempInfo.tempUri)
    }
    catch (error) {
      // Ignore deletion errors
    }
  }
  tempFiles.clear()

  // Clean up temporary directory
  try {
    const tempDir = getTempDir()
    const tempDirUri = Uri.file(tempDir)
    await workspace.fs.delete(tempDirUri, { recursive: true })
  }
  catch (error) {
    // Ignore deletion errors
  }
}

/**
 * 导出临时文件管理器对象
 */
export const tempFileManager = {
  setupTempFileManager,
  createTempFile,
  getTempFileCount,
  dispose,
}
