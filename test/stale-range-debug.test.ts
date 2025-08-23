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
    json: true,
    wrap: false,
  })
}

// 模拟使用过期范围的同步过程
function simulateSyncWithStaleRange(
  originalJson: string,
  modifiedJson: string,
  staleRange: Range,
  newContent: string,
): { success: boolean, result?: string, error?: string } {
  try {
    console.log('\n=== Stale Range Debug ===')
    console.log('Original JSON:', JSON.stringify(originalJson))
    console.log('Modified JSON:', JSON.stringify(modifiedJson))
    console.log('Stale range:', staleRange)
    console.log('New content:', JSON.stringify(newContent))

    const document = new SimpleDocument(modifiedJson)

    // 使用过期的范围计算位置
    const startPos = document.offsetAt(staleRange.start) + 1 // 跳过开始引号
    const endPos = document.offsetAt(staleRange.end) - 1 // 跳过结束引号

    console.log('Start pos (after quote):', startPos)
    console.log('End pos (before quote):', endPos)
    console.log('Modified JSON length:', modifiedJson.length)

    // 检查范围是否有效
    if (startPos < 0 || endPos < 0 || startPos >= modifiedJson.length || endPos > modifiedJson.length) {
      return { success: false, error: `Invalid range: startPos=${startPos}, endPos=${endPos}, length=${modifiedJson.length}` }
    }

    if (startPos >= endPos) {
      return { success: false, error: `Invalid range: start >= end (${startPos} >= ${endPos})` }
    }

    // 检查范围内的字符
    const beforeStart = modifiedJson.charAt(startPos - 1)
    const afterEnd = modifiedJson.charAt(endPos)
    console.log('Character before start:', JSON.stringify(beforeStart))
    console.log('Character after end:', JSON.stringify(afterEnd))

    if (beforeStart !== '"' || afterEnd !== '"') {
      return { success: false, error: `Range doesn't point to quoted string: before='${beforeStart}', after='${afterEnd}'` }
    }

    const currentContent = modifiedJson.substring(startPos, endPos)
    console.log('Current content at range:', JSON.stringify(currentContent))

    // 转义新内容
    const escapedContent = escapeJsonString(newContent)
    console.log('Escaped content:', JSON.stringify(escapedContent))

    // 执行替换
    const beforeReplacement = modifiedJson.substring(0, startPos)
    const afterReplacement = modifiedJson.substring(endPos)
    const result = beforeReplacement + escapedContent + afterReplacement

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

// 获取JSON中某个键的值范围
function getValueRange(content: string, key: string): Range | null {
  const document = new SimpleDocument(content)
  const tree = jsonc.parseTree(content)

  if (!tree)
    return null

  function findNode(node: jsonc.Node): Range | null {
    if (node.type === 'object' && node.children) {
      for (const child of node.children) {
        if (child.type === 'property' && child.children && child.children.length === 2) {
          const keyNode = child.children[0]
          const valueNode = child.children[1]

          if (keyNode.type === 'string' && keyNode.value === key && valueNode.type === 'string') {
            return new Range(
              document.positionAt(valueNode.offset),
              document.positionAt(valueNode.offset + valueNode.length),
            )
          }
        }
      }
    }
    return null
  }

  return findNode(tree)
}

describe('stale Range Debug', () => {
  it('should fail when using stale range on modified document', () => {
    const originalJson = `{\n  "script": "console.log('hello');"\n}`
    const modifiedJson = `{\n  "newKey": "some value",\n  "script": "console.log('hello');"\n}`

    // 获取原始文档中的范围
    const staleRange = getValueRange(originalJson, 'script')
    expect(staleRange).not.toBeNull()

    if (staleRange) {
      const newContent = 'console.log(\'world\');'
      const result = simulateSyncWithStaleRange(originalJson, modifiedJson, staleRange, newContent)

      // 这应该失败，因为范围已经过期
      expect(result.success).toBe(false)
      expect(result.error).toContain('Range doesn\'t point to quoted string')
    }
  })

  it('should succeed when range is still valid', () => {
    const originalJson = `{\n  "script": "console.log('hello');"\n}`
    const modifiedJson = `{\n  "script": "console.log('hello');"\n}`

    // 获取原始文档中的范围
    const range = getValueRange(originalJson, 'script')
    expect(range).not.toBeNull()

    if (range) {
      const newContent = 'console.log(\'world\');'
      const result = simulateSyncWithStaleRange(originalJson, modifiedJson, range, newContent)

      // 这应该成功，因为文档没有变化
      expect(result.success).toBe(true)
    }
  })

  it('should fail when document is completely different', () => {
    const originalJson = `{\n  "script": "console.log('hello');"\n}`
    const modifiedJson = `{\n  "differentKey": "different value"\n}`

    // 获取原始文档中的范围
    const staleRange = getValueRange(originalJson, 'script')
    expect(staleRange).not.toBeNull()

    if (staleRange) {
      const newContent = 'console.log(\'world\');'
      const result = simulateSyncWithStaleRange(originalJson, modifiedJson, staleRange, newContent)

      // 这应该失败，因为文档结构完全不同
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Invalid range|Range doesn't point to quoted string/)
    }
  })
})
