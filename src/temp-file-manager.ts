import type { CodeSnippet } from './json-parser'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import jsesc from 'jsesc'
import * as jsonc from 'jsonc-parser'
import * as vscode from 'vscode'
import { config } from './config'
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
    this.tempDir = path.join(os.tmpdir(), 'vscode-json-string-code-editor')
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
    // Listen for temporary file save events
    const saveDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
      const tempInfo = this.getTempFileInfo(document.uri)
      if (tempInfo) {
        await this.syncTempFileToOriginal(tempInfo)
      }
    })

    // Listen for temporary file close events
    const closeDisposable = vscode.workspace.onDidCloseTextDocument((document) => {
      const tempInfo = this.getTempFileInfo(document.uri)
      if (tempInfo) {
        this.cleanupTempFile(document.uri)
      }
    })

    this.disposables.push(saveDisposable, closeDisposable)
  }

  /**
   * Detect code language type
   */
  private detectLanguage(key: string, value: string): string {
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
  async createTempFile(snippet: CodeSnippet, originalDocument: vscode.TextDocument): Promise<vscode.TextEditor | undefined> {
    try {
      const language = this.detectLanguage(snippet.key, snippet.value)
      const extension = this.getFileExtension(language)
      const fileName = `${snippet.key.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}${extension}`
      const tempFilePath = path.join(this.tempDir, fileName)
      const tempUri = vscode.Uri.file(tempFilePath)

      // Write to temporary file
      await fs.writeFile(tempFilePath, snippet.value, 'utf8')

      // Store temporary file information
      const tempInfo: TempFileInfo = {
        tempUri,
        originalDocument,
        snippet,
        language,
      }
      this.tempFiles.set(tempUri.toString(), tempInfo)

      // Open temporary file
      const document = await vscode.workspace.openTextDocument(tempUri)
      const editor = await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      })

      // Set language mode
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
      vscode.window.showErrorMessage(`Failed to create temporary file: ${String(error)}`)
      return undefined
    }
  }

  /**
   * Get file extension
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
   * Sync temporary file content to original JSON file
   */
  private async syncTempFileToOriginal(tempInfo: TempFileInfo): Promise<void> {
    try {
      const tempDocument = await vscode.workspace.openTextDocument(tempInfo.tempUri)
      const newContent = tempDocument.getText()

      // Get the latest version of original document
      const originalDocument = await vscode.workspace.openTextDocument(tempInfo.originalDocument.uri)
      const edit = new vscode.WorkspaceEdit()

      // Re-parse JSON to get latest valueRange, avoid using stale ranges
      const currentContent = originalDocument.getText()
      const updatedSnippet = this.findCodeSnippetByKey(currentContent, tempInfo.snippet.key)

      if (!updatedSnippet) {
        throw new Error(`Key "${tempInfo.snippet.key}" not found in current document`)
      }

      // Detect original value type to decide how to handle
      const tree = jsonc.parseTree(currentContent)
      let originalValueType = 'string' // Default to string
      let valueRange: vscode.Range
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
        valueRange = new vscode.Range(
          originalDocument.positionAt(startPos),
          originalDocument.positionAt(endPos),
        )
        // Use specialized escape method to properly escape content
        replacementContent = this.escapeJsonString(newContent)
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
          replacementContent = `"${this.escapeJsonString(newContent)}"`
        }
      }

      edit.replace(originalDocument.uri, valueRange, replacementContent)

      const success = await vscode.workspace.applyEdit(edit)
      if (success) {
        // Auto save original document
        await originalDocument.save()

        // If configured to auto close temp tab, close temporary file
        if (config.autoCloseTempTab) {
          await this.closeTempFile(tempInfo.tempUri)
        }

        if (config.enableLogging) {
          logger.info(`Synced temp file content to original document for key: ${tempInfo.snippet.key}`)
        }
        vscode.window.showInformationMessage('Changes synced to original file')
      }
      else {
        vscode.window.showErrorMessage(`Failed to sync changes: ${tempInfo.snippet.key}`)
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to sync temp file: ${error}`)
      }
      vscode.window.showErrorMessage(`Failed to sync changes: ${String(error)}`)
    }
  }

  /**
   * Escape JSON string
   * Use jsesc library for more reliable JSON string escaping
   */
  private escapeJsonString(str: string): string {
    return jsesc(str.toString(), {
      json: true, // Ensure output is valid JSON
      wrap: false, // Don't include outer quotes, as we only replace content within quotes
    })
  }

  /**
   * Find code snippet with specified key in JSON content
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
  private getTempFileInfo(uri: vscode.Uri): TempFileInfo | undefined {
    return this.tempFiles.get(uri.toString())
  }

  /**
   * Close temporary file tab
   */
  private async closeTempFile(uri: vscode.Uri): Promise<void> {
    try {
      // Find and close corresponding editor tab
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
   * Clean up temporary files
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
   * Get current temporary file count
   */
  getTempFileCount(): number {
    return this.tempFiles.size
  }

  /**
   * Clean up all temporary files
   */
  async dispose(): Promise<void> {
    // Clean up all temporary files
    for (const [, tempInfo] of this.tempFiles) {
      try {
        await fs.unlink(tempInfo.tempUri.fsPath)
      }
      catch (error) {
        // Ignore deletion errors
      }
    }
    this.tempFiles.clear()

    // Clean up event listeners
    this.disposables.forEach(d => d.dispose())
    this.disposables = []

    // Clean up temporary directory
    try {
      await fs.rmdir(this.tempDir)
    }
    catch (error) {
      // Ignore deletion errors
    }
  }
}

export const tempFileManager = new TempFileManager()
