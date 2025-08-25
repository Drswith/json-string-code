import * as vscode from 'vscode'
import { DecorationProvider } from './decorationProvider'
import { JavaScriptEditorProvider } from './javascriptEditorProvider'
import { JsonJsDetector } from './jsonJsDetector'

export function activate(context: vscode.ExtensionContext) {
  // 创建输出通道
  const outputChannel = vscode.window.createOutputChannel('JSON JavaScript Editor')
  outputChannel.show()
  outputChannel.appendLine('JSON JavaScript Editor extension is now active!')

  const detector = new JsonJsDetector()
  detector.updateConfiguration() // 初始化配置

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('jsonJsEditor')) {
      detector.updateConfiguration()
    }
  })

  const editorProvider = new JavaScriptEditorProvider(context)
  const decorationProvider = new DecorationProvider(detector)

  // 注册命令：编辑JavaScript代码
  const editJavaScriptCommand = vscode.commands.registerCommand(
    'jsonJsEditor.editJavaScript',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found')
        return
      }

      const document = editor.document
      const selection = editor.selection
      const position = selection.active

      // 检测当前位置是否包含JavaScript代码
      const jsInfo = detector.detectJavaScriptAtPosition(document, position)
      if (!jsInfo) {
        vscode.window.showInformationMessage('No JavaScript code detected at current position')
        return
      }

      // 打开临时编辑器
      await editorProvider.openJavaScriptEditor(jsInfo, document, editor)
    },
  )

  // 注册代码镜头提供器
  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    ['json', 'jsonc'],
    {
      provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = []
        const jsBlocks = detector.detectAllJavaScriptBlocks(document)

        for (const block of jsBlocks) {
          const range = new vscode.Range(
            document.positionAt(block.start),
            document.positionAt(block.end),
          )

          const codeLens = new vscode.CodeLens(range, {
            title: '✏️ Edit JavaScript',
            command: 'jsonJsEditor.editJavaScriptAtRange',
            arguments: [block],
          })

          codeLenses.push(codeLens)
        }

        return codeLenses
      },
    },
  )

  // 注册范围编辑命令
  const editJavaScriptAtRangeCommand = vscode.commands.registerCommand(
    'jsonJsEditor.editJavaScriptAtRange',
    async (jsInfo: any) => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      await editorProvider.openJavaScriptEditor(jsInfo, editor.document, editor)
    },
  )

  // 注册悬停提供器
  const hoverProvider = vscode.languages.registerHoverProvider(
    ['json', 'jsonc'],
    {
      provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
        const jsInfo = detector.detectJavaScriptAtPosition(document, position)
        if (!jsInfo) {
          return undefined
        }

        const hoverText = new vscode.MarkdownString()
        hoverText.appendMarkdown('**JavaScript Code Detected**\n\n')
        hoverText.appendCodeblock(jsInfo.code, 'javascript')
        hoverText.appendMarkdown('\n\n[Edit in temporary editor](command:jsonJsEditor.editJavaScript)')
        hoverText.isTrusted = true

        return new vscode.Hover(hoverText)
      },
    },
  )

  // 注册点击处理器
  const clickHandler = vscode.window.onDidChangeTextEditorSelection(async (event) => {
    const editor = event.textEditor
    if (!editor || (editor.document.languageId !== 'json' && editor.document.languageId !== 'jsonc')) {
      return
    }

    // 检查是否点击了JavaScript代码
    const selection = event.selections[0]
    if (selection && selection.isEmpty) {
      const position = selection.active
      const jsInfo = detector.detectJavaScriptAtPosition(editor.document, position)

      if (jsInfo) {
        // 检查是否是单击（而不是拖拽选择）
        const timeSinceLastClick = Date.now() - (clickHandler as any).lastClickTime || 0
        if (timeSinceLastClick > 100) { // 防止重复触发
          (clickHandler as any).lastClickTime = Date.now()
          await editorProvider.openJavaScriptEditor(jsInfo, editor.document, editor)
        }
      }
    }
  })

  context.subscriptions.push(
    editJavaScriptCommand,
    editJavaScriptAtRangeCommand,
    codeLensProvider,
    hoverProvider,
    outputChannel,
    decorationProvider,
    clickHandler,
    configChangeListener,
  )
}

export function deactivate() {
  // Extension deactivated
}