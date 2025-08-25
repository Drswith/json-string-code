import type { JsonJsDetector } from './jsonJsDetector'
import * as vscode from 'vscode'

export class JsonJsHoverProvider implements vscode.HoverProvider {
  private detector: JsonJsDetector

  constructor(detector: JsonJsDetector) {
    this.detector = detector
  }

  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    if (document.languageId !== 'json' && document.languageId !== 'jsonc') {
      return null
    }

    const jsInfo = this.detector.detectJavaScriptAtPosition(document, position)
    if (!jsInfo) {
      return null
    }

    const range = new vscode.Range(
      document.positionAt(jsInfo.start),
      document.positionAt(jsInfo.end),
    )

    const markdown = new vscode.MarkdownString()
    markdown.isTrusted = true
    markdown.supportHtml = true

    // 添加标题
    markdown.appendMarkdown(`**JavaScript Code in Field: \`${jsInfo.fieldName}\`**\n\n`)

    // 检测语言类型并添加代码预览（限制行数）
    const language = this.detector.detectLanguage(jsInfo.fieldName, jsInfo.code)
    const codeLines = jsInfo.code.split('\n')
    const previewLines = codeLines.slice(0, 5)
    const hasMore = codeLines.length > 5

    markdown.appendCodeblock(previewLines.join('\n'), language)

    if (hasMore) {
      markdown.appendMarkdown(`\n*... and ${codeLines.length - 5} more lines*\n\n`)
    }

    // 添加编辑链接
    const editCommand = `command:jsonJsEditor.editJavaScriptAtRange?${encodeURIComponent(JSON.stringify([document.uri.toString(), jsInfo]))}`
    markdown.appendMarkdown(`[$(edit) Edit in JavaScript Editor](${editCommand})`)

    return new vscode.Hover(markdown, range)
  }
}