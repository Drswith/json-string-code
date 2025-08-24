import * as vscode from 'vscode'
import * as Meta from './generated/meta'

// 创建配置对象，使用原生VS Code API
class ConfigManager {
  private readonly scope = Meta.scopedConfigs.scope
  private readonly defaults = Meta.scopedConfigs.defaults

  get include(): string[] {
    return vscode.workspace.getConfiguration(this.scope).get('include', this.defaults.include)
  }

  get forceCodeKeys(): string[] {
    return vscode.workspace.getConfiguration(this.scope).get('forceCodeKeys', this.defaults.forceCodeKeys)
  }

  get enableLogging(): boolean {
    return vscode.workspace.getConfiguration(this.scope).get('enableLogging', this.defaults.enableLogging)
  }

  get autoCloseTempTab(): boolean {
    return vscode.workspace.getConfiguration(this.scope).get('autoCloseTempTab', this.defaults.autoCloseTempTab)
  }

  get defaultLanguage(): string {
    return vscode.workspace.getConfiguration(this.scope).get('defaultLanguage', this.defaults.defaultLanguage)
  }
}

export const config = new ConfigManager()
