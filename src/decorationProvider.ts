import type { JsonJsDetector } from './jsonJsDetector'
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

    // 检测所有JavaScript代码块
    const jsBlocks = this.detector.detectAllJavaScriptBlocks(document)

    // 创建装饰选项
    const decorations: vscode.DecorationOptions[] = jsBlocks.map(block => ({
      range: block.range,
      hoverMessage: new vscode.MarkdownString(`**JavaScript Code**\n\n\`\`\`javascript\n${block.code}\n\`\`\`\n\n*Click to edit*`),
    }))

    // 应用装饰
    activeEditor.setDecorations(this.decorationType, decorations)
  }

  public dispose() {
    this.decorationType.dispose()
    this.disposables.forEach(d => d.dispose())
  }
}