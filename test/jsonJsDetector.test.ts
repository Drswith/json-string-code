import { beforeEach, describe, expect, it } from 'vitest'
import { JsonJsDetector } from '../src/jsonJsDetector'
import { Position, TextDocument } from './vscode-mock'

describe('jsonJsDetector', () => {
  let detector: JsonJsDetector
  let testDocument: TextDocument

  beforeEach(() => {
    detector = new JsonJsDetector()
    const testJson = `{
  "adaptor": "function test() { console.log('Hello World'); return true; }",
  "adaptor2": "try {\\n  let result = payload.data.items.map(el => {\\n    return {\\n      label: el.merchantName + ' - ' + el.merchantNo,\\n      value: el.merchantNo\\n    }\\n  })\\n  return {\\n    ...payload,\\n    data: {\\n      items: result\\n    }\\n  }\\n}\\ncatch (e) {\\n  console.error(e)\\n  return payload\\n}\\n",
  "script": "const x = 1 + 1; console.log(x);",
  "name": "test"
}`
    testDocument = new TextDocument(testJson)
  })

  describe('detectAllJavaScriptBlocks', () => {
    it('should detect all JavaScript blocks in JSON', () => {
      const blocks = detector.detectAllJavaScriptBlocks(testDocument)

      expect(blocks).toHaveLength(3)

      // Check adaptor field
      expect(blocks[0].fieldName).toBe('adaptor')
      expect(blocks[0].code).toBe('function test() { console.log(\'Hello World\'); return true; }')

      // Check adaptor2 field
      expect(blocks[1].fieldName).toBe('adaptor2')
      expect(blocks[1].code).toContain('payload.data.items.map')

      // Check script field
      expect(blocks[2].fieldName).toBe('script')
      expect(blocks[2].code).toBe('const x = 1 + 1; console.log(x);')
    })

    it('should return empty array for JSON without JavaScript', () => {
      const simpleJson = `{
  "name": "test",
  "value": 123
}`
      const document = new TextDocument(simpleJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(0)
    })

    it('should handle malformed JSON gracefully', () => {
      const malformedJson = `{
  "adaptor": "function test() { return true; }",
  "invalid": 
}`
      const document = new TextDocument(malformedJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      // Should still detect the valid adaptor field using regex fallback
      expect(blocks.length).toBeGreaterThan(0)
      expect(blocks[0].fieldName).toBe('adaptor')
    })
  })

  describe('detectJavaScriptAtPosition', () => {
    it('should detect JavaScript at specific position', () => {
      // Position within the adaptor field value
      const position = new Position(1, 20) // Inside the function string
      const result = detector.detectJavaScriptAtPosition(testDocument, position)

      expect(result).not.toBeNull()
      expect(result?.fieldName).toBe('adaptor')
      expect(result?.code).toBe('function test() { console.log(\'Hello World\'); return true; }')
    })

    it('should return null for position outside JavaScript', () => {
      // Position in the "name" field
      const position = new Position(4, 10)
      const result = detector.detectJavaScriptAtPosition(testDocument, position)

      expect(result).toBeNull()
    })

    it('should return null for position in property name', () => {
      // Position in the property name "adaptor"
      const position = new Position(1, 5)
      const result = detector.detectJavaScriptAtPosition(testDocument, position)

      expect(result).toBeNull()
    })
  })

  describe('configuration', () => {
    it('should handle configuration updates', () => {
      // Test that detector works with default configuration
      const defaultJson = `{
  "adaptor": "console.log('test');"
}`
      const document = new TextDocument(defaultJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      // Should detect adaptor field by default
      expect(blocks).toHaveLength(1)
      expect(blocks[0].fieldName).toBe('adaptor')
    })
  })

  describe('edge cases', () => {
    it('should handle empty JSON', () => {
      const emptyJson = '{}'
      const document = new TextDocument(emptyJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(0)
    })

    it('should handle nested objects', () => {
      const nestedJson = `{
  "config": {
    "adaptor": "function nested() { return 'nested'; }"
  }
}`
      const document = new TextDocument(nestedJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(1)
      expect(blocks[0].fieldName).toBe('adaptor')
      expect(blocks[0].code).toBe('function nested() { return \'nested\'; }')
    })

    it('should handle arrays with JavaScript', () => {
      const arrayJson = `{
  "scripts": [
    "console.log('first');",
    "console.log('second');"
  ]
}`
      const document = new TextDocument(arrayJson)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      // Should not detect array elements as they don't match field names
      expect(blocks).toHaveLength(0)
    })
  })
})