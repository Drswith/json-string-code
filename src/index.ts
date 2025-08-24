import * as vscode from 'vscode'
import { clickHandler } from './click-handler'
import { config } from './config'
import { decorationManager } from './decorations'
import { fileWatcher } from './file-watcher'
import { HoverCommandHandler, hoverProvider } from './hover-provider'
import { i18n } from './i18n'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

// 存储所有的disposables
let disposables: vscode.Disposable[] = []

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // 显示插件激活信息
  console.log('JSON String Code Editor extension is now active!')
  if (config.enableLogging) {
    logger.info('JSON String Code Editor extension activated with logging enabled')
  }

  // 使用导入的点击处理器实例
  // clickHandler 已经在模块导入时初始化

  // 注册悬停提供器（使用导入的实例）
  const hoverProviderDisposable = vscode.languages.registerHoverProvider(
    [{ language: 'json' }, { language: 'jsonc' }],
    hoverProvider,
  )

  // 注册悬停命令处理器
  const hoverCommandHandler = new HoverCommandHandler()

  // 注册悬停相关命令
  const editSnippetFromHoverCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editSnippetFromHover',
    async (documentUri: vscode.Uri, snippet: any) => {
      try {
        const document = await vscode.workspace.openTextDocument(documentUri)
        const editor = await tempFileManager.createTempFile(snippet, document)

        if (editor) {
          vscode.window.showInformationMessage(
            i18n.t('notification.tempFileCreated', snippet.key),
          )
        }
      }
      catch (error) {
        if (config.enableLogging) {
          logger.error(`Failed to edit snippet from hover: ${error}`)
        }
        vscode.window.showErrorMessage(i18n.t('notification.failedToOpen', String(error)))
      }
    },
  )

  const copySnippetCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.copySnippetCode',
    async (code: string) => {
      try {
        await vscode.env.clipboard.writeText(code)
        vscode.window.showInformationMessage(i18n.t('notification.codeCopied'))
      }
      catch (error) {
        if (config.enableLogging) {
          logger.error(`Failed to copy code: ${error}`)
        }
        vscode.window.showErrorMessage(i18n.t('notification.failedToCopy', String(error)))
      }
    },
  )

  // 注册右键菜单命令
  const editAsCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editAsCode',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showWarningMessage(i18n.t('notification.noActiveEditor'))
        return
      }

      if (editor.document.languageId !== 'json' && editor.document.languageId !== 'jsonc') {
        vscode.window.showWarningMessage(i18n.t('notification.jsonFilesOnly'))
        return
      }

      // 尝试在当前光标位置编辑代码片段，如果没有找到则显示选择器
      await clickHandler.editCodeSnippetAtCursor()
      // 如果光标位置没有代码片段，editCodeSnippetAtCursor会显示警告
      // 这里可以选择显示选择器作为备选方案
      // await clickHandler.showCodeSnippetPicker()
    },
  )

  // 注册刷新装饰命令（用于调试）
  const refreshDecorationsCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.refreshDecorations',
    () => {
      decorationManager.refreshAllDecorations()
      if (config.enableLogging) {
        logger.info('Decorations refreshed manually')
      }
    },
  )

  // 注册清理临时文件命令
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.cleanupTempFiles',
    async () => {
      const tempFileCount = tempFileManager.getTempFileCount()
      await tempFileManager.dispose()
      vscode.window.showInformationMessage(i18n.t('notification.tempFileCleanup', String(tempFileCount)))
    },
  )

  // 存储所有disposables
  disposables = [
    hoverProviderDisposable,
    editAsCodeCommand,
    editSnippetFromHoverCommand,
    copySnippetCodeCommand,
    refreshDecorationsCommand,
    cleanupTempFilesCommand,
  ]

  // 将disposables添加到context中
  context.subscriptions.push(...disposables)

  if (config.enableLogging) {
    logger.info('All components initialized successfully')
  }
}

export function deactivate(): void {
  if (config.enableLogging) {
    logger.info('JSON String Code Editor extension deactivated')
  }

  // 清理资源
  fileWatcher.dispose()
  decorationManager.dispose()
  tempFileManager.dispose()
  clickHandler.dispose()
  logger.dispose()

  // 清理所有disposables
  disposables.forEach(d => d.dispose())
  disposables = []
}
