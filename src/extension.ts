import * as vscode from 'vscode'
import { CodeDetector } from './codeDetector'
import { CodeEditorProvider } from './codeEditorProvider'
import { DecorationProvider } from './decorationProvider'
import { logger } from './logger'

export function activate(context: vscode.ExtensionContext) {
  logger.info('JSON String Code Editor extension is now active!')

  const detector = new CodeDetector()
  detector.updateConfiguration() // 初始化配置

  // 监听配置变化
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('vscode-json-string-code-editor')) {
      detector.updateConfiguration()
      logger.onConfigurationChanged()
    }
  })

  const editorProvider = new CodeEditorProvider(context)
  const decorationProvider = new DecorationProvider(detector)

  // 注册命令：编辑代码
  const editCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editCode',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        logger.error('No active editor found')
        return
      }

      const document = editor.document
      const selection = editor.selection
      const position = selection.active

      // 检测当前位置是否包含代码
      const codeInfo = detector.detectCodeAtPosition(document, position)
      if (!codeInfo) {
        logger.info('No code detected at current position')
        return
      }

      // 打开临时编辑器
      await editorProvider.openCodeEditor(codeInfo, document, editor)
    },
  )

  // 注册代码镜头提供器
  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    ['json', 'jsonc'],
    {
      provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = []
        const codeBlocks = detector.detectAllCodeBlocks(document)

        for (const block of codeBlocks) {
          const range = new vscode.Range(
            document.positionAt(block.start),
            document.positionAt(block.end),
          )

          const codeLens = new vscode.CodeLens(range, {
            title: `✏️ Edit ${block.language.charAt(0).toUpperCase() + block.language.slice(1)}`,
            command: 'vscode-json-string-code-editor.editCodeAtRange',
            arguments: [document.uri.toString(), block],
          })

          codeLenses.push(codeLens)
        }

        return codeLenses
      },
    },
  )

  // 注册范围编辑命令
  const editCodeAtRangeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editCodeAtRange',
    async (documentUri: string, blockInfo: any) => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        return
      }

      // blockInfo 已经是 CodeBlockInfo 格式，直接使用
      await editorProvider.openCodeEditor(blockInfo, editor.document, editor)
    },
  )

  // 注册清理临时文件命令
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.cleanupTempFiles',
    async () => {
      try {
        // 获取工作区根目录
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
        if (!workspaceFolder) {
          logger.error('No workspace folder found')
          vscode.window.showErrorMessage('No workspace folder found')
          return
        }

        // 临时文件目录路径
        const tmpDirUri = vscode.Uri.joinPath(workspaceFolder.uri, 'tmp')
        
        // 检查临时目录是否存在
        try {
          await vscode.workspace.fs.stat(tmpDirUri)
        } catch {
          logger.info('No temporary files to clean up')
          vscode.window.showInformationMessage('No temporary files found')
          return
        }

        // 递归删除临时目录中的所有文件
        const deleteCount = await deleteTempFiles(tmpDirUri)
        
        logger.info(`Cleaned up ${deleteCount} temporary files`)
        vscode.window.showInformationMessage(`Successfully cleaned up ${deleteCount} temporary files`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error(`Failed to clean up temporary files: ${errorMessage}`)
        vscode.window.showErrorMessage(`Failed to clean up temporary files: ${errorMessage}`)
      }
    },
  )

  // 清理临时文件的辅助函数
  async function deleteTempFiles(dirUri: vscode.Uri): Promise<number> {
    let deleteCount = 0
    
    try {
      // 读取目录内容
      const entries = await vscode.workspace.fs.readDirectory(dirUri)
      
      for (const [name, type] of entries) {
        const entryUri = vscode.Uri.joinPath(dirUri, name)
        
        if (type === vscode.FileType.Directory) {
          // 递归删除子目录
          deleteCount += await deleteTempFiles(entryUri)
          await vscode.workspace.fs.delete(entryUri, { recursive: false })
        } else {
          // 删除文件
          await vscode.workspace.fs.delete(entryUri)
          deleteCount++
        }
      }
      
      return deleteCount
    } catch (error) {
      logger.error(`Failed to delete files in directory ${dirUri.fsPath}: ${error}`)
      return deleteCount
    }
  }

  // 注册点击处理器
  const clickHandler = vscode.window.onDidChangeTextEditorSelection(async (event) => {
    const editor = event.textEditor
    if (!editor || (editor.document.languageId !== 'json' && editor.document.languageId !== 'jsonc')) {
      return
    }

    // 检查是否点击了代码
    const selection = event.selections[0]
    if (selection && selection.isEmpty) {
      const position = selection.active
      const codeInfo = detector.detectCodeAtPosition(editor.document, position)

      if (codeInfo) {
        // 检查是否是单击（而不是拖拽选择）
        const timeSinceLastClick = Date.now() - (clickHandler as any).lastClickTime || 0
        if (timeSinceLastClick > 100) { // 防止重复触发
          (clickHandler as any).lastClickTime = Date.now()
          await editorProvider.openCodeEditor(codeInfo, editor.document, editor)
        }
      }
    }
  })

  context.subscriptions.push(
    editCodeCommand,
    editCodeAtRangeCommand,
    cleanupTempFilesCommand,
    codeLensProvider,
    decorationProvider,
    clickHandler,
    configChangeListener,
  )
}

export function deactivate() {
  // 清理日志服务
  logger.dispose()
  logger.info('JSON String Code Editor extension deactivated')
}