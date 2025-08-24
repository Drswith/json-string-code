import * as vscode from 'vscode'
import { clickHandler } from './click-handler'
import { config } from './config'
import { decorationManager } from './decorations'
import { fileWatcher } from './file-watcher'
import { HoverCommandHandler, hoverProvider } from './hover-provider'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

// Store all disposables
let disposables: vscode.Disposable[] = []

export function activate(context: vscode.ExtensionContext): void {
  // Show plugin activation info
  console.log('JSON String Code Editor extension is now active!')
  if (config.enableLogging) {
    logger.info('JSON String Code Editor extension activated with logging enabled')
    logger.show()
  }

  // Use imported click handler instance
  // clickHandler is already initialized at module import

  // Register hover provider (using imported instance)
  const hoverProviderDisposable = vscode.languages.registerHoverProvider(
    [{ language: 'json' }, { language: 'jsonc' }],
    hoverProvider,
  )

  // Register hover command handler
  const hoverCommandHandler = new HoverCommandHandler()

  // Register hover-related commands
  const editSnippetFromHoverCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editSnippetFromHover',
    async (documentUri: vscode.Uri, snippet: any) => {
      try {
        const document = await vscode.workspace.openTextDocument(documentUri)
        const editor = await tempFileManager.createTempFile(snippet, document)

        if (editor) {
          vscode.window.showInformationMessage(
            `Temporary file created: ${snippet.key}`,
          )
        }
      }
      catch (error) {
        if (config.enableLogging) {
          logger.error(`Failed to edit snippet from hover: ${error}`)
        }
        vscode.window.showErrorMessage(`Failed to open code editor: ${String(error)}`)
      }
    },
  )

  const copySnippetCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.copySnippetCode',
    async (code: string) => {
      try {
        await vscode.env.clipboard.writeText(code)
        vscode.window.showInformationMessage('Code copied to clipboard')
      }
      catch (error) {
        if (config.enableLogging) {
          logger.error(`Failed to copy code: ${error}`)
        }
        vscode.window.showErrorMessage(`Failed to copy code: ${String(error)}`)
      }
    },
  )

  // Register right-click menu commands
  const editAsCodeCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.editAsCode',
    async () => {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        vscode.window.showWarningMessage('No active editor found')
        return
      }

      if (editor.document.languageId !== 'json' && editor.document.languageId !== 'jsonc') {
        vscode.window.showWarningMessage('This command only works with JSON/JSONC files')
        return
      }

      // Try to edit code snippet at current cursor position, show selector if not found
      await clickHandler.editCodeSnippetAtCursor()
      // If no code snippet at cursor position, editCodeSnippetAtCursor will show warning
      // Here we can choose to show selector as fallback
      // await clickHandler.showCodeSnippetPicker()
    },
  )

  // Register refresh decorations command (for debugging)
  const refreshDecorationsCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.refreshDecorations',
    () => {
      decorationManager.refreshAllDecorations()
      if (config.enableLogging) {
        logger.info('Decorations refreshed manually')
      }
    },
  )

  // Register cleanup temporary files command
  const cleanupTempFilesCommand = vscode.commands.registerCommand(
    'vscode-json-string-code-editor.cleanupTempFiles',
    async () => {
      const tempFileCount = tempFileManager.getTempFileCount()
      await tempFileManager.dispose()
      vscode.window.showInformationMessage(`Cleaned up ${String(tempFileCount)} temporary files`)
    },
  )

  // Store all disposables
  disposables = [
    hoverProviderDisposable,
    editAsCodeCommand,
    editSnippetFromHoverCommand,
    copySnippetCodeCommand,
    refreshDecorationsCommand,
    cleanupTempFilesCommand,
  ]

  // Add disposables to context
  context.subscriptions.push(...disposables)

  if (config.enableLogging) {
    logger.info('All components initialized successfully')
  }
}

export function deactivate(): void {
  if (config.enableLogging) {
    logger.info('JSON String Code Editor extension deactivated')
  }

  // Clean up resources
  fileWatcher.dispose()
  decorationManager.dispose()
  tempFileManager.dispose()
  clickHandler.dispose()
  logger.dispose()

  // Clean up all disposables
  disposables.forEach(d => d.dispose())
  disposables = []
}
