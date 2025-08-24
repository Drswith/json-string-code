import * as vscode from 'vscode'
import { displayName } from './generated/meta'

// Create a simple logger using native VS Code API
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

  show(): void {
    this.outputChannel.show()
  }

  dispose(): void {
    this.outputChannel.dispose()
  }
}

export const logger = new Logger(displayName)
