import jsesc from 'jsesc'
import { describe, expect, it } from 'vitest'

// 模拟TempFileManager中的escapeJsonString方法
function escapeJsonString(str: string): string {
  return jsesc(str.toString(), {
    json: true, // 确保输出是有效的JSON
    wrap: false, // 不包含外层引号，因为我们只替换引号内的内容
  })
}

describe('escapeJsonString', () => {
  it('should handle simple strings', () => {
    const input = 'hello world'
    const result = escapeJsonString(input)
    expect(result).toBe('hello world')
  })

  it('should escape double quotes', () => {
    const input = 'hello "world"'
    const result = escapeJsonString(input)
    expect(result).toBe('hello \\"world\\"')
  })

  it('should escape newlines', () => {
    const input = 'line1\nline2'
    const result = escapeJsonString(input)
    expect(result).toBe('line1\\nline2')
  })

  it('should escape backslashes', () => {
    const input = 'path\\to\\file'
    const result = escapeJsonString(input)
    expect(result).toBe('path\\\\to\\\\file')
  })

  it('should handle code snippets with special characters', () => {
    const input = 'const code = require(\'./code\');\nconsole.log(code);\n'
    const result = escapeJsonString(input)
    console.log('Input:', JSON.stringify(input))
    console.log('Result:', JSON.stringify(result))
    // 验证结果是有效的JSON字符串内容
    expect(() => JSON.parse(`"${result}"`)).not.toThrow()
  })

  it('should handle JavaScript code with require statements', () => {
    const input = `const code = require('./code');
console.log(code);
`
    const result = escapeJsonString(input)
    console.log('JS Code Input:', JSON.stringify(input))
    console.log('JS Code Result:', JSON.stringify(result))
    // 验证结果可以被正确解析
    expect(() => JSON.parse(`"${result}"`)).not.toThrow()
    const parsed = JSON.parse(`"${result}"`)
    expect(parsed).toBe(input)
  })

  it('should compare with JSON.stringify approach', () => {
    const testCases = [
      'simple text',
      'text with "quotes"',
      'text with\nnewlines',
      'text with\ttabs',
      'const code = require(\'./code\');\nconsole.log(code);\n',
      'path\\to\\file',
    ]

    testCases.forEach((input) => {
      const jsescResult = escapeJsonString(input)
      const jsonStringifyResult = JSON.stringify(input).slice(1, -1)

      console.log(`\nTesting: ${JSON.stringify(input)}`)
      console.log(`jsesc result: ${JSON.stringify(jsescResult)}`)
      console.log(`JSON.stringify result: ${JSON.stringify(jsonStringifyResult)}`)

      // 两种方法都应该产生有效的JSON字符串内容
      expect(() => JSON.parse(`"${jsescResult}"`)).not.toThrow()
      expect(() => JSON.parse(`"${jsonStringifyResult}"`)).not.toThrow()

      // 解析后的结果应该相同
      const jsescParsed = JSON.parse(`"${jsescResult}"`)
      const jsonStringifyParsed = JSON.parse(`"${jsonStringifyResult}"`)
      expect(jsescParsed).toBe(input)
      expect(jsonStringifyParsed).toBe(input)
    })
  })
})
