import type { JSONVisitor, ParseError } from 'jsonc-parser'
import { parseTree, visit } from 'jsonc-parser'
import * as vscode from 'vscode'

export interface CodeBlockInfo {
  code: string
  start: number
  end: number
  range: vscode.Range
  fieldName: string
  language: string
}

export class CodeDetector {
  private autoDetectFields: string[] = []
  private enableAutoDetection: boolean = true

  constructor() {
    this.updateConfiguration()
  }

  updateConfiguration(): void {
    const config = vscode.workspace.getConfiguration('vscode-json-string-code-editor')
    this.autoDetectFields = config.get('autoDetectFields', ['adaptor', 'script', 'code', 'expression'])
    this.enableAutoDetection = config.get('enableAutoDetection', true)
  }



  detectCodeAtPosition(document: vscode.TextDocument, position: vscode.Position): CodeBlockInfo | null {
    const text = document.getText()
    const offset = document.offsetAt(position)

    try {
      // 使用jsonc-parser解析JSON，支持注释和容错
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        return this.findCodeInObjectWithAST(text, offset, document)
      }

      // 如果解析失败，尝试部分解析
      return this.findCodeInPartialJson(text, offset, document)
    }
    catch (error) {
      console.error('Error detecting code at position:', error)
      return null
    }
  }



  detectAllCodeBlocks(document: vscode.TextDocument): CodeBlockInfo[] {
    // 如果禁用了自动检测，返回空数组
    if (!this.enableAutoDetection) {
      return []
    }

    const text = document.getText()
    const blocks: CodeBlockInfo[] = []

    try {
      // 使用自定义JSON解析器解析JSON，支持注释和容错
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
        allowTrailingComma: true,
        allowEmptyContent: true,
        disallowComments: false,
      })

      if (parsed) {
        this.findAllCodeBlocksWithAST(text, document, blocks)
      }
      else {
        // 如果解析失败，使用正则表达式查找
        this.findAllCodeBlocksWithRegex(text, document, blocks)
      }
    }
    catch (error) {
      this.findAllCodeBlocksWithRegex(text, document, blocks)
    }

    return blocks
  }



  private findCodeInObjectWithAST(text: string, offset: number, document: vscode.TextDocument): CodeBlockInfo | null {
    let result: CodeBlockInfo | null = null
    let currentProperty: string | null = null

    const visitor: JSONVisitor = {
      onObjectProperty: (property: string) => {
        currentProperty = property
      },
      onLiteralValue: (value: any, valueOffset: number, valueLength: number) => {
        if (result || !currentProperty) {
          return
        }

        if (offset >= valueOffset && offset <= valueOffset + valueLength) {
          if (this.isCodeField(currentProperty) && typeof value === 'string') {
            // valueOffset包含引号，需要+1跳过开始引号，-1跳过结束引号
            const codeStart = valueOffset + 1
            const codeEnd = valueOffset + valueLength - 1
            const startPos = document.positionAt(codeStart)
            const endPos = document.positionAt(codeEnd)
            const language = this.detectLanguage(currentProperty, value)

            result = {
              code: value,
              start: codeStart,
              end: codeEnd,
              range: new vscode.Range(startPos, endPos),
              fieldName: currentProperty,
              language,
            }
          }
        }
      },
    }

    visit(text, visitor)
    return result
  }

  private findCodeInPartialJson(text: string, offset: number, document: vscode.TextDocument): CodeBlockInfo | null {
    // 简化的部分JSON解析，用于处理格式不完整的JSON
    const lines = text.split('\n')
    const position = document.positionAt(offset)
    const currentLine = lines[position.line]

    // 查找当前行或附近行的字段名和值
    const fieldMatch = currentLine.match(/"([^"]+)"\s*:\s*"([^"]*)"/)
    if (fieldMatch) {
      const [, fieldName, value] = fieldMatch
      if (this.isCodeField(fieldName)) {
        const language = this.detectLanguage(fieldName, value)
        const valueStart = currentLine.indexOf(`"${value}"`)
        if (valueStart !== -1) {
          const lineStart = document.offsetAt(new vscode.Position(position.line, 0))
          const codeStart = lineStart + valueStart + 1
          const codeEnd = codeStart + value.length

          return {
            code: value,
            start: codeStart,
            end: codeEnd,
            range: new vscode.Range(
              document.positionAt(codeStart),
              document.positionAt(codeEnd),
            ),
            fieldName,
            language,
          }
        }
      }
    }

    return null
  }



  private findAllCodeBlocksWithAST(text: string, document: vscode.TextDocument, blocks: CodeBlockInfo[]): void {
    let currentProperty: string | null = null

    const visitor: JSONVisitor = {
      onObjectProperty: (property: string) => {
        currentProperty = property
      },
      onLiteralValue: (value: any, valueOffset: number, valueLength: number) => {
        if (!currentProperty) {
          return
        }

        // 只检测配置中指定的字段或符合代码字段模式的字段
        if (this.isCodeField(currentProperty) && typeof value === 'string' && value.trim().length > 0) {
          // 检测语言类型
          const language = this.detectLanguage(currentProperty, value)

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
            language,
          })
        }
      },
    }

    visit(text, visitor)
  }

  private findAllCodeBlocksWithRegex(text: string, document: vscode.TextDocument, blocks: CodeBlockInfo[]): void {
    // 匹配字符串字段，但只处理配置中指定的字段或符合代码字段模式的字段
    const regex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    let match = regex.exec(text)

    while (match !== null) {
      const fieldName = match[1]
      const jsCode = match[2]
      const unescapedCode = this.unescapeString(jsCode)

      // 只检测配置中指定的字段或符合代码字段模式的字段
      if (this.isCodeField(fieldName) && unescapedCode.trim().length > 0) {
        const language = this.detectLanguage(fieldName, unescapedCode)
        const fullMatch = match[0]
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
          language,
        })
      }
      match = regex.exec(text)
    }
  }

  public detectLanguage(key: string, value: string): string {
    const keyLower = key.toLowerCase()

    // 基于键名推断语言类型
    if (keyLower.includes('sql') || keyLower.includes('query')) {
      return 'sql'
    }
    if (keyLower.includes('html') || keyLower.includes('template')) {
      return 'html'
    }
    if (keyLower.includes('css') || keyLower.includes('style')) {
      return 'css'
    }
    if (keyLower.includes('xml')) {
      return 'xml'
    }
    if (keyLower.includes('yaml') || keyLower.includes('yml')) {
      return 'yaml'
    }
    if (keyLower.includes('markdown') || keyLower.includes('md')) {
      return 'markdown'
    }
    if (keyLower.includes('python') || keyLower.includes('py')) {
      return 'python'
    }
    if (keyLower.includes('typescript') || keyLower.includes('ts')) {
      return 'typescript'
    }
    if (keyLower.includes('java')) {
      return 'java'
    }
    if (keyLower.includes('php')) {
      return 'php'
    }
    if (keyLower.includes('shell') || keyLower.includes('bash') || keyLower.includes('sh')) {
      return 'shellscript'
    }
    if (keyLower.includes('json')) {
      return 'json'
    }
    if (keyLower.includes('dockerfile') || keyLower.includes('docker')) {
      return 'dockerfile'
    }
    if (keyLower.includes('go') || keyLower.includes('golang')) {
      return 'go'
    }
    if (keyLower.includes('rust') || keyLower.includes('rs')) {
      return 'rust'
    }
    if (keyLower.includes('cpp') || keyLower.includes('c++') || keyLower.includes('cxx')) {
      return 'cpp'
    }
    if ((keyLower === 'c' || keyLower.includes('c_code') || keyLower.includes('c-code')) && !keyLower.includes('css')) {
      return 'c'
    }
    if (keyLower.includes('javascript') || keyLower.includes('js')) {
      return 'javascript'
    }

    // 基于内容推断语言类型
    const valueLower = value.toLowerCase()

    // JavaScript/TypeScript 检测
    if (value.includes('function') || value.includes('=>') || value.includes('const ') || value.includes('let ')
      || value.includes('var ') || value.includes('console.') || /\b(?:async|await)\b/.test(value)
      || /\b(?:import|export)\b/.test(value) || /\$\{[^}]+\}/.test(value)) {
      // 进一步检测是否为 TypeScript
      if (/:\s*(?:string|number|boolean|object|any|void)\b/.test(value)
        || /\b(?:interface|type|enum)\b/.test(value) || value.includes('<T>')) {
        return 'typescript'
      }
      return 'javascript'
    }

    // C/C++ 检测 (需要在Python之前检测，避免printf被误判)
    if (/#include\s*</.test(value) || /\bint\s+main\s*\(/.test(value)
      || /\b(?:printf|scanf|cout|cin)\b/.test(value) || /\b(?:struct|typedef)\b/.test(value)) {
      if (/\b(?:class|namespace|template|std::)\b/.test(value) || value.includes('cout') || value.includes('cin')) {
        return 'cpp'
      }
      return 'c'
    }

    // Python 检测
    if (value.includes('def ') || value.includes('import ') || value.includes('from ')
      || (/\bprint\s*\(/.test(value) && !/#include/.test(value)) || value.includes('__init__') || value.includes('self.')
      || /^\s*#/.test(value) || /\bif\s+__name__\s*==\s*['"]__main__['"]/.test(value)) {
      return 'python'
    }

    // SQL 检测
    if (/\b(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(value)
      || /\b(?:FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b/i.test(value)) {
      return 'sql'
    }

    // HTML 检测
    if (value.includes('<') && value.includes('>')
      && (/<\/?[a-z][\s\S]*>/i.test(value) || /<!DOCTYPE/i.test(value))) {
      return 'html'
    }

    // CSS 检测
    if (/\{[^}]*\}/.test(value) && (/[a-z-]+:[^;]+;/i.test(value)
      || /\.\w+\s*\{/.test(value) || /#\w+\s*\{/.test(value))) {
      return 'css'
    }

    // Java 检测
    if (/\b(?:public|private|protected)\s+(?:class|interface)\b/.test(value)
      || /\bSystem\.out\.print/.test(value) || /\bpublic\s+static\s+void\s+main/.test(value)
      || /\b(?:extends|implements)\b/.test(value)) {
      return 'java'
    }

    // PHP 检测
    if (value.includes('<?php') || /\$\w+/.test(value) || value.includes('echo ')
      || (/\b(?:function|class)\s+\w+/.test(value) && value.includes('$'))) {
      return 'php'
    }

    // Shell 检测
    if (value.startsWith('#!') || /\b(?:echo|ls|cd|mkdir|rm)\b/.test(value)
      || (/\$\{?\w+\}?/.test(value) && !/\$\{[^}]+\}/.test(value))) {
      return 'shellscript'
    }

    // JSON 检测
    if ((value.startsWith('{') && value.endsWith('}'))
      || (value.startsWith('[') && value.endsWith(']'))) {
      try {
        JSON.parse(value)
        return 'json'
      }
      catch {
        // 不是有效的 JSON
      }
    }

    // Go 检测
    if (/\bpackage\s+\w+/.test(value) || /\bfunc\s+\w+/.test(value)
      || (/\b(?:import|var|const)\s+/.test(value) && value.includes('fmt.'))) {
      return 'go'
    }

    // Rust 检测
    if (/\bfn\s+\w+/.test(value) || /\blet\s+mut\b/.test(value)
      || value.includes('println!') || /\b(?:struct|enum|impl)\b/.test(value)) {
      return 'rust'
    }

    // YAML 检测
    if (/^\s*\w+:\s*/.test(value) && (value.includes('\n') || value.includes('- '))) {
      return 'yaml'
    }

    // XML 检测
    if (value.includes('<?xml') || (value.includes('<') && value.includes('>')
      && /<\w[^>]*>.*<\/\w+>/.test(value))) {
      return 'xml'
    }

    // Dockerfile 检测
    if (/^\s*(?:FROM|RUN|COPY|ADD|WORKDIR|EXPOSE|CMD|ENTRYPOINT)\b/im.test(value)) {
      return 'dockerfile'
    }

    return 'javascript'
  }



  private isCodeField(fieldName: string): boolean {
    // 检查是否为已知的代码字段
    if (this.autoDetectFields.includes(fieldName)) {
      return true
    }

    // 如果禁用了自动检测，不进行关键词匹配
    if (!this.enableAutoDetection) {
      return false
    }

    // 如果启用了自动检测但autoDetectFields为空，不进行关键词匹配
    if (this.autoDetectFields.length === 0) {
      return false
    }

    // 检查字段名是否包含代码相关的关键词
    const fieldLower = fieldName.toLowerCase()
    return fieldLower.includes('code') || fieldLower.includes('script')
      || fieldLower.includes('sql') || fieldLower.includes('query')
      || fieldLower.includes('html') || fieldLower.includes('css')
      || fieldLower.includes('python') || fieldLower.includes('java')
      || fieldLower.includes('typescript') || fieldLower.includes('javascript')
      || fieldLower.includes('php') || fieldLower.includes('shell')
      || fieldLower.includes('bash') || fieldLower.includes('go')
      || fieldLower.includes('rust') || fieldLower.includes('cpp')
      || fieldLower.includes('c++') || fieldLower === 'c'
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
        case 'u': {
          // 处理Unicode转义序列 \uXXXX
          const nextFour = str.substr(str.indexOf(match) + 2, 4)
          if (/^[0-9a-f]{4}$/i.test(nextFour)) {
            return String.fromCharCode(Number.parseInt(nextFour, 16))
          }
          return char
        }
        case 'x': {
          // 处理十六进制转义序列 \xXX
          const nextTwo = str.substr(str.indexOf(match) + 2, 2)
          if (/^[0-9a-f]{2}$/i.test(nextTwo)) {
            return String.fromCharCode(Number.parseInt(nextTwo, 16))
          }
          return char
        }
        case '0': case '1': case '2': case '3': case '4': case '5': case '6': case '7': {
          // 处理八进制转义序列 \ooo
          const octal = match.substr(1)
          if (/^[0-7]{1,3}$/.test(octal)) {
            return String.fromCharCode(Number.parseInt(octal, 8))
          }
          return char
        }
        default: return char
      }
    })
  }
}