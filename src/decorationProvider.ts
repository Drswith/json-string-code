import type { CodeBlockInfo, JsonJsDetector } from './jsonJsDetector'
import * as vscode from 'vscode'

export class DecorationProvider {
  private detector: JsonJsDetector
  private decorationType: vscode.TextEditorDecorationType
  private disposables: vscode.Disposable[] = []

  constructor(detector: JsonJsDetector) {
    this.detector = detector

    // 创建装饰类型：下划线样式
    this.decorationType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'underline',
      color: '#569cd6', // VS Code 蓝色
      cursor: 'pointer',
    })

    // 监听文档变化
    this.disposables.push(
      vscode.window.onDidChangeActiveTextEditor(this.updateDecorations, this),
      vscode.workspace.onDidChangeTextDocument(this.onDocumentChange, this),
    )

    // 初始化当前编辑器的装饰
    this.updateDecorations()
  }

  private onDocumentChange(event: vscode.TextDocumentChangeEvent) {
    const activeEditor = vscode.window.activeTextEditor
    if (activeEditor && event.document === activeEditor.document) {
      // 延迟更新装饰，避免频繁更新
      setTimeout(() => this.updateDecorations(), 100)
    }
  }

  private updateDecorations(editor?: vscode.TextEditor) {
    const activeEditor = editor || vscode.window.activeTextEditor
    if (!activeEditor) {
      return
    }

    const document = activeEditor.document

    // 只处理JSON文件
    if (document.languageId !== 'json' && document.languageId !== 'jsonc') {
      return
    }

    // 检测所有代码块
    const codeBlocks = this.detector.detectAllCodeBlocks(document)

    // 创建装饰选项
    const decorations: vscode.DecorationOptions[] = codeBlocks.map(block => {
      const markdown = new vscode.MarkdownString()
      markdown.isTrusted = true
      
      // 添加标题
      markdown.appendMarkdown(`**${block.language} Code Detected**\n\n`)
      
      // 添加编辑链接
      const editCommand = `command:jsonJsEditor.editJavaScriptAtRange?${encodeURIComponent(JSON.stringify([document.uri.toString(), block]))}`
      markdown.appendMarkdown(`[✏️ Edit in temporary editor](${editCommand})\n\n`)
      
      // 添加代码预览（限制行数）
      const codeLines = block.code.split('\n')
      const previewLines = codeLines.slice(0, 5)
      const hasMore = codeLines.length > 5
      
      markdown.appendCodeblock(previewLines.join('\n'), block.language.toLowerCase())
      
      if (hasMore) {
        markdown.appendMarkdown(`\n*... and ${codeLines.length - 5} more lines*`)
      }
      
      return {
        range: block.range,
        hoverMessage: markdown,
      }
    })

    // 应用装饰
    activeEditor.setDecorations(this.decorationType, decorations)
  }

  public dispose() {
    this.decorationType.dispose()
    this.disposables.forEach(d => d.dispose())
  }
}