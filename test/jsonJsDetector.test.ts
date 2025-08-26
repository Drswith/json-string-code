import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { TextDocument, workspace, Uri, Position } from 'vscode'

describe('jsonJsDetector', () => {
  let detector: CodeDetector
  let testDocument: TextDocument

  beforeEach(async () => {
    detector = new CodeDetector()
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-detector.json');
    testDocument = await workspace.openTextDocument(uri);
  })

  describe('detectAllJavaScriptBlocks', () => {
    it('should detect all JavaScript blocks in JSON', () => {
      const blocks = detector.detectAllJavaScriptBlocks(testDocument)

      expect(blocks).toHaveLength(3)

      // Check adaptor field
      expect(blocks[0].fieldName).toBe('adaptor')
      expect(blocks[0].code).toBe('function test() { console.log(\'Hello World\'); return true; }')

      // Check expression field
      expect(blocks[1].fieldName).toBe('expression')
      expect(blocks[1].code).toContain('payload.data.items.map')

      // Check script field
      expect(blocks[2].fieldName).toBe('script')
      expect(blocks[2].code).toBe('const x = 1 + 1; console.log(x);')
    })

    it('should return empty array for non-JavaScript content', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-simple.json')
      const document = await workspace.openTextDocument(uri)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(0)
    })

    it('should handle malformed JSON gracefully', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-malformed.json')
      const document = await workspace.openTextDocument(uri)
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
    it('should handle configuration updates', async () => {
      // Test that detector works with default configuration
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-config.json')
      const document = await workspace.openTextDocument(uri)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      // Should detect adaptor field by default
      expect(blocks).toHaveLength(1)
      expect(blocks[0].fieldName).toBe('adaptor')
    })
  })

  describe('edge cases', () => {
    it('should handle empty JSON', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-empty.json')
      const document = await workspace.openTextDocument(uri)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(0)
    })

    it('should handle nested objects', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-nested.json')
      const document = await workspace.openTextDocument(uri)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      expect(blocks).toHaveLength(1)
      expect(blocks[0].fieldName).toBe('adaptor')
      expect(blocks[0].code).toBe('function nested() { return \'nested\'; }')
    })

    it('should handle arrays with JavaScript', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-json-js-array.json')
      const document = await workspace.openTextDocument(uri)
      const blocks = detector.detectAllJavaScriptBlocks(document)

      // Should not detect array elements as they don't match field names
      expect(blocks).toHaveLength(0)
    })
  })
})