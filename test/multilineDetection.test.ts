import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { Position, TextDocument, workspace, Uri } from 'vscode'

describe('multiline JavaScript detection', () => {
  let detector: CodeDetector

  beforeEach(() => {
    detector = new CodeDetector()
    detector.updateConfiguration()
  })

  it('should detect multiline JavaScript with escaped newlines', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'example/test-multiline-detection.json')
    const document = await workspace.openTextDocument(uri)

    const result = detector.detectJavaScriptAtPosition(document, new Position(1, 20))

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('expression')
    expect(result?.code).toContain('try {')
    expect(result?.code).toContain('payload.data.items.map')
    expect(result?.code).toContain('catch (e)')
  })

  it('should detect all JavaScript blocks including multiline ones', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'example/test-multiline-all-blocks.json')
    const document = await workspace.openTextDocument(uri)

    const blocks = detector.detectAllJavaScriptBlocks(document)

    expect(blocks).toHaveLength(3)

    // Check adaptor field
    const adaptorBlock = blocks.find(b => b.fieldName === 'adaptor')
    expect(adaptorBlock).toBeDefined()
    expect(adaptorBlock?.code).toBe('function test() { console.log(\'Hello World\'); return true; }')

    // Check expression field (multiline)
    const expressionBlock = blocks.find(b => b.fieldName === 'expression')
    expect(expressionBlock).toBeDefined()
    expect(expressionBlock?.code).toContain('try {')
    expect(expressionBlock?.code).toContain('payload.data.items.map')
    expect(expressionBlock?.code).toContain('catch (e)')

    // Check script field
    const scriptBlock = blocks.find(b => b.fieldName === 'script')
    expect(scriptBlock).toBeDefined()
    expect(scriptBlock?.code).toBe('const x = 1 + 1; console.log(x);')
  })

  it('should handle complex escaped characters in multiline code', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'example/test-complex-escaped.json')
    const document = await workspace.openTextDocument(uri)

    const result = detector.detectJavaScriptAtPosition(document, new Position(1, 20))

    expect(result).not.toBeNull()
    expect(result?.code).toContain('Hello\\nWorld')
    expect(result?.code).toContain('/\\d+/g')
  })
})