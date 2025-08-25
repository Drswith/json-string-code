import type { CodeBlockInfo } from './codeDetector'
import { Buffer } from 'node:buffer'
import * as vscode from 'vscode'
import jsesc from './custom.jsesc'
import { generateTempFileName } from './languageUtils'

export class CodeEditorProvider {
  private context: vscode.ExtensionContext
  private activeEditors: Map<string, {
    tempDocument: vscode.TextDocument
    originalDocument: vscode.TextDocument
    originalEditor: vscode.TextEditor
    codeInfo: CodeBlockInfo
    disposables: vscode.Disposable[]
  }> = new Map()

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  async openCodeEditor(
    codeInfo: CodeBlockInfo,
    originalDocument: vscode.TextDocument,
    originalEditor: vscode.TextEditor,
  ): Promise<void> {
    try {
      // 获取工作区根目录
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('No workspace folder found')
        return
      }

      // 创建临时文件路径
      const tmpDirUri = vscode.Uri.joinPath(workspaceFolder.uri, 'tmp')
      const timestamp = Date.now()
      const tempFileName = generateTempFileName(codeInfo.fieldName, codeInfo.language, timestamp)
      const tempFileUri = vscode.Uri.joinPath(tmpDirUri, tempFileName)

      // 确保tmp目录存在
      try {
        await vscode.workspace.fs.stat(tmpDirUri)
      }
      catch {
        await vscode.workspace.fs.createDirectory(tmpDirUri)
      }

      // 创建临时文件内容
      const codeContent = codeInfo.code || ''
      await vscode.workspace.fs.writeFile(tempFileUri, Buffer.from(codeContent, 'utf-8'))

      // 打开临时文件
      const tempDocument = await vscode.workspace.openTextDocument(tempFileUri)

      // 打开临时编辑器
      const tempEditor = await vscode.window.showTextDocument(tempDocument, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
      })

      // 设置编辑器标题
      const editorId = tempDocument.uri.toString()

      // 设置语言模式
      await vscode.languages.setTextDocumentLanguage(tempDocument, codeInfo.language)

      // 创建状态栏项
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100,
      )
      statusBarItem.text = `$(edit) Editing: ${codeInfo.fieldName} (${codeInfo.language})`
      statusBarItem.tooltip = `${codeInfo.language} code is being edited. Save or close to sync changes.`
      statusBarItem.show()

      // 不再实时同步，仅在保存和关闭时同步

      // 监听文档关闭
      const closeListener = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
        if (document === tempDocument) {
          // 在关闭时同步更改
          this.syncChangesToOriginal(tempDocument, originalDocument, originalEditor, codeInfo)
          this.cleanupEditor(editorId)
        }
      })

      // 监听编辑器关闭
      const editorCloseListener = vscode.window.onDidChangeVisibleTextEditors((editors: readonly vscode.TextEditor[]) => {
        const tempEditorStillOpen = editors.some((editor: vscode.TextEditor) => editor.document === tempDocument)
        if (!tempEditorStillOpen) {
          // 在关闭时同步更改
          this.syncChangesToOriginal(tempDocument, originalDocument, originalEditor, codeInfo)
          this.cleanupEditor(editorId)
        }
      })

      // 监听保存事件，在保存时同步到原始文件
      const saveListener = vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        if (event.document === tempDocument) {
          // 在保存时同步更改到原始JSON文件
          this.syncChangesToOriginal(tempDocument, originalDocument, originalEditor, codeInfo)
          // 显示同步成功消息
          vscode.window.showInformationMessage(
            `Changes synced to the original JSON file.`,
          )
        }
      })

      // 存储编辑器信息
      this.activeEditors.set(editorId, {
        tempDocument,
        originalDocument,
        originalEditor,
        codeInfo,
        disposables: [closeListener, editorCloseListener, saveListener, statusBarItem],
      })

      // 显示成功消息
      vscode.window.showInformationMessage(
        `Editing ${codeInfo.language} code from field "${codeInfo.fieldName}". Save or close to sync changes.`,
      )
    }
    catch (error) {
      vscode.window.showErrorMessage(`Failed to open JavaScript editor: ${error}`)
    }
  }

  private syncChangesToOriginal(
    tempDocument: vscode.TextDocument,
    originalDocument: vscode.TextDocument,
    originalEditor: vscode.TextEditor,
    codeInfo: CodeBlockInfo,
  ): void {
    try {
      const newCode = tempDocument.getText()
      const originalCode = codeInfo.code || ''

      // 检查内容是否真的发生了变化
      if (newCode === originalCode) {
        // 内容没有变化，不需要同步
        return
      }

      const escapedCode = this.escapeForJson(newCode)

      // 计算原始文档中需要替换的范围
      const originalText = originalDocument.getText()
      const beforeQuote = originalText.lastIndexOf('"', codeInfo.start - 1)
      const afterQuote = originalText.indexOf('"', codeInfo.end)

      if (beforeQuote !== -1 && afterQuote !== -1) {
        const replaceRange = new vscode.Range(
          originalDocument.positionAt(beforeQuote + 1),
          originalDocument.positionAt(afterQuote),
        )

        // 应用编辑
        const edit = new vscode.WorkspaceEdit()
        edit.replace(originalDocument.uri, replaceRange, escapedCode)

        vscode.workspace.applyEdit(edit).then((success: boolean) => {
          if (success) {
            // 同步成功后，更新存储的codeInfo以反映新的位置
            this.updateCodeInfoAfterSync(tempDocument, originalDocument, codeInfo, escapedCode)
          }
          else {
            vscode.window.showErrorMessage('Failed to sync changes to original document')
          }
        })
      }
    }
    catch (error) {
      vscode.window.showErrorMessage(`Failed to sync changes: ${error}`)
    }
  }

  private updateCodeInfoAfterSync(
    tempDocument: vscode.TextDocument,
    originalDocument: vscode.TextDocument,
    oldCodeInfo: CodeBlockInfo,
    newEscapedCode: string,
  ): void {
    try {
      // 重新计算代码在原始文档中的位置
      const originalText = originalDocument.getText()
      const fieldPattern = `"${oldCodeInfo.fieldName}"\\s*:\\s*"`
      const fieldRegex = new RegExp(fieldPattern)
      const fieldMatch = originalText.match(fieldRegex)

      if (fieldMatch) {
        const fieldIndex = originalText.indexOf(fieldMatch[0])
        const codeStartIndex = fieldIndex + fieldMatch[0].length
        const codeEndIndex = codeStartIndex + newEscapedCode.length

        // 更新存储的codeInfo
        const editorId = tempDocument.uri.toString()
        const editorInfo = this.activeEditors.get(editorId)
        if (editorInfo) {
          editorInfo.codeInfo.start = codeStartIndex
          editorInfo.codeInfo.end = codeEndIndex
          editorInfo.codeInfo.range = new vscode.Range(
            originalDocument.positionAt(codeStartIndex),
            originalDocument.positionAt(codeEndIndex),
          )
          editorInfo.codeInfo.code = tempDocument.getText()
        }
      }
    }
    catch (error) {
      console.error('Failed to update codeInfo after sync:', error)
    }
  }

  private escapeForJson(str: string): string {
    return jsesc(str, {
      json: true, // 确保输出是有效的JSON
      wrap: false, // 不包含外层引号，因为我们只替换引号内的内容
      es6: false, // 不使用ES6语法
      minimal: false, // 不使用最小转义
    })
  }

  private cleanupEditor(editorId: string): void {
    const editorInfo = this.activeEditors.get(editorId)
    if (editorInfo) {
      // 清理所有监听器
      editorInfo.disposables.forEach(disposable => disposable.dispose())

      // 删除临时文件
      if (editorInfo.tempDocument.uri.scheme === 'file') {
        vscode.workspace.fs.delete(editorInfo.tempDocument.uri, { useTrash: false }).then(
          () => {},
          (error: any) => {
            console.error('Failed to delete temp file:', error)
          },
        )
      }

      // 从映射中移除
      this.activeEditors.delete(editorId)

      vscode.window.showInformationMessage('Code editor closed. Changes have been synced.')
    }
  }

  dispose(): void {
    // 清理所有活动编辑器
    for (const [editorId] of this.activeEditors) {
      this.cleanupEditor(editorId)
    }
  }
}