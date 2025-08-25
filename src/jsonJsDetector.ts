import type { JSONVisitor, ParseError } from 'jsonc-parser'
import { parseTree, visit } from 'jsonc-parser'
import * as vscode from 'vscode'

export interface JavaScriptInfo {
  code: string
  start: number
  end: number
  range: vscode.Range
  fieldName: string
}

export interface CodeBlockInfo {
  code: string
  start: number
  end: number
  range: vscode.Range
  fieldName: string
  language: string
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
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
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

  detectCodeAtPosition(document: vscode.TextDocument, position: vscode.Position): CodeBlockInfo | null {
    const jsInfo = this.detectJavaScriptAtPosition(document, position)
    if (!jsInfo) {
      return null
    }

    // 将 JavaScriptInfo 转换为 CodeBlockInfo
    const language = this.detectLanguage(jsInfo.fieldName, jsInfo.code)
    return {
      code: jsInfo.code,
      start: jsInfo.start,
      end: jsInfo.end,
      range: jsInfo.range,
      fieldName: jsInfo.fieldName,
      language,
    }
  }

  detectAllJavaScriptBlocks(document: vscode.TextDocument): JavaScriptInfo[] {
    const text = document.getText()
    const blocks: JavaScriptInfo[] = []

    try {
      // 使用自定义JSON解析器解析JSON，支持注释和容错
      const parseErrors: ParseError[] = []
      const parsed = parseTree(text, parseErrors, {
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

  detectAllCodeBlocks(document: vscode.TextDocument): CodeBlockInfo[] {
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

  private findJavaScriptInObjectWithAST(text: string, offset: number, document: vscode.TextDocument): JavaScriptInfo | null {
    let result: JavaScriptInfo | null = null
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

    visit(text, visitor)
    return result
  }

  private findAllJavaScriptWithAST(text: string, document: vscode.TextDocument, blocks: JavaScriptInfo[]): void {
    let currentProperty: string | null = null

    const visitor: JSONVisitor = {
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

    visit(text, visitor)
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

        if (typeof value === 'string' && value.trim().length > 0) {
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
    // 匹配所有字符串字段，不限制字段名
    const regex = /"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g
    let match = regex.exec(text)

    while (match !== null) {
      const fieldName = match[1]
      const jsCode = match[2]
      const unescapedCode = this.unescapeString(jsCode)

      if (unescapedCode.trim().length > 0) {
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

    // Python 检测
    if (value.includes('def ') || value.includes('import ') || value.includes('from ')
      || /\bprint\s*\(/.test(value) || value.includes('__init__') || value.includes('self.')
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

    // C/C++ 检测
    if (/#include\s*</.test(value) || /\bint\s+main\s*\(/.test(value)
      || /\b(?:printf|scanf|cout|cin)\b/.test(value) || /\b(?:struct|typedef)\b/.test(value)) {
      if (/\b(?:class|namespace|template|std::)\b/.test(value) || value.includes('cout') || value.includes('cin')) {
        return 'cpp'
      }
      return 'c'
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
    // 为每个自动检测字段创建正则表达式，支持转义字符和未闭合字符串
    for (const fieldName of this.autoDetectFields) {
      // 修改正则表达式以正确处理转义字符、多行内容和未闭合字符串
      const regex = new RegExp(`"${fieldName}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"?`, 'g')
      let match = regex.exec(text)

      while (match !== null) {
        const fullMatch = match[0]
        let jsCode = match[1]

        // 对于未闭合的字符串，可能包含额外的内容，需要清理
        // 如果代码以分号结尾，截取到分号为止
        const semicolonIndex = jsCode.indexOf(';')
        if (semicolonIndex !== -1) {
          // 检查分号后是否只有空白字符和换行符
          const afterSemicolon = jsCode.substring(semicolonIndex + 1).trim()
          if (afterSemicolon === '' || /^[\s}]*$/.test(afterSemicolon)) {
            jsCode = jsCode.substring(0, semicolonIndex + 1)
          }
        }

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
      /\b(?:class|extends|super)\b/, // ES6类语法
      /\b(?:async|await)\b/, // 异步语法
      /\b(?:import|export)\b/, // 模块语法
      /\$\{[^}]+\}/, // 模板字符串
      /\b(?:typeof|instanceof)\b/, // 类型检查
      /\b(?:new|delete)\b/, // 对象操作
      /\b(?:switch|case|default|break|continue)\b/, // 控制流
      /\b(?:throw|finally)\b/, // 异常处理
      /\/\*[\s\S]*?\*\//, // 多行注释
      /\/\/.*$/, // 单行注释
      /[;{}]\s*$/, // 语句结束符
      /^\s*[{[]/, // 对象或数组字面量开始
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