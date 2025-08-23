import { defineExtension } from 'reactive-vscode'
import * as vscode from 'vscode'
import { clickHandler } from './click-handler'
import { config } from './config'
import { decorationManager } from './decorations'
import { fileWatcher } from './file-watcher'
import { HoverCommandHandler, hoverProvider } from './hover-provider'
import { i18n } from './i18n'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

const { activate, deactivate } = defineExtension(async () => {
  if (config.enableLogging) {
    logger.info('JSON String Code Editor extension activated')
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

  // 注册右键菜单命令
  const editAsCodeCommand = vscode.commands.registerCommand(
    'json-string-code.editAsCode',
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
    'json-string-code.refreshDecorations',
    () => {
      decorationManager.refreshAllDecorations()
      if (config.enableLogging) {
        logger.info('Decorations refreshed manually')
      }
    },
  )

  // 注册清理临时文件命令
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'json-string-code.cleanupTempFiles',
    async () => {
      const tempFileCount = tempFileManager.getTempFileCount()
      await tempFileManager.dispose()
      vscode.window.showInformationMessage(i18n.t('notification.tempFileCleanup', String(tempFileCount)))
    },
  )

  if (config.enableLogging) {
    logger.info('All components initialized successfully')
  }

  // 返回清理函数
  return () => {
    if (config.enableLogging) {
      logger.info('JSON String Code Editor extension deactivated')
    }

    // 清理资源
    fileWatcher.dispose()
    decorationManager.dispose()
    tempFileManager.dispose()
    clickHandler.dispose()
    hoverCommandHandler.dispose()

    // 清理命令注册
    hoverProviderDisposable.dispose()
    editAsCodeCommand.dispose()
    refreshDecorationsCommand.dispose()
    cleanupTempFilesCommand.dispose()
  }
})

export { activate, deactivate }
