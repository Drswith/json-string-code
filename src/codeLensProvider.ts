import type { CodeDetector } from './codeDetector'
import * as vscode from 'vscode'
import { shouldProcessFile } from './fileUtils'

export class JsonJsCodeLensProvider implements vscode.CodeLensProvider {
  private detector: CodeDetector
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event

  constructor(detector: CodeDetector) {
    this.detector = detector
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // 检查文件是否应该被处理（包括文件类型和include配置）
    if (!shouldProcessFile(document)) {
      return []
    }

    const codeLenses: vscode.CodeLens[] = []
    const jsBlocks = this.detector.detectAllJavaScriptBlocks(document)

    for (const jsInfo of jsBlocks) {
      const range = new vscode.Range(
        document.positionAt(jsInfo.start),
        document.positionAt(jsInfo.end),
      )

      // 在JavaScript代码块上方添加CodeLens
      const codeLensRange = new vscode.Range(
        range.start.line,
        0,
        range.start.line,
        0,
      )

      const codeLens = new vscode.CodeLens(codeLensRange, {
        title: `$(edit) Edit JavaScript (${jsInfo.fieldName})`,
        command: 'vscode-json-string-code-editor.editCodeAtRange',
        arguments: [document.uri, jsInfo],
      })

      codeLenses.push(codeLens)
    }

    return codeLenses
  }

  refresh(): void {
    this._onDidChangeCodeLenses.fire()
  }

  dispose(): void {
    this._onDidChangeCodeLenses.dispose()
  }
}