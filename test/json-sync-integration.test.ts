import jsesc from 'jsesc'
import { describe, expect, it } from 'vitest'

// 模拟完整的JSON同步流程
function simulateJsonSync(originalJson: string, key: string, newValue: string): string {
  // 1. 解析原始JSON
  const parsed = JSON.parse(originalJson)

  // 2. 直接设置新值（不需要额外转义，JSON.stringify会处理）
  parsed[key] = newValue

  // 3. 重新序列化
  return JSON.stringify(parsed, null, 2)
}

// 模拟直接替换字符串值的方式（当前实现）
function simulateDirectReplace(originalJson: string, key: string, newValue: string): string {
  // 转义新值
  const escapedValue = jsesc(newValue, {
    json: true,
    wrap: false,
  })

  // 查找并替换对应键的值
  const regex = new RegExp(`("${key}"\\s*:\\s*")([^"]*(?:\\\\.[^"]*)*)(")`)
  return originalJson.replace(regex, `$1${escapedValue}$3`)
}

describe('json同步集成测试', () => {
  const originalJson = `{
  "adapter": "const adapter = require('./adapter');",
  "code": "const code = 'hello';",
  "script": "console.log('test');"
}`

  it('should handle simple code replacement', () => {
    const newValue = 'const newAdapter = require(\'./new-adapter\');'
    const result = simulateJsonSync(originalJson, 'adapter', newValue)

    // 验证结果是合法的JSON
    expect(() => JSON.parse(result)).not.toThrow()

    const parsed = JSON.parse(result)
    expect(parsed.adapter).toBe(newValue)
  })

  it('should handle code with quotes', () => {
    const newValue = 'const message = "Hello, world!";\nconsole.log(message);'
    const result = simulateJsonSync(originalJson, 'code', newValue)

    // 验证结果是合法的JSON
    expect(() => JSON.parse(result)).not.toThrow()

    const parsed = JSON.parse(result)
    expect(parsed.code).toBe(newValue)
  })

  it('should handle multiline code with various quotes', () => {
    const newValue = `try {
  const adapter = require('./adapter');
  console.log("Adapter loaded successfully");
} catch (error) {
  console.error('Error loading adapter:', error);
}`

    const result = simulateJsonSync(originalJson, 'script', newValue)

    // 验证结果是合法的JSON
    expect(() => JSON.parse(result)).not.toThrow()

    const parsed = JSON.parse(result)
    expect(parsed.script).toBe(newValue)
  })

  it('should handle the problematic case from user report', () => {
    const problematicValue = `try { 
 const adapter = require('./adapter');
 } catch (error) { console.error('Error loading adapter:', error); }
`

    const result = simulateJsonSync(originalJson, 'adapter', problematicValue)

    // 验证结果是合法的JSON
    expect(() => JSON.parse(result)).not.toThrow()

    const parsed = JSON.parse(result)
    expect(parsed.adapter).toBe(problematicValue)
  })

  it('should compare direct replace vs full parse approach', () => {
    const newValue = 'const test = "hello \\"world\\"";'

    const fullParseResult = simulateJsonSync(originalJson, 'code', newValue)
    const directReplaceResult = simulateDirectReplace(originalJson, 'code', newValue)

    // 两种方法都应该产生合法的JSON
    expect(() => JSON.parse(fullParseResult)).not.toThrow()
    expect(() => JSON.parse(directReplaceResult)).not.toThrow()

    // 解析后的值应该相同
    const fullParsed = JSON.parse(fullParseResult)
    const directParsed = JSON.parse(directReplaceResult)
    expect(fullParsed.code).toBe(newValue)
    expect(directParsed.code).toBe(newValue)
  })
})
