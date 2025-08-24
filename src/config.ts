import * as vscode from 'vscode'
import * as Meta from './generated/meta'

// Create configuration object using native VS Code API
class ConfigManager {
  // private readonly scope = Meta.scopedConfigs.scope
  // private readonly defaults = Meta.scopedConfigs.defaults
  private readonly configs = Meta.configs

  get include(): string[] {
    // return vscode.workspace.getConfiguration(this.scope).get('include', this.defaults.include)
    return vscode.workspace.getConfiguration().get(this.configs.include.key, this.configs.include.default)
  }

  get forceCodeKeys(): string[] {
    // return vscode.workspace.getConfiguration(this.scope).get('forceCodeKeys', this.defaults.forceCodeKeys)
    return vscode.workspace.getConfiguration().get(this.configs.forceCodeKeys.key, this.configs.forceCodeKeys.default)
  }

  get enableLogging(): boolean {
    // return vscode.workspace.getConfiguration(this.scope).get('enableLogging', this.defaults.enableLogging)
    return vscode.workspace.getConfiguration().get(this.configs.enableLogging.key, this.configs.enableLogging.default)
  }

  get autoCloseTempTab(): boolean {
    // return vscode.workspace.getConfiguration(this.scope).get('autoCloseTempTab', this.defaults.autoCloseTempTab)
    return vscode.workspace.getConfiguration().get(this.configs.autoCloseTempTab.key, this.configs.autoCloseTempTab.default)
  }

  get defaultLanguage(): string {
    // return vscode.workspace.getConfiguration(this.scope).get('defaultLanguage', this.defaults.defaultLanguage)
    return vscode.workspace.getConfiguration().get(this.configs.defaultLanguage.key, this.configs.defaultLanguage.default)
  }
}

export const config = new ConfigManager()
