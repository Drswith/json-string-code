import * as jsonc from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

// 模拟VSCode的Position和Range类
class Position {
  constructor(public line: number, public character: number) {}
}

class Range {
  constructor(public start: Position, public end: Position) {}
}

// 模拟VSCode的TextDocument
class SimpleDocument {
  private lines: string[]

  constructor(private content: string) {
    this.lines = content.split('\n')
  }

  getText(): string {
    return this.content
  }

  positionAt(offset: number): Position {
    let currentOffset = 0
    for (let line = 0; line < this.lines.length; line++) {
      const lineLength = this.lines[line].length
      if (currentOffset + lineLength >= offset) {
        return new Position(line, offset - currentOffset)
      }
      currentOffset += lineLength + 1 // +1 for newline
    }
    return new Position(this.lines.length - 1, this.lines[this.lines.length - 1].length)
  }

  offsetAt(position: Position): number {
    let offset = 0
    for (let i = 0; i < position.line && i < this.lines.length; i++) {
      offset += this.lines[i].length + 1 // +1 for newline
    }
    offset += Math.min(position.character, this.lines[position.line]?.length || 0)
    return offset
  }
}

interface CodeSnippet {
  key: string
  value: string
  range: Range
  keyRange: Range
  valueRange: Range
  isForced: boolean
}

// 模拟findCodeSnippetByKey函数
function findCodeSnippetByKey(content: string, targetKey: string): CodeSnippet | null {
  try {
    const tree = jsonc.parseTree(content)
    if (!tree)
      return null

    function visitNode(node: jsonc.Node): CodeSnippet | null {
      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length === 2) {
            const keyNode = child.children[0]
            const valueNode = child.children[1]

            if (keyNode.type === 'string' && valueNode.type === 'string') {
              const key = keyNode.value as string
              const value = valueNode.value as string

              if (key === targetKey) {
                // 创建一个临时文档来计算位置
                const lines = content.split('\n')
                const positionAt = (offset: number): Position => {
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

                const keyRange = new Range(
                  positionAt(keyNode.offset),
                  positionAt(keyNode.offset + keyNode.length),
                )

                const valueRange = new Range(
                  positionAt(valueNode.offset),
                  positionAt(valueNode.offset + valueNode.length),
                )

                const range = new Range(
                  keyRange.start,
                  valueRange.end,
                )

                return {
                  key,
                  value,
                  range,
                  keyRange,
                  valueRange,
                  isForced: false,
                }
              }
            }

            // 递归搜索嵌套对象和数组
            if (valueNode.type === 'object' || valueNode.type === 'array') {
              const result = visitNode(valueNode)
              if (result)
                return result
            }
          }
        }
      }
      return null
    }

    return visitNode(tree)
  }
  catch (error) {
    return null
  }
}

// 转义JSON字符串函数
function escapeJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
}

// 模拟动态范围同步过程
function simulateDynamicRangeSync(
  originalContent: string,
  targetKey: string,
  newContent: string,
): { success: boolean, result?: string, error?: string } {
  try {
    // 重新解析JSON以获取最新的valueRange
    const snippet = findCodeSnippetByKey(originalContent, targetKey)
    if (!snippet) {
      return { success: false, error: 'Code snippet not found' }
    }

    const document = new SimpleDocument(originalContent)

    // 计算替换范围（跳过引号）
    const startPos = document.offsetAt(snippet.valueRange.start) + 1
    const endPos = document.offsetAt(snippet.valueRange.end) - 1

    // 转义新内容
    const escapedContent = escapeJsonString(newContent)

    // 执行替换
    const before = originalContent.substring(0, startPos)
    const after = originalContent.substring(endPos)
    const result = before + escapedContent + after

    return { success: true, result }
  }
  catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

describe('dynamic Range Sync Tests', () => {
  it('should handle simple string replacement with dynamic range', () => {
    const originalJson = `{
  "script": "console.log('hello');"
}`
    const newContent = 'console.log("world");'

    const result = simulateDynamicRangeSync(originalJson, 'script', newContent)

    expect(result.success).toBe(true)
    expect(result.result).toContain('console.log(\\"world\\");')
  })

  it('should handle complex code with quotes and newlines', () => {
    const originalJson = `{
  "script": "const msg = 'hello';\\nconsole.log(msg);"
}`
    const newContent = `const greeting = "Hello World!";
console.log(greeting);`

    const result = simulateDynamicRangeSync(originalJson, 'script', newContent)

    expect(result.success).toBe(true)
    expect(result.result).toContain('const greeting = \\"Hello World!\\";\\nconsole.log(greeting);')
  })

  it('should handle modified JSON structure', () => {
    // 模拟JSON被修改后的情况
    const originalJson = `{
  "name": "test",
  "script": "console.log('original');",
  "version": "1.0.0"
}`
    const newContent = 'console.log("updated");'

    const result = simulateDynamicRangeSync(originalJson, 'script', newContent)

    expect(result.success).toBe(true)
    expect(result.result).toContain('console.log(\\"updated\\");')
  })

  it('should fail gracefully when key is not found', () => {
    const originalJson = `{
  "name": "test"
}`
    const newContent = 'console.log("test");'

    const result = simulateDynamicRangeSync(originalJson, 'script', newContent)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Code snippet not found')
  })

  it('should handle nested objects', () => {
    const originalJson = `{
  "config": {
    "script": "console.log('nested');"
  }
}`
    const newContent = 'console.log("updated nested");'

    const result = simulateDynamicRangeSync(originalJson, 'script', newContent)

    expect(result.success).toBe(true)
    expect(result.result).toContain('console.log(\\"updated nested\\");')
  })
})
