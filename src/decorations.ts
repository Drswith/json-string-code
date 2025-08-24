import type { Position, Range, TextDocument, TextEditor } from 'vscode'
import type { CodeSnippet } from './json-parser'
import { ref, useActiveEditorDecorations, useActiveTextEditor } from 'reactive-vscode'
import { commands, window } from 'vscode'
import { config } from './config'
import { logger } from './utils'

// 响应式状态
const activeDecorations = ref<Map<string, CodeSnippet[]>>(new Map())

/**
 * 初始化响应式装饰器
 */
function initializeDecorations() {
  // 使用 reactive-vscode 的 useActiveEditorDecorations 来管理普通代码片段装饰
  useActiveEditorDecorations(
    {
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
    },
    () => {
      const editor = useActiveTextEditor().value
      if (!editor)
        return []

      const documentUri = editor.document.uri.toString()
      const snippets = activeDecorations.value.get(documentUri) || []
      const normalSnippets = snippets.filter(s => !s.isForced)
      return normalSnippets.map(snippet => snippet.range)
    },
  )

  // 使用 reactive-vscode 的 useActiveEditorDecorations 来管理强制代码片段装饰
  useActiveEditorDecorations(
    {
      textDecoration: 'underline',
      cursor: 'pointer',
      backgroundColor: 'rgba(0, 122, 204, 0.1)',
      borderRadius: '2px',
      border: '1px solid rgba(255, 107, 53, 0.3)',
    },
    () => {
      const editor = useActiveTextEditor().value
      if (!editor)
        return []

      const documentUri = editor.document.uri.toString()
      const snippets = activeDecorations.value.get(documentUri) || []
      const forcedSnippets = snippets.filter(s => s.isForced)
      return forcedSnippets.map(snippet => snippet.range)
    },
  )
}

/**
 * Update decorations in the editor
 */
export function updateDecorations(editor: TextEditor, snippets: CodeSnippet[]): void {
  if (!editor || !editor.document) {
    return
  }

  const documentUri = editor.document.uri.toString()
  activeDecorations.value.set(documentUri, snippets)

  // 触发装饰器重新计算（通过修改 activeDecorations 的引用）
  activeDecorations.value = new Map(activeDecorations.value)

  if (config.enableLogging) {
    const normalSnippets = snippets.filter(s => !s.isForced)
    const forcedSnippets = snippets.filter(s => s.isForced)
    logger.info(`Updated decorations for ${documentUri}: ${normalSnippets.length} normal, ${forcedSnippets.length} forced`)
  }
}

/**
 * Clear decorations from the editor
 */
export function clearDecorations(editor: TextEditor): void {
  if (!editor) {
    return
  }

  const documentUri = editor.document.uri.toString()
  activeDecorations.value.delete(documentUri)

  // 触发装饰器重新计算（通过修改 activeDecorations 的引用）
  activeDecorations.value = new Map(activeDecorations.value)

  if (config.enableLogging) {
    logger.info(`Cleared decorations for ${documentUri}`)
  }
}

/**
 * Get active code snippets for the specified document
 */
export function getActiveSnippets(documentUri: string): CodeSnippet[] {
  return activeDecorations.value.get(documentUri) || []
}

/**
 * Check if position is within code snippet decoration range
 */
export function isPositionInCodeSnippet(editor: TextEditor, position: Position): CodeSnippet | undefined {
  const documentUri = editor.document.uri.toString()
  const snippets = activeDecorations.value.get(documentUri) || []

  return snippets.find(snippet => snippet.valueRange.contains(position))
}

/**
 * Get code snippets within the specified range
 */
export function getSnippetsInRange(editor: TextEditor, range: Range): CodeSnippet[] {
  const documentUri = editor.document.uri.toString()
  const snippets = activeDecorations.value.get(documentUri) || []

  return snippets.filter(snippet =>
    snippet.valueRange.intersection(range) !== undefined,
  )
}

/**
 * Refresh decorations for all active editors
 */
export function refreshAllDecorations(): void {
  window.visibleTextEditors.forEach((editor) => {
    if (isJsonDocument(editor.document)) {
      // Need to re-parse document and update decorations
      // This method will be called from the main module
      commands.executeCommand('vscode-json-string-code-editor.refreshDecorations', editor.document.uri)
    }
  })
}

/**
 * Check if document is a JSON document
 */
function isJsonDocument(document: TextDocument): boolean {
  return document.languageId === 'json' || document.languageId === 'jsonc'
}

/**
 * Release resources
 */
export function dispose(): void {
  // Clear active decorations
  activeDecorations.value.clear()
}

// 初始化装饰器类型
initializeDecorations()

/**
 * 导出装饰器管理器对象
 */
export const decorationManager = {
  updateDecorations,
  clearDecorations,
  getActiveSnippets,
  isPositionInCodeSnippet,
  getSnippetsInRange,
  refreshAllDecorations,
  dispose,
}
