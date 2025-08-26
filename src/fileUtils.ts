import * as vscode from 'vscode'

/**
 * 检查文件是否匹配include配置的模式
 * @param document 要检查的文档
 * @returns 如果文件匹配include模式则返回true，否则返回false
 */
export function isFileIncluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const includePatterns: string[] = config.get('include', ['**/*.json', '**/*.jsonc'])

  // 如果没有配置include模式，默认包含所有文件
  if (!includePatterns || includePatterns.length === 0) {
    return true
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)

  // 检查文件路径是否匹配任何include模式
  return includePatterns.some((pattern) => {
    try {
      let documentSelector: vscode.DocumentSelector

      if (workspaceFolder) {
        // 使用相对模式匹配
        documentSelector = {
          pattern: new vscode.RelativePattern(workspaceFolder, pattern),
        }
      }
      else {
        // 如果没有工作区，使用简单的glob模式
        documentSelector = { pattern }
      }

      // 使用VS Code内置的匹配功能
      return vscode.languages.match(documentSelector, document) > 0
    }
    catch (error) {
      // 如果模式无效，记录错误并跳过
      console.warn(`Invalid include pattern: ${pattern}`, error)
      return false
    }
  })
}

/**
 * 检查文件是否匹配exclude配置的模式
 * @param document 要检查的文档
 * @returns 如果文件匹配exclude模式则返回true，否则返回false
 */
export function isFileExcluded(document: vscode.TextDocument): boolean {
  const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
  const excludePatterns: string[] = config.get('exclude', ['**/node_modules/**', '**/dist/**', '**/build/**'])

  // 如果没有配置exclude模式，不排除任何文件
  if (!excludePatterns || excludePatterns.length === 0) {
    return false
  }

  // 获取工作区文件夹
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri)

  // 检查文件路径是否匹配任何exclude模式
  return excludePatterns.some((pattern) => {
    try {
      let documentSelector: vscode.DocumentSelector

      if (workspaceFolder) {
        // 使用相对模式匹配
        documentSelector = {
          pattern: new vscode.RelativePattern(workspaceFolder, pattern),
        }
      }
      else {
        // 如果没有工作区，使用简单的glob模式
        documentSelector = { pattern }
      }

      // 使用VS Code内置的匹配功能
      return vscode.languages.match(documentSelector, document) > 0
    }
    catch (error) {
      // 如果模式无效，记录错误并跳过
      console.warn(`Invalid exclude pattern: ${pattern}`, error)
      return false
    }
  })
}

/**
 * 检查文件是否应该被扩展处理
 * 同时检查文件类型、include配置和exclude配置
 * @param document 要检查的文档
 * @returns 如果文件应该被处理则返回true，否则返回false
 */
export function shouldProcessFile(document: vscode.TextDocument): boolean {
  // 首先检查文件类型
  if (document.languageId !== 'json' && document.languageId !== 'jsonc') {
    return false
  }

  // 检查exclude配置（如果文件被排除，则不处理）
  if (isFileExcluded(document)) {
    return false
  }

  // 然后检查include配置
  return isFileIncluded(document)
}