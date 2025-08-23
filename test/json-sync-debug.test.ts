import jsesc from 'jsesc'
import * as jsonc from 'jsonc-parser'
import { describe, expect, it } from 'vitest'

// 模拟相关函数
function escapeJsonString(str: string): string {
  return jsesc(str.toString(), {
    json: true,
    wrap: false,
  })
}

function simulateJsonSync(originalJson: string, key: string, newContent: string): { success: boolean, result?: string, error?: string } {
  try {
    // 解析JSON找到目标键值对
    const tree = jsonc.parseTree(originalJson)
    if (!tree) {
      return { success: false, error: 'Failed to parse JSON' }
    }

    let targetNode: jsonc.Node | null = null

    function findNode(node: jsonc.Node): void {
      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length === 2) {
            const keyNode = child.children[0]
            const valueNode = child.children[1]

            if (keyNode.type === 'string' && keyNode.value === key && valueNode.type === 'string') {
              targetNode = valueNode
              return
            }
          }
        }
      }
    }

    findNode(tree)

    if (!targetNode) {
      return { success: false, error: `Key "${key}" not found` }
    }

    // 类型断言确保targetNode不为null
    const node = targetNode as jsonc.Node & { offset: number, length: number }

    // 模拟VSCode的字符串替换逻辑
    const startPos = node.offset + 1 // 跳过开始引号
    const endPos = node.offset + node.length - 1 // 跳过结束引号

    console.log(`Original JSON length: ${originalJson.length}`)
    console.log(`Target node offset: ${node.offset}, length: ${node.length}`)
    console.log(`Replace range: ${startPos} to ${endPos}`)
    console.log(`Original value: ${JSON.stringify(originalJson.substring(node.offset, node.offset + node.length))}`)
    console.log(`Content to replace: ${JSON.stringify(originalJson.substring(startPos, endPos))}`)

    // 转义新内容
    const escapedContent = escapeJsonString(newContent)
    console.log(`New content: ${JSON.stringify(newContent)}`)
    console.log(`Escaped content: ${JSON.stringify(escapedContent)}`)

    // 执行替换
    const result = originalJson.substring(0, startPos) + escapedContent + originalJson.substring(endPos)

    console.log(`Result JSON: ${JSON.stringify(result)}`)

    // 验证结果是否为有效JSON
    try {
      const parsed = JSON.parse(result)
      console.log(`Parsed successfully: ${JSON.stringify(parsed)}`)
      return { success: true, result }
    }
    catch (parseError) {
      return { success: false, error: `Invalid JSON after replacement: ${parseError}` }
    }
  }
  catch (error) {
    return { success: false, error: `Sync error: ${error}` }
  }
}

describe('jSON Sync Debug', () => {
  it('should handle simple string replacement', () => {
    const originalJson = `{
  "script": "console.log('hello');"
}`
    const newContent = 'console.log(\'world\');'

    const result = simulateJsonSync(originalJson, 'script', newContent)
    console.log('\n=== Simple String Test ===')
    console.log('Result:', result)

    expect(result.success).toBe(true)
    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle code with newlines', () => {
    const originalJson = `{
  "script": "const code = require('./code');\\nconsole.log(code);\\n"
}`
    const newContent = 'const code = require(\'./code\');\nconsole.log(code);\n'

    const result = simulateJsonSync(originalJson, 'script', newContent)
    console.log('\n=== Newlines Test ===')
    console.log('Result:', result)

    expect(result.success).toBe(true)
    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle code with quotes', () => {
    const originalJson = `{
  "script": "console.log(\\"hello world\\");"
}`
    const newContent = 'console.log("hello world");'

    const result = simulateJsonSync(originalJson, 'script', newContent)
    console.log('\n=== Quotes Test ===')
    console.log('Result:', result)

    expect(result.success).toBe(true)
    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
    }
  })

  it('should handle complex code snippet', () => {
    const originalJson = `{
  "script": "const code = require('./code');\\nconsole.log(code);\\n",
  "other": "value"
}`
    const newContent = `function test() {
  console.log("testing");
  return true;
}`

    const result = simulateJsonSync(originalJson, 'script', newContent)
    console.log('\n=== Complex Code Test ===')
    console.log('Result:', result)

    expect(result.success).toBe(true)
    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe(newContent)
      expect(parsed.other).toBe('value') // 确保其他字段不受影响
    }
  })

  it('should handle edge case with empty content', () => {
    const originalJson = `{
  "script": "console.log('test');"
}`
    const newContent = ''

    const result = simulateJsonSync(originalJson, 'script', newContent)
    console.log('\n=== Empty Content Test ===')
    console.log('Result:', result)

    expect(result.success).toBe(true)
    if (result.result) {
      const parsed = JSON.parse(result.result)
      expect(parsed.script).toBe('')
    }
  })
})
