import jsesc from 'jsesc'
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

// 模拟escapeJsonString函数
function escapeJsonString(str: string): string {
  return jsesc(str.toString(), {
    json: true, // 确保输出是有效的JSON
    wrap: false, // 不包含外层引号，因为我们只替换引号内的内容
  })
}

// 模拟完整的同步过程
function simulateSync(originalJson: string, key: string, newContent: string): { success: boolean, result?: string, error?: string } {
  try {
    console.log('\n=== Sync Process Debug ===')
    console.log('Original JSON:', JSON.stringify(originalJson))
    console.log('Key:', key)
    console.log('New content:', JSON.stringify(newContent))

    const document = new SimpleDocument(originalJson)
    const tree = jsonc.parseTree(originalJson)

    if (!tree) {
      return { success: false, error: 'Failed to parse JSON tree' }
    }

    // 查找目标节点
    function findValueNode(node: jsonc.Node): jsonc.Node | null {
      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length === 2) {
            const keyNode = child.children[0]
            const valueNode = child.children[1]

            if (keyNode.type === 'string' && keyNode.value === key && valueNode.type === 'string') {
              return valueNode
            }
          }
        }
      }
      return null
    }

    const valueNode = findValueNode(tree)
    if (!valueNode) {
      return { success: false, error: `Key "${key}" not found` }
    }

    console.log('Value node offset:', valueNode.offset)
    console.log('Value node length:', valueNode.length)
    console.log('Value node value:', JSON.stringify(valueNode.value))

    // 计算valueRange（包含引号）
    const valueRange = new Range(
      document.positionAt(valueNode.offset),
      document.positionAt(valueNode.offset + valueNode.length),
    )

    console.log('Value range start:', valueRange.start)
    console.log('Value range end:', valueRange.end)

    // 获取完整的值（包含引号）
    const fullValue = document.getText(valueRange)
    console.log('Full value with quotes:', JSON.stringify(fullValue))

    // 计算内容范围（跳过引号）
    const startPos = document.offsetAt(valueRange.start) + 1 // 跳过开始引号
    const endPos = document.offsetAt(valueRange.end) - 1 // 跳过结束引号

    console.log('Start pos (after quote):', startPos)
    console.log('End pos (before quote):', endPos)

    if (startPos >= endPos) {
      return { success: false, error: 'Invalid range: start >= end' }
    }

    const contentRange = new Range(
      document.positionAt(startPos),
      document.positionAt(endPos),
    )

    console.log('Content range start:', contentRange.start)
    console.log('Content range end:', contentRange.end)

    // 获取当前内容（不包含引号）
    const currentContent = document.getText(contentRange)
    console.log('Current content:', JSON.stringify(currentContent))

    // 转义新内容
    const escapedContent = escapeJsonString(newContent)
    console.log('Escaped content:', JSON.stringify(escapedContent))

    // 执行替换
    const beforeReplacement = originalJson.substring(0, startPos)
    const afterReplacement = originalJson.substring(endPos)
    const result = beforeReplacement + escapedContent + afterReplacement

    console.log('Before replacement:', JSON.stringify(beforeReplacement))
    console.log('After replacement:', JSON.stringify(afterReplacement))
    console.log('Result JSON:', JSON.stringify(result))

    // 验证结果是否为有效JSON
    try {
      JSON.parse(result)
      console.log('✓ Result is valid JSON')
      return { success: true, result }
    }
    catch (parseError) {
      console.log('✗ Result is invalid JSON:', parseError)
      return { success: false, error: `Invalid JSON result: ${parseError}` }
    }
  }
  catch (error) {
    console.log('✗ Sync process failed:', error)
    return { success: false, error: `Sync failed: ${error}` }
  }
}

describe('sync Process Debug', () => {
  it('should handle simple string replacement', () => {
    const originalJson = `{\n  "script": "console.log('hello');"\n}`
    const newContent = 'console.log(\'world\');'

    const result = simulateSync(originalJson, 'script', newContent)
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()

    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle content with quotes', () => {
    const originalJson = `{\n  "script": "console.log(\\"hello world\\");"\n}`
    const newContent = `console.log("goodbye world");`

    const result = simulateSync(originalJson, 'script', newContent)
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()

    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle content with newlines', () => {
    const originalJson = `{\n  "script": "const code = require('./code');\\nconsole.log(code);\\n"\n}`
    const newContent = `const code = require('./code');\nconsole.log(code);\n`

    const result = simulateSync(originalJson, 'script', newContent)
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()

    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle empty content', () => {
    const originalJson = `{\n  "script": "console.log('hello');"\n}`
    const newContent = ''

    const result = simulateSync(originalJson, 'script', newContent)
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()

    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle complex code with special characters', () => {
    const originalJson = `{\n  "script": "console.log('test');"\n}`
    const newContent = `const code = require("./code");\nconsole.log(code);\n`

    const result = simulateSync(originalJson, 'script', newContent)
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()

    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })
})
