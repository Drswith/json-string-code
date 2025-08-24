import type { Position, TextEditor } from 'vscode'
import { useActiveTextEditor, useDisposable } from 'reactive-vscode'
import { window } from 'vscode'
import { config } from './config'
import { decorationManager } from './decorations'
import { getBestKeyValueAtPosition, parseJsonKeyValueAtPosition } from './json-parser'
import { tempFileManager } from './temp-file-manager'
import { logger } from './utils'

/**
 * 设置点击处理器
 */
export function setupClickHandler() {
  // 监听文本编辑器选择变化
  useDisposable(
    window.onDidChangeTextEditorSelection(handleSelectionChange),
  )
}

/**
 * 处理选择变化事件
 */
function handleSelectionChange(event: any) {
  // 自动点击处理当前已禁用
  // 此方法保留供将来可能使用

}

async function handleCodeSnippetClick(snippet: any, document: any): Promise<void> {
  try {
    if (config.enableLogging) {
      logger.info(`Code snippet clicked: ${snippet.key}`)
    }

    // Create and open temporary file
    const editor = await tempFileManager.createTempFile(snippet, document)

    if (editor) {
      // Show success message
      window.showInformationMessage(
        `Opened code editor for "${snippet.key}". Save to sync changes.`,
      )
    }
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Failed to handle code snippet click: ${error}`)
    }
    window.showErrorMessage(`Failed to open code editor: ${String(error)}`)
  }
}

/**
 * 在指定位置编辑代码片段
 */
export async function editCodeSnippetAtPosition(editor: TextEditor, position: Position): Promise<void> {
  // First try to get code snippet from decoration manager
  let snippet = decorationManager.isPositionInCodeSnippet(editor, position)

  // If no code snippet decoration found, try parsing JSON key-value pair at position
  if (!snippet) {
    snippet = parseJsonKeyValueAtPosition(editor.document, position)
  }

  if (snippet) {
    await handleCodeSnippetClick(snippet, editor.document)
  }
  else {
    window.showWarningMessage('No code snippet found at cursor position')
  }
}

/**
 * 在光标位置编辑代码片段
 */
export async function editCodeSnippetAtCursor(): Promise<void> {
  const activeEditor = useActiveTextEditor()
  const editor = activeEditor.value

  if (!editor) {
    window.showWarningMessage('No active editor found')
    return
  }

  if (!isJsonDocument(editor.document)) {
    window.showWarningMessage('This command only works with JSON/JSONC files')
    return
  }

  const position = editor.selection.active

  // 使用新的逻辑获取最佳键值对
  let snippet = decorationManager.isPositionInCodeSnippet(editor, position)

  if (!snippet) {
    snippet = getBestKeyValueAtPosition(editor.document, position)
  }

  if (snippet) {
    // 检查是否为字符串类型且可能是代码
    if (typeof snippet.value === 'string' && (snippet.value.length > 10 || snippet.isForced)) {
      await handleCodeSnippetClick(snippet, editor.document)
    }
    else {
      window.showWarningMessage('选中的键值对不适合作为代码编辑（值太短或不是字符串类型）')
    }
  }
  else {
    window.showWarningMessage('未找到可编辑的键值对，请确保光标位于JSON对象内')
  }
}

/**
 * 显示所有可用的代码片段供用户选择
 */
export async function showCodeSnippetPicker(): Promise<void> {
  const activeEditor = useActiveTextEditor()
  const editor = activeEditor.value

  if (!editor) {
    window.showWarningMessage('No active editor found')
    return
  }

  if (!isJsonDocument(editor.document)) {
    window.showWarningMessage('This command only works with JSON/JSONC files')
    return
  }

  const snippets = decorationManager.getActiveSnippets(editor.document.uri.toString())

  if (snippets.length === 0) {
    window.showInformationMessage('No code snippet found at cursor position')
    return
  }

  // Create quick pick items
  const quickPickItems = snippets.map(snippet => ({
    label: snippet.key,
    description: snippet.isForced ? '🔒 Forced' : 'Auto-detected',
    detail: snippet.value.length > 100
      ? `${snippet.value.substring(0, 100)}...`
      : snippet.value,
    snippet, // Store original snippet data
  } as any))

  const selected = await window.showQuickPick(quickPickItems, {
    placeHolder: 'Select a code snippet to edit',
    matchOnDescription: true,
    matchOnDetail: true,
  })

  if (selected && (selected as any).snippet) {
    await handleCodeSnippetClick((selected as any).snippet, editor.document)
  }
}

/**
 * 检查文档是否为 JSON 文档
 */
function isJsonDocument(document: any): boolean {
  return document.languageId === 'json' || document.languageId === 'jsonc'
}

/**
 * 导出点击处理器对象
 */
export const clickHandler = {
  editCodeSnippetAtPosition,
  editCodeSnippetAtCursor,
  showCodeSnippetPicker,
  setupClickHandler,
}
