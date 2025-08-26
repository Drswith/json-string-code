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
    _token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    // 检查文件是否应该被处理（包括文件类型和include配置）
    if (!shouldProcessFile(document)) {
      return []
    }

    // 检查是否启用了自动检测
    const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
    const enableAutoDetection = config.get('enableAutoDetection', true)
    if (!enableAutoDetection) {
      return []
    }

    const codeLenses: vscode.CodeLens[] = []
    const codeBlocks = this.detector.detectAllCodeBlocks(document)

    for (const codeInfo of codeBlocks) {
      const range = new vscode.Range(
        document.positionAt(codeInfo.start),
        document.positionAt(codeInfo.end),
      )

      // 在JavaScript代码块上方添加CodeLens
      const codeLensRange = new vscode.Range(
        range.start.line,
        0,
        range.start.line,
        0,
      )

      const codeLens = new vscode.CodeLens(codeLensRange, {
        title: `$(edit) Edit Code (${codeInfo.fieldName})`,
        command: 'vscode-json-string-code-editor.editCodeAtRange',
        arguments: [document.uri, codeInfo],
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
