import * as jsonc from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

// 简化的Position和Range类
class Position {
  constructor(public line: number, public character: number) {}
}

class Range {
  constructor(public start: Position, public end: Position) {}
}

// 简化的文档类
class SimpleDocument {
  constructor(private content: string) {}

  offsetAt(position: Position): number {
    const lines = this.content.split('\n')
    let offset = 0
    for (let i = 0; i < position.line; i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    return offset + position.character
  }

  positionAt(offset: number): Position {
    const lines = this.content.split('\n')
    let currentOffset = 0
    for (let line = 0; line < lines.length; line++) {
      const lineLength = lines[line].length
      if (currentOffset + lineLength >= offset) {
        return new Position(line, offset - currentOffset)
      }
      currentOffset += lineLength + 1 // +1 for newline
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length)
  }

  getText(range?: Range): string {
    if (!range) {
      return this.content
    }
    const start = this.offsetAt(range.start)
    const end = this.offsetAt(range.end)
    return this.content.substring(start, end)
  }
}

function parseJsonForValueRange(content: string, key: string): { valueRange: Range, value: string, rawValue: string } | null {
  const document = new SimpleDocument(content)
  const tree = jsonc.parseTree(content)

  if (!tree)
    return null

  function findNode(node: jsonc.Node): { valueRange: Range, value: string, rawValue: string } | null {
    if (node.type === 'object' && node.children) {
      for (const child of node.children) {
        if (child.type === 'property' && child.children && child.children.length === 2) {
          const keyNode = child.children[0]
          const valueNode = child.children[1]

          if (keyNode.type === 'string' && keyNode.value === key && valueNode.type === 'string') {
            const valueRange = new Range(
              document.positionAt(valueNode.offset),
              document.positionAt(valueNode.offset + valueNode.length),
            )

            // 获取原始字符串（包含引号）
            const rawValue = content.substring(valueNode.offset, valueNode.offset + valueNode.length)

            return {
              valueRange,
              value: valueNode.value as string,
              rawValue,
            }
          }
        }
      }
    }
    return null
  }

  return findNode(tree)
}

describe('range Calculation', () => {
  it('should correctly calculate value range for simple string', () => {
    const content = `{\n  "script": "console.log('hello');"\n}`
    const result = parseJsonForValueRange(content, 'script')

    expect(result).not.toBeNull()
    if (result) {
      console.log('\n=== Simple String Test ===')
      console.log('Content:', JSON.stringify(content))
      console.log('Parsed value:', JSON.stringify(result.value))
      console.log('Raw value:', JSON.stringify(result.rawValue))

      const document = new SimpleDocument(content)
      const fullValue = document.getText(result.valueRange)
      console.log('Full value from range:', JSON.stringify(fullValue))

      // 检查范围是否包含引号
      expect(fullValue).toMatch(/^".*"$/)
      expect(fullValue).toBe(result.rawValue)

      // 检查去掉引号后的内容
      const startPos = document.offsetAt(result.valueRange.start) + 1
      const endPos = document.offsetAt(result.valueRange.end) - 1
      const innerContent = content.substring(startPos, endPos)
      console.log('Inner content:', JSON.stringify(innerContent))
      expect(innerContent).toBe(result.value)
    }
  })

  it('should correctly handle strings with escaped quotes', () => {
    const content = `{\n  "script": "console.log(\\"hello world\\");"\n}`
    const result = parseJsonForValueRange(content, 'script')

    expect(result).not.toBeNull()
    if (result) {
      console.log('\n=== Escaped Quotes Test ===')
      console.log('Content:', JSON.stringify(content))
      console.log('Parsed value:', JSON.stringify(result.value))
      console.log('Raw value:', JSON.stringify(result.rawValue))

      const document = new SimpleDocument(content)
      const fullValue = document.getText(result.valueRange)
      console.log('Full value from range:', JSON.stringify(fullValue))

      // 检查范围是否包含引号
      expect(fullValue).toMatch(/^".*"$/)
      expect(fullValue).toBe(result.rawValue)

      // 检查去掉引号后的内容
      const startPos = document.offsetAt(result.valueRange.start) + 1
      const endPos = document.offsetAt(result.valueRange.end) - 1
      const innerContent = content.substring(startPos, endPos)
      console.log('Inner content:', JSON.stringify(innerContent))

      // 验证解析的值是正确的
      expect(result.value).toBe('console.log("hello world");')
    }
  })

  it('should correctly handle strings with newlines', () => {
    const content = `{\n  "script": "const code = require('./code');\\nconsole.log(code);\\n"\n}`
    const result = parseJsonForValueRange(content, 'script')

    expect(result).not.toBeNull()
    if (result) {
      console.log('\n=== Newlines Test ===')
      console.log('Content:', JSON.stringify(content))
      console.log('Parsed value:', JSON.stringify(result.value))
      console.log('Raw value:', JSON.stringify(result.rawValue))

      const document = new SimpleDocument(content)
      const fullValue = document.getText(result.valueRange)
      console.log('Full value from range:', JSON.stringify(fullValue))

      // 检查范围是否包含引号
      expect(fullValue).toMatch(/^".*"$/)
      expect(fullValue).toBe(result.rawValue)

      // 检查去掉引号后的内容
      const startPos = document.offsetAt(result.valueRange.start) + 1
      const endPos = document.offsetAt(result.valueRange.end) - 1
      const innerContent = content.substring(startPos, endPos)
      console.log('Inner content:', JSON.stringify(innerContent))
      expect(innerContent).toBe('const code = require(\'./code\');\\nconsole.log(code);\\n')

      // 验证解析的值是正确的（jsonc-parser会自动解转义）
      expect(result.value).toBe('const code = require(\'./code\');\nconsole.log(code);\n')
    }
  })
})
