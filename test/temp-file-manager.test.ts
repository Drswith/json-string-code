import jsesc from 'jsesc'
import { describe, expect, it } from 'vitest'

// 模拟escapeJsonString函数的实现
function escapeJsonString(str: string): string {
  return jsesc(str, {
    json: true,
    wrap: true,
  })
}

// 简化版本，不使用jsesc的wrap选项
function escapeJsonStringSimple(str: string): string {
  return JSON.stringify(str).slice(1, -1) // 移除外层引号
}

describe('escapeJsonString', () => {
  it('should handle basic strings', () => {
    const input = 'hello world'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('hello world')
  })

  it('should escape double quotes', () => {
    const input = 'hello "world"'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('hello \\"world\\"')
  })

  it('should escape newlines', () => {
    const input = 'line1\nline2'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('line1\\nline2')
  })

  it('should escape backslashes', () => {
    const input = 'path\\to\\file'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('path\\\\to\\\\file')
  })

  it('should handle code snippets with quotes', () => {
    const input = 'const adapter = require("./adapter");'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('const adapter = require(\\"./adapter\\");')
  })

  it('should handle multiline code', () => {
    const input = 'try {\n  const adapter = require("./adapter");\n} catch (error) {\n  console.error("Error:", error);\n}'
    const result = escapeJsonStringSimple(input)
    expect(result).toBe('try {\\n  const adapter = require(\\"./adapter\\");\\n} catch (error) {\\n  console.error(\\"Error:\\", error);\\n}')
  })

  it('should produce valid JSON when wrapped in quotes', () => {
    const input = 'const code = "hello world";'
    const result = escapeJsonStringSimple(input)
    const jsonString = `"${result}"`

    // 测试生成的JSON字符串是否可以正确解析
    expect(() => JSON.parse(jsonString)).not.toThrow()
    expect(JSON.parse(jsonString)).toBe(input)
  })

  it('should handle the problematic case from user', () => {
    const input = 'try { \n const adapter = require(\'./adapter\');\n } catch (error) { console.error(\'Error loading adapter:\', error); }\n'
    const result = escapeJsonStringSimple(input)
    const jsonString = `"${result}"`

    // 确保生成的JSON是合法的
    expect(() => JSON.parse(jsonString)).not.toThrow()
    expect(JSON.parse(jsonString)).toBe(input)
  })
})

describe('jsesc vs JSON.stringify comparison', () => {
  it('should compare jsesc with JSON.stringify for basic cases', () => {
    const testCases = [
      'hello world',
      'hello "world"',
      'line1\nline2',
      'path\\to\\file',
      'const code = "test";',
    ]

    testCases.forEach((input) => {
      // jsesc with json: true already includes quotes
      const jsescResult = jsesc(input, { json: true })
      const jsonStringifyResult = JSON.stringify(input)

      // 两种方法都应该产生可解析的JSON
      expect(() => JSON.parse(jsescResult)).not.toThrow()
      expect(() => JSON.parse(jsonStringifyResult)).not.toThrow()

      // 解析后的结果应该相同
      expect(JSON.parse(jsescResult)).toBe(input)
      expect(JSON.parse(jsonStringifyResult)).toBe(input)
    })
  })

  it('should test jsesc without wrap option', () => {
    const input = 'const code = "test";'

    // jsesc without wrap - 这是我们需要的
    const jsescNoWrap = jsesc(input, { json: true, wrap: false })
    const jsonStringifyNoWrap = JSON.stringify(input).slice(1, -1)

    // 测试包装后的JSON是否有效
    expect(() => JSON.parse(`"${jsescNoWrap}"`)).not.toThrow()
    expect(() => JSON.parse(`"${jsonStringifyNoWrap}"`)).not.toThrow()

    // 解析后的结果应该相同
    expect(JSON.parse(`"${jsescNoWrap}"`)).toBe(input)
    expect(JSON.parse(`"${jsonStringifyNoWrap}"`)).toBe(input)
  })
})
