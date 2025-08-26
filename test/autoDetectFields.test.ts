import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { TextDocument, workspace, Uri } from 'vscode'

describe('AutoDetectFields Configuration', () => {
  let codeDetector: CodeDetector
  let document: TextDocument

  beforeEach(async () => {
    codeDetector = new CodeDetector()
    const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-auto-detect-fields.json');
    document = await workspace.openTextDocument(uri);
  })

  describe('Default Configuration', () => {
    it('should use default autoDetectFields when configuration is not set', () => {
      // 模拟默认配置
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return defaultValue // 返回默认值
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)


      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // 应该检测到默认字段中的 JavaScript 代码
      expect(blocks.length).toBeGreaterThan(0)
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('adaptor')
      expect(fieldNames).toContain('script')
      expect(fieldNames).toContain('code')
      expect(fieldNames).toContain('expression')
    })

    it('should detect code blocks in default fields', () => {
      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // 应该检测到默认字段中的代码
      expect(blocks.length).toBeGreaterThan(0)
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('adaptor')
      expect(fieldNames).toContain('script')
      expect(fieldNames).toContain('code')
      expect(fieldNames).toContain('expression')
    })
  })

  describe('Custom Configuration', () => {
    it('should only detect fields specified in autoDetectFields', () => {
      // 模拟自定义配置，只检测 'script' 和 'code' 字段
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['script', 'code']
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('script')
      expect(fieldNames).toContain('code')
      expect(fieldNames).not.toContain('adaptor')
      expect(fieldNames).not.toContain('expression')
    })

    it('should detect custom fields when added to autoDetectFields', () => {
      // 模拟自定义配置，添加 'customField' 到检测列表
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['adaptor', 'script', 'code', 'expression', 'customField']
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      // 使用 detectAllCodeBlocks 而不是 detectAllJavaScriptBlocks，因为 customField 不一定是 JavaScript
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('customField')
      // 即使不在 autoDetectFields 中，包含 'code' 关键词的字段也会被检测到
      expect(fieldNames).toContain('sqlQuery')
      expect(fieldNames).toContain('htmlTemplate')
    })

    it('should not detect fields not in autoDetectFields (except code-related keywords)', () => {
      // 模拟配置，只检测 'script' 字段
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['script']
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('script')
      expect(fieldNames).not.toContain('adaptor')
      expect(fieldNames).not.toContain('expression')
      expect(fieldNames).not.toContain('customField')
      // 'code' 字段包含 'code' 关键词，所以会被检测到
      expect(fieldNames).toContain('code')
      // 包含代码相关关键词的字段也会被检测到
      expect(fieldNames).toContain('sqlQuery')
      expect(fieldNames).toContain('htmlTemplate')
    })
  })

  describe('Code Field Pattern Matching', () => {
    it('should detect fields with code-related keywords when autoDetectFields has values', () => {
      // 模拟配置，autoDetectFields 不为空，应该检测包含关键词的字段
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['adaptor'] // 不为空
          }
          if (key === 'enableAutoDetection') {
            return true
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // 应该检测到包含关键词的字段和autoDetectFields中的字段
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('sqlQuery')
      expect(fieldNames).toContain('adaptor')
    })

    it('should not detect fields with keywords when autoDetectFields is empty but enableAutoDetection is true', () => {
      // 模拟配置，enableAutoDetection为true但autoDetectFields为空，不应该检测关键词字段
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return []
          }
          if (key === 'enableAutoDetection') {
            return true
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // 不应该检测到任何字段
      expect(blocks.length).toBe(0)
    })

    it('should detect HTML and SQL fields when autoDetectFields contains relevant fields', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['sqlQuery', 'htmlTemplate']
          }
          if (key === 'enableAutoDetection') {
            return true
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('sqlQuery')
      expect(fieldNames).toContain('htmlTemplate')
    })
  })

  describe('Configuration Scenarios', () => {
    it('should not detect any fields when enableAutoDetection is false (scenario 1)', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['adaptor', 'script'] // 不为空
          }
          if (key === 'enableAutoDetection') {
            return false
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // enableAutoDetection为false时，无论autoDetectFields是否为空，均不进行检测
      expect(blocks.length).toBe(0)
    })

    it('should not detect any fields when enableAutoDetection is true but autoDetectFields is empty (scenario 2)', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return []
          }
          if (key === 'enableAutoDetection') {
            return true
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // enableAutoDetection为true但autoDetectFields为空时，不进行检测
      expect(blocks.length).toBe(0)
    })

    it('should detect fields when enableAutoDetection is true and autoDetectFields is not empty (scenario 3)', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['adaptor']
          }
          if (key === 'enableAutoDetection') {
            return true
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      const blocks = codeDetector.detectAllCodeBlocks(document)
      
      // enableAutoDetection为true且autoDetectFields不为空时，进行检测
      expect(blocks.length).toBeGreaterThan(0)
      const fieldNames = blocks.map(block => block.fieldName)
      expect(fieldNames).toContain('adaptor')
    })
  })

  describe('Position-based Detection', () => {
    it('should respect autoDetectFields for position-based JavaScript detection', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['script']
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      
      // 在 'script' 字段中的位置
      const scriptPosition = document.positionAt(document.getText().indexOf('function test'))
      const scriptBlock = codeDetector.detectCodeAtPosition(document, scriptPosition)
      expect(scriptBlock).not.toBeNull()
      expect(scriptBlock?.fieldName).toBe('script')
      
      // 在 'adaptor' 字段中的位置（不在配置中）
      const adaptorPosition = document.positionAt(document.getText().indexOf('console.log'))
      const adaptorBlock = codeDetector.detectCodeAtPosition(document, adaptorPosition)
      expect(adaptorBlock).toBeNull()
    })

    it('should respect autoDetectFields for position-based code detection', () => {
      const mockGetConfiguration = vi.mocked(workspace.getConfiguration)
      mockGetConfiguration.mockReturnValue({
        get: (key: string, defaultValue?: any) => {
          if (key === 'autoDetectFields') {
            return ['code']
          }
          return defaultValue
        },
        has: vi.fn(),
        inspect: vi.fn(),
        update: vi.fn()
      } as any)

      codeDetector.updateConfiguration()
      
      // 在 'code' 字段中的位置
      const codePosition = document.positionAt(document.getText().indexOf('const x = 42'))
      const codeBlock = codeDetector.detectCodeAtPosition(document, codePosition)
      expect(codeBlock).not.toBeNull()
      expect(codeBlock?.fieldName).toBe('code')
      
      // 在 'sqlQuery' 字段中的位置（包含 sql 关键词，应该被检测到）
      const sqlPosition = document.positionAt(document.getText().indexOf('SELECT * FROM'))
      const sqlBlock = codeDetector.detectCodeAtPosition(document, sqlPosition)
      expect(sqlBlock).not.toBeNull()
      expect(sqlBlock?.fieldName).toBe('sqlQuery')
    })
  })
})