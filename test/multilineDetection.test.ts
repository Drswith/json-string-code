import { beforeEach, describe, expect, it } from 'vitest'
import { JsonJsDetector } from '../src/jsonJsDetector'
import { Position, TextDocument } from './vscode-mock'

describe('multiline JavaScript detection', () => {
  let detector: JsonJsDetector

  beforeEach(() => {
    detector = new JsonJsDetector()
    detector.updateConfiguration()
  })

  it('should detect multiline JavaScript with escaped newlines', () => {
    const jsonContent = `{
  "adaptor2": "try {\\n  let result = payload.data.items.map(el => {\\n    return {\\n      label: el.merchantName + ' - ' + el.merchantNo,\\n      value: el.merchantNo\\n    }\\n  })\\n  return {\\n    ...payload,\\n    data: {\\n      items: result\\n    }\\n  }\\n}\\ncatch (e) {\\n  console.error(e)\\n  return payload\\n}\\n"
}`
    const document = new TextDocument(jsonContent)

    const result = detector.detectJavaScriptAtPosition(document, new Position(1, 15))

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor2')
    expect(result?.code).toContain('try {')
    expect(result?.code).toContain('payload.data.items.map')
    expect(result?.code).toContain('catch (e)')
  })

  it('should detect all JavaScript blocks including multiline ones', () => {
    const jsonContent = `{
  "adaptor": "function test() { console.log('Hello World'); return true; }",
  "adaptor2": "try {\\n  let result = payload.data.items.map(el => {\\n    return {\\n      label: el.merchantName + ' - ' + el.merchantNo,\\n      value: el.merchantNo\\n    }\\n  })\\n  return {\\n    ...payload,\\n    data: {\\n      items: result\\n    }\\n  }\\n}\\ncatch (e) {\\n  console.error(e)\\n  return payload\\n}\\n",
  "script": "const x = 1 + 1; console.log(x);",
  "name": "test"
}`
    const document = new TextDocument(jsonContent)

    const blocks = detector.detectAllJavaScriptBlocks(document)

    expect(blocks).toHaveLength(3)

    // Check adaptor field
    const adaptorBlock = blocks.find(b => b.fieldName === 'adaptor')
    expect(adaptorBlock).toBeDefined()
    expect(adaptorBlock?.code).toBe('function test() { console.log(\'Hello World\'); return true; }')

    // Check adaptor2 field (multiline)
    const adaptor2Block = blocks.find(b => b.fieldName === 'adaptor2')
    expect(adaptor2Block).toBeDefined()
    expect(adaptor2Block?.code).toContain('try {')
    expect(adaptor2Block?.code).toContain('payload.data.items.map')
    expect(adaptor2Block?.code).toContain('catch (e)')

    // Check script field
    const scriptBlock = blocks.find(b => b.fieldName === 'script')
    expect(scriptBlock).toBeDefined()
    expect(scriptBlock?.code).toBe('const x = 1 + 1; console.log(x);')
  })

  it('should handle complex escaped characters in multiline code', () => {
    const jsonContent = `{
  "adaptor2": "function complex() {\\n  const str = 'Hello\\\\nWorld';\\n  const regex = /\\\\d+/g;\\n  return str.replace(regex, '');\\n}"
}`
    const document = new TextDocument(jsonContent)

    const result = detector.detectJavaScriptAtPosition(document, new Position(1, 15))

    expect(result).not.toBeNull()
    expect(result?.code).toContain('Hello\\nWorld')
    expect(result?.code).toContain('/\\d+/g')
  })
})