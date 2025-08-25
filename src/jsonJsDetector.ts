import * as jsonc from 'jsonc-parser'
import * as vscode from 'vscode'

export interface JavaScriptInfo {
  code: string
  start: number
  end: number
  range: vscode.Range
  fieldName: string
}

export class JsonJsDetector {
  private autoDetectFields: string[] = ['adaptor', 'adaptor2', 'script', 'code', 'expression']

  updateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('jsonJsEditor')
    this.autoDetectFields = config.get('autoDetectFields', ['adaptor', 'adaptor2', 'script', 'code', 'expression'])
  }

  detectJavaScriptAtPosition(document: vscode.TextDocument, position: vscode.Position): JavaScriptInfo | null {
    const text = document.getText()
    const offset = document.offsetAt(position)

    try {
      // 使用jsonc-parser解析JSON，支持注释和容错
      const parseErrors: jsonc.ParseError[] = []
      const parsed = jsonc.parse(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        return this.findJavaScriptInObjectWithAST(text, offset, document)
      }

      // 如果解析失败，尝试部分解析
      return this.findJavaScriptInPartialJson(text, offset, document)
    }
    catch (error) {
      return this.findJavaScriptInPartialJson(text, offset, document)
    }
  }

  detectAllJavaScriptBlocks(document: vscode.TextDocument): JavaScriptInfo[] {
    const text = document.getText()
    const blocks: JavaScriptInfo[] = []

    try {
      // 使用jsonc-parser解析JSON
      const parseErrors: jsonc.ParseError[] = []
      const parsed = jsonc.parse(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        this.findAllJavaScriptWithAST(text, document, blocks)
      }
      else {
        // 如果解析失败，使用正则表达式查找
        this.findAllJavaScriptWithRegex(text, document, blocks)
      }
    }
    catch (error) {
      this.findAllJavaScriptWithRegex(text, document, blocks)
    }

    return blocks
  }

  private findJavaScriptInObjectWithAST(text: string, offset: number, document: vscode.TextDocument): JavaScriptInfo | null {
    let result: JavaScriptInfo | null = null
    let currentProperty: string | null = null

    const visitor: jsonc.JSONVisitor = {
      onObjectProperty: (property: string) => {
        currentProperty = property
      },
      onLiteralValue: (value: any, valueOffset: number, valueLength: number) => {
        if (result || !currentProperty) {
          return
        }

        if (offset >= valueOffset && offset <= valueOffset + valueLength) {
          if (this.isJavaScriptField(currentProperty) && typeof value === 'string') {
            if (this.looksLikeJavaScript(value)) {
              // valueOffset包含引号，需要+1跳过开始引号，-1跳过结束引号
              const codeStart = valueOffset + 1
              const codeEnd = valueOffset + valueLength - 1
              const startPos = document.positionAt(codeStart)
              const endPos = document.positionAt(codeEnd)

              result = {
                code: value,
                start: codeStart,
                end: codeEnd,
                range: new vscode.Range(startPos, endPos),
                fieldName: currentProperty,
              }
            }
          }
        }
      },
    }

    jsonc.visit(text, visitor)
    return result
  }

  private findAllJavaScriptWithAST(text: string, document: vscode.TextDocument, blocks: JavaScriptInfo[]): void {
    let currentProperty: string | null = null

    const visitor: jsonc.JSONVisitor = {
      onObjectProperty: (property: string) => {
        currentProperty = property
      },
      onLiteralValue: (value: any, valueOffset: number, valueLength: number) => {
        if (!currentProperty) {
          return
        }

        if (this.isJavaScriptField(currentProperty) && typeof value === 'string') {
          if (this.looksLikeJavaScript(value)) {
            // valueOffset包含引号，需要+1跳过开始引号，-1跳过结束引号
            const codeStart = valueOffset + 1
            const codeEnd = valueOffset + valueLength - 1
            const startPos = document.positionAt(codeStart)
            const endPos = document.positionAt(codeEnd)

            blocks.push({
              code: value,
              start: codeStart,
              end: codeEnd,
              range: new vscode.Range(startPos, endPos),
              fieldName: currentProperty,
            })
          }
        }
      },
    }

    jsonc.visit(text, visitor)
  }

  private findJavaScriptInPartialJson(text: string, offset: number, document: vscode.TextDocument): JavaScriptInfo | null {
    // 回退到正则表达式方法
    const blocks: JavaScriptInfo[] = []
    this.findAllJavaScriptWithRegex(text, document, blocks)

    // 找到包含offset的块
    for (const block of blocks) {
      if (offset >= block.start && offset <= block.end) {
        return block
      }
    }

    return null
  }

  private findAllJavaScriptWithRegex(text: string, document: vscode.TextDocument, blocks: JavaScriptInfo[]): void {
    // 为每个自动检测字段创建正则表达式，支持转义字符
    for (const fieldName of this.autoDetectFields) {
      // 修改正则表达式以正确处理转义字符和多行内容
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'g')
      let match = regex.exec(text)

      while (match !== null) {
        const fullMatch = match[0]
        const jsCode = match[1]
        const unescapedCode = this.unescapeString(jsCode)

        if (this.looksLikeJavaScript(unescapedCode)) {
          const startOffset = match.index + fullMatch.indexOf('"', fullMatch.indexOf(':')) + 1
          const endOffset = startOffset + jsCode.length

          const startPos = document.positionAt(startOffset)
          const endPos = document.positionAt(endOffset)

          blocks.push({
            code: unescapedCode,
            start: startOffset,
            end: endOffset,
            range: new vscode.Range(startPos, endPos),
            fieldName,
          })
        }
        match = regex.exec(text)
      }
    }
  }

  private isJavaScriptField(fieldName: string): boolean {
    return this.autoDetectFields.includes(fieldName)
  }

  private looksLikeJavaScript(code: string): boolean {
    if (!code || code.trim().length === 0) {
      return false
    }

    // 检查是否包含JavaScript关键字或语法
    const jsPatterns = [
      /\bfunction\b/,
      /\bvar\b|\blet\b|\bconst\b/,
      /\bif\b|\belse\b|\bfor\b|\bwhile\b/,
      /\breturn\b/,
      /\btry\b|\bcatch\b|\bfinally\b/,
      /\bconsole\./,
      /=>/, // 箭头函数
      /\{[^}]*\}/, // 代码块
      /\([^)]*\)\s*=>/, // 箭头函数参数
      /\.\w*\s*\(/, // 方法调用
    ]

    return jsPatterns.some(pattern => pattern.test(code))
  }

  private unescapeString(str: string): string {
    return str.replace(/\\(.)/g, (match, char) => {
      switch (char) {
        case '"': return '"'
        case '\\': return '\\'
        case '/': return '/'
        case 'b': return '\b'
        case 'f': return '\f'
        case 'n': return '\n'
        case 'r': return '\r'
        case 't': return '\t'
        default: return char
      }
    })
  }
}