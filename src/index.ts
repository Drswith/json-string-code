import type { Uri } from 'vscode'
import { defineExtension, useCommand, useDisposable } from 'reactive-vscode'
import { env, languages, window, workspace } from 'vscode'
import { editCodeSnippetAtCursor } from './click-handler'
import { config } from './config'
import { decorationManager } from './decorations'
import { fileWatcher } from './file-watcher'
import { commands } from './generated/meta'
import { hoverProvider } from './hover-provider'
import { createTempFile, dispose as disposeTempFiles, getTempFileCount, tempFileManager } from './temp-file-manager'
import { logger } from './utils'

const { activate, deactivate } = defineExtension(async () => {
  try {
    // Show plugin activation info
    console.log('JSON String Code Editor extension is now active!')
    if (config.enableLogging) {
      logger.info('JSON String Code Editor extension activated with logging enabled')
      logger.show()
    }

    // Initialize all components with proper error handling
    try {
      fileWatcher.setupFileWatchers()
      if (config.enableLogging) {
        logger.info('File watcher initialized')
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to initialize file watcher: ${error}`)
      }
      console.error('File watcher initialization failed:', error)
    }

    try {
      await tempFileManager.setupTempFileManager()
      if (config.enableLogging) {
        logger.info('Temp file manager initialized')
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to initialize temp file manager: ${error}`)
      }
      console.error('Temp file manager initialization failed:', error)
    }

    // Register hover provider (using imported instance)
    try {
      useDisposable(languages.registerHoverProvider(
        [{ language: 'json' }, { language: 'jsonc' }],
        hoverProvider,
      ))
      if (config.enableLogging) {
        logger.info('Hover provider registered')
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to register hover provider: ${error}`)
      }
      console.error('Hover provider registration failed:', error)
    }

    // Register hover-related commands edit
    try {
      useCommand(
        commands.editSnippetFromHover,
        async (documentUri: Uri, snippet: any) => {
          try {
            if (config.enableLogging) {
              logger.info(`Creating temp file for snippet: ${snippet?.key || 'unknown'}`)
            }
            const document = await workspace.openTextDocument(documentUri)
            const editor = await createTempFile(snippet, document)

            if (editor) {
              const msg = `Temporary file created: ${snippet.key}`
              window.showInformationMessage(msg)
              if (config.enableLogging) {
                logger.info(msg)
              }
            }
          }
          catch (error) {
            const errorMessage = `Failed to open code editor: ${String(error)}`
            window.showErrorMessage(errorMessage)
            if (config.enableLogging) {
              logger.error(`Failed to edit snippet from hover: ${error}`)
            }
            console.error('editSnippetFromHover error:', error)
          }
        },
      )
      if (config.enableLogging) {
        logger.info('editSnippetFromHover command registered')
      }
    }
    catch (error) {
      if (config.enableLogging) {
        logger.error(`Failed to register editSnippetFromHover command: ${error}`)
      }
      console.error('Command registration failed:', error)
    }

  // Register hover-related commands copy
  // useCommand(
  //   commands.copySnippetCode,
  //   async (code: string) => {
  //     try {
  //       await env.clipboard.writeText(code)
  //       const msg = 'Code copied to clipboard'
  //       window.showInformationMessage(msg)
  //       if (config.enableLogging) {
  //         logger.info(msg)
  //       }
  //     }
  //     catch (error) {
  //       if (config.enableLogging) {
  //         logger.error(`Failed to copy code: ${error}`)
  //       }
  //       window.showErrorMessage(`Failed to copy code: ${String(error)}`)
  //     }
  //   },
  // )

  // Register right-click menu commands
  // useCommand(
  //   commands.editAsCode,
  //   async () => {
  //     const editor = window.activeTextEditor

  //     if (!editor) {
  //       const msg = 'No active editor found'
  //       window.showWarningMessage(msg)
  //       if (config.enableLogging) {
  //         logger.warn(msg)
  //       }
  //       return
  //     }

  //     if (editor.document.languageId !== 'json' && editor.document.languageId !== 'jsonc') {
  //       const msg = 'This command only works with JSON/JSONC files'
  //       window.showWarningMessage(msg)
  //       if (config.enableLogging) {
  //         logger.warn(msg)
  //       }
  //       return
  //     }

  //     // Try to edit code snippet at current cursor position, show selector if not found
  //     await editCodeSnippetAtCursor()
  //     // If no code snippet at cursor position, editCodeSnippetAtCursor will show warning
  //     // Here we can choose to show selector as fallback
  //     // await clickHandler.showCodeSnippetPicker()
  //   },
  // )

  // Register refresh decorations command (for debugging)
  // useCommand(
  //   commands.refreshDecorations,
  //   () => {
  //     decorationManager.refreshAllDecorations()
  //     if (config.enableLogging) {
  //       logger.info('Decorations refreshed manually')
  //     }
  //   },
  // )

  // Register cleanup temporary files command
  // useCommand(
  //   commands.cleanupTempFiles,
  //   async () => {
  //     const tempFileCount = getTempFileCount()
  //     await disposeTempFiles()
  //     const msg = `Cleaned up ${String(tempFileCount)} temporary files`
  //     window.showInformationMessage(msg)
  //     if (config.enableLogging) {
  //       logger.info(msg)
  //     }
  //   },
  // )

    if (config.enableLogging) {
      logger.info('Extension initialization completed')
    }
  }
  catch (error) {
    console.error('Critical error during extension activation:', error)
    if (config.enableLogging) {
      logger.error(`Critical error during extension activation: ${error}`)
    }
    // 即使发生错误也不抛出，让扩展尽可能继续运行
  }
})

export { activate, deactivate }
