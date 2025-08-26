import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { Position, TextDocument, workspace, Uri } from 'vscode'

describe('right click JavaScript detection', () => {
  let detector: CodeDetector

  beforeEach(() => {
    detector = new CodeDetector()
  })

  it('should detect JavaScript at cursor position', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside the JavaScript string
    const position = new Position(2, 20) // Inside the script field
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.code).toBe('console.log(\'Hello World\');')
    expect(result?.fieldName).toBe('script')
  })

  it('should return null when cursor is not in JavaScript code', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor outside JavaScript code
    const position = new Position(0, 5) // In the field name
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).toBeNull()
  })

  it('should handle nested JSON structures', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-nested.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor inside nested JavaScript
    const position = new Position(2, 30)
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should handle array elements with JavaScript', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-array.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(2, 25)
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should return null for non-JavaScript fields', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-non-js.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor in a regular string field (other field)
    const position = new Position(2, 15)
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).toBeNull()
  })

  it('should handle malformed JSON gracefully', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-malformed.json')
    const document = await workspace.openTextDocument(uri)

    // Position cursor in malformed JSON
    const position = new Position(1, 20)
    const result = detector.detectCodeAtPosition(document, position)

    // Should still detect JavaScript even in malformed JSON
    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
  })

  it('should detect JavaScript in adaptor field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-adaptor.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(1, 30)
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('adaptor')
    expect(result?.code).toBe('function test() { return \'hello\'; }')
  })

  it('should detect JavaScript in script field', async () => {
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-right-click-script.json')
    const document = await workspace.openTextDocument(uri)

    const position = new Position(1, 25)
    const result = detector.detectCodeAtPosition(document, position)

    expect(result).not.toBeNull()
    expect(result?.fieldName).toBe('script')
  })
})