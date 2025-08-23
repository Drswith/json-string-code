import jsesc from 'jsesc'
import * as jsonc from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

// 模拟Position和Range类
class Position {
  constructor(public line: number, public character: number) {}
}

class Range {
  constructor(public start: Position, public end: Position) {}
}

// 模拟CodeSnippet接口
interface CodeSnippet {
  key: string
  value: string
  range: Range
  keyRange: Range
  valueRange: Range
  isForced: boolean
}

// 模拟findCodeSnippetByKey函数（支持非字符串值）
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

            // 支持所有类型的键值对，不仅仅是字符串
            if (keyNode.type === 'string') {
              const key = keyNode.value as string
              let value: string

              // 根据值的类型进行不同处理
              if (valueNode.type === 'string') {
                value = valueNode.value as string
              }
              else if (valueNode.type === 'number') {
                value = String(valueNode.value)
              }
              else if (valueNode.type === 'boolean') {
                value = String(valueNode.value)
              }
              else if (valueNode.type === 'null') {
                value = 'null'
              }
              else {
                // 对于对象、数组等复杂类型，使用原始文本
                const startOffset = valueNode.offset
                const endOffset = valueNode.offset + valueNode.length
                value = content.substring(startOffset, endOffset)
              }

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
    console.error(`Failed to find code snippet by key: ${error}`)
    return null
  }
}

// 模拟同步逻辑（支持非字符串值）
function simulateNonStringSync(originalJson: string, key: string, newValue: string): { success: boolean, result?: string, error?: string } {
  try {
    const snippet = findCodeSnippetByKey(originalJson, key)
    if (!snippet) {
      return { success: false, error: `Key "${key}" not found in current document` }
    }

    // 检测原始值的类型
    const tree = jsonc.parseTree(originalJson)
    let originalValueType = 'string' // 默认为字符串
    let replacementContent: string

    if (tree) {
      // 查找对应的值节点来确定类型
      function findValueNode(node: jsonc.Node): jsonc.Node | null {
        if (node.type === 'object' && node.children) {
          for (const child of node.children) {
            if (child.type === 'property' && child.children && child.children.length === 2) {
              const keyNode = child.children[0]
              const valueNode = child.children[1]
              if (keyNode.type === 'string' && keyNode.value === key) {
                return valueNode
              }
            }
            // 递归搜索
            if (child.children && child.children[1] && (child.children[1].type === 'object' || child.children[1].type === 'array')) {
              const result = findValueNode(child.children[1])
              if (result)
                return result
            }
          }
        }
        return null
      }

      const valueNode = findValueNode(tree)
      if (valueNode) {
        originalValueType = valueNode.type
      }
    }

    // 计算替换范围和内容
    let startOffset: number
    let endOffset: number

    // 正确计算偏移量
    const lines = originalJson.split('\n')
    const calculateOffset = (line: number, character: number): number => {
      let offset = 0
      for (let i = 0; i < line; i++) {
        offset += lines[i].length + 1 // +1 for newline
      }
      return offset + character
    }

    if (originalValueType === 'string') {
      // 字符串值：跳过引号，只替换内容
      startOffset = calculateOffset(snippet.valueRange.start.line, snippet.valueRange.start.character) + 1
      endOffset = calculateOffset(snippet.valueRange.end.line, snippet.valueRange.end.character) - 1
      replacementContent = jsesc(newValue, { json: true, wrap: false })
    }
    else {
      // 非字符串值：替换整个值
      startOffset = calculateOffset(snippet.valueRange.start.line, snippet.valueRange.start.character)
      endOffset = calculateOffset(snippet.valueRange.end.line, snippet.valueRange.end.character)

      // 尝试解析新内容为合适的JSON值
      const trimmedContent = newValue.trim()
      if (trimmedContent === 'true' || trimmedContent === 'false') {
        // 布尔值
        replacementContent = trimmedContent
      }
      else if (trimmedContent === 'null') {
        // null值
        replacementContent = 'null'
      }
      else if (/^-?\d+(?:\.\d+)?$/.test(trimmedContent)) {
        // 数字
        replacementContent = trimmedContent
      }
      else {
        // 其他情况，作为字符串处理
        replacementContent = `"${jsesc(newValue, { json: true, wrap: false })}"`
      }
    }

    // 执行替换
    const beforeReplacement = originalJson.substring(0, startOffset)
    const afterReplacement = originalJson.substring(endOffset)
    const result = beforeReplacement + replacementContent + afterReplacement

    return { success: true, result }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

describe('non-string values support', () => {
  it('should find number value by key', () => {
    const json = `{
  "will": 0,
  "name": "test"
}`

    const snippet = findCodeSnippetByKey(json, 'will')
    expect(snippet).toBeTruthy()
    expect(snippet?.key).toBe('will')
    expect(snippet?.value).toBe('0')
  })

  it('should find boolean value by key', () => {
    const json = `{
  "enabled": true,
  "disabled": false
}`

    const snippet1 = findCodeSnippetByKey(json, 'enabled')
    expect(snippet1).toBeTruthy()
    expect(snippet1?.key).toBe('enabled')
    expect(snippet1?.value).toBe('true')

    const snippet2 = findCodeSnippetByKey(json, 'disabled')
    expect(snippet2).toBeTruthy()
    expect(snippet2?.key).toBe('disabled')
    expect(snippet2?.value).toBe('false')
  })

  it('should find null value by key', () => {
    const json = `{
  "data": null,
  "name": "test"
}`

    const snippet = findCodeSnippetByKey(json, 'data')
    expect(snippet).toBeTruthy()
    expect(snippet?.key).toBe('data')
    expect(snippet?.value).toBe('null')
  })

  it('should sync number value correctly', () => {
    const originalJson = `{
  "will": 0,
  "name": "test"
}`
    const newValue = '42'

    const result = simulateNonStringSync(originalJson, 'will', newValue)
    expect(result.success).toBe(true)
    expect(result.result).toContain('"will": 42')
  })

  it('should sync boolean value correctly', () => {
    const originalJson = `{
  "enabled": false,
  "name": "test"
}`
    const newValue = 'true'

    const result = simulateNonStringSync(originalJson, 'enabled', newValue)
    expect(result.success).toBe(true)
    expect(result.result).toContain('"enabled": true')
  })

  it('should convert number to string when content is not numeric', () => {
    const originalJson = `{
  "will": 0,
  "name": "test"
}`
    const newValue = 'hello world'

    const result = simulateNonStringSync(originalJson, 'will', newValue)
    expect(result.success).toBe(true)
    expect(result.result).toContain('"will": "hello world"')
  })

  it('should handle complex object values', () => {
    const json = `{
  "config": {"debug": true},
  "name": "test"
}`

    const snippet = findCodeSnippetByKey(json, 'config')
    expect(snippet).toBeTruthy()
    expect(snippet?.key).toBe('config')
    expect(snippet?.value).toBe('{"debug": true}')
  })

  it('should handle array values', () => {
    const json = `{
  "items": [1, 2, 3],
  "name": "test"
}`

    const snippet = findCodeSnippetByKey(json, 'items')
    expect(snippet).toBeTruthy()
    expect(snippet?.key).toBe('items')
    expect(snippet?.value).toBe('[1, 2, 3]')
  })

  it('should handle the original user case', () => {
    const originalJson = `{
  "adapter": "console.log('hello world');",
  "code": "const adapter = require('./adapter');",
  "will": 0
}`

    // 测试能否找到will键
    const snippet = findCodeSnippetByKey(originalJson, 'will')
    expect(snippet).toBeTruthy()
    expect(snippet?.key).toBe('will')
    expect(snippet?.value).toBe('0')

    // 测试同步功能
    const result = simulateNonStringSync(originalJson, 'will', '123')
    expect(result.success).toBe(true)
    expect(result.result).toContain('"will": 123')
  })
})
