import * as vscode from 'vscode'
import { displayName } from './generated/meta'

// 创建简单的日志记录器，使用原生 VS Code API
class Logger {
  private outputChannel: vscode.OutputChannel

  constructor(name: string) {
    this.outputChannel = vscode.window.createOutputChannel(name)
  }

  info(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] INFO: ${message}`
    this.outputChannel.appendLine(logMessage)
    console.log(logMessage)
  }

  warn(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] WARN: ${message}`
    this.outputChannel.appendLine(logMessage)
    console.warn(logMessage)
  }

  error(message: string): void {
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ERROR: ${message}`
    this.outputChannel.appendLine(logMessage)
    console.error(logMessage)
  }

  dispose(): void {
    this.outputChannel.dispose()
  }
}

export const logger = new Logger(displayName)
