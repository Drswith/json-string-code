import type { JavaScriptInfo } from './jsonJsDetector'
import * as vscode from 'vscode'

export class JavaScriptEditorProvider {
  private context: vscode.ExtensionContext
  private activeEditors: Map<string, {
    tempDocument: vscode.TextDocument
    originalDocument: vscode.TextDocument
    originalEditor: vscode.TextEditor
    jsInfo: JavaScriptInfo
    disposables: vscode.Disposable[]
  }> = new Map()

  constructor(context: vscode.ExtensionContext) {
    this.context = context
  }

  async openJavaScriptEditor(
    jsInfo: JavaScriptInfo,
    originalDocument: vscode.TextDocument,
    originalEditor: vscode.TextEditor,
  ): Promise<void> {
    try {
      // 创建临时文件
      const tempUri = vscode.Uri.parse(`untitled:temp-js-${Date.now()}.js`)
      const tempDocument = await vscode.workspace.openTextDocument({
        language: 'javascript',
        content: jsInfo.code,
      })

      // 打开临时编辑器
      const tempEditor = await vscode.window.showTextDocument(tempDocument, {
        viewColumn: vscode.ViewColumn.Beside,
        preview: false,
      })

      // 设置编辑器标题
      const editorId = tempDocument.uri.toString()

      // 创建状态栏项
      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
        100,
      )
      statusBarItem.text = `$(sync) Editing: ${jsInfo.fieldName}`
      statusBarItem.tooltip = 'JavaScript code is being edited. Changes will sync automatically.'
      statusBarItem.show()

      // 监听文档变化以实现实时同步
      const changeListener = vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
        if (event.document === tempDocument) {
          this.syncChangesToOriginal(tempDocument, originalDocument, originalEditor, jsInfo)
        }
      })

      // 监听文档关闭
      const closeListener = vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
        if (document === tempDocument) {
          this.cleanupEditor(editorId)
        }
      })

      // 监听编辑器关闭
      const editorCloseListener = vscode.window.onDidChangeVisibleTextEditors((editors: readonly vscode.TextEditor[]) => {
        const tempEditorStillOpen = editors.some((editor: vscode.TextEditor) => editor.document === tempDocument)
        if (!tempEditorStillOpen) {
          this.cleanupEditor(editorId)
        }
      })

      // 监听保存事件，拦截临时文件的保存操作
      const saveListener = vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        if (event.document === tempDocument) {
          // 阻止默认保存行为
          event.waitUntil(Promise.resolve([]))
          // 显示提示消息
          vscode.window.showInformationMessage(
            `Changes are automatically synced to the original JSON file. No manual save needed for temporary JavaScript editor.`,
            'Got it',
          )
        }
      })

      // 存储编辑器信息
      this.activeEditors.set(editorId, {
        tempDocument,
        originalDocument,
        originalEditor,
        jsInfo,
        disposables: [changeListener, closeListener, editorCloseListener, saveListener, statusBarItem],
      })

      // 显示成功消息
      vscode.window.showInformationMessage(
        `Editing JavaScript code from field "${jsInfo.fieldName}". Changes will sync automatically.`,
        'Got it',
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
    jsInfo: JavaScriptInfo,
  ): void {
    try {
      const newCode = tempDocument.getText()
      const escapedCode = this.escapeForJson(newCode)

      // 计算原始文档中需要替换的范围
      const originalText = originalDocument.getText()
      const beforeQuote = originalText.lastIndexOf('"', jsInfo.start - 1)
      const afterQuote = originalText.indexOf('"', jsInfo.end)

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
            // 同步成功后，更新存储的jsInfo以反映新的位置
            this.updateJsInfoAfterSync(tempDocument, originalDocument, jsInfo, escapedCode)
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

  private updateJsInfoAfterSync(
    tempDocument: vscode.TextDocument,
    originalDocument: vscode.TextDocument,
    oldJsInfo: JavaScriptInfo,
    newEscapedCode: string,
  ): void {
    try {
      // 重新计算JavaScript代码在原始文档中的位置
      const originalText = originalDocument.getText()
      const fieldPattern = `"${oldJsInfo.fieldName}"\\s*:\\s*"`
      const fieldRegex = new RegExp(fieldPattern)
      const fieldMatch = originalText.match(fieldRegex)

      if (fieldMatch) {
        const fieldIndex = originalText.indexOf(fieldMatch[0])
        const codeStartIndex = fieldIndex + fieldMatch[0].length
        const codeEndIndex = codeStartIndex + newEscapedCode.length

        // 更新存储的jsInfo
        const editorId = tempDocument.uri.toString()
        const editorInfo = this.activeEditors.get(editorId)
        if (editorInfo) {
          editorInfo.jsInfo.start = codeStartIndex
          editorInfo.jsInfo.end = codeEndIndex
          editorInfo.jsInfo.range = new vscode.Range(
            originalDocument.positionAt(codeStartIndex),
            originalDocument.positionAt(codeEndIndex),
          )
          editorInfo.jsInfo.code = tempDocument.getText()
        }
      }
    }
    catch (error) {
      console.error('Failed to update jsInfo after sync:', error)
    }
  }

  private escapeForJson(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  }

  private cleanupEditor(editorId: string): void {
    const editorInfo = this.activeEditors.get(editorId)
    if (editorInfo) {
      // 清理所有监听器
      editorInfo.disposables.forEach(disposable => disposable.dispose())

      // 从映射中移除
      this.activeEditors.delete(editorId)

      vscode.window.showInformationMessage('JavaScript editor closed. Changes have been synced.')
    }
  }

  dispose(): void {
    // 清理所有活动编辑器
    for (const [editorId] of this.activeEditors) {
      this.cleanupEditor(editorId)
    }
  }
}