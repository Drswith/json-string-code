import { beforeEach, describe, expect, it } from 'vitest'
import { JsonJsHoverProvider } from '../src/hoverProvider'
import { JsonJsDetector } from '../src/jsonJsDetector'
import { Position, TextDocument } from './vscode-mock'

// 测试语言检测功能
describe('language Detection', () => {
  let detector: JsonJsDetector
  let hoverProvider: JsonJsHoverProvider
  let testDocument: TextDocument

  beforeEach(() => {
    detector = new JsonJsDetector()
    hoverProvider = new JsonJsHoverProvider(detector)
  })

  describe('detectLanguage function', () => {
    // 从示例配置文件中获取的测试数据
    const testCases = [
      {
        key: 'pythonCode',
        value: 'def hello():\n    print(\'Hello World\')',
        expectedLanguage: 'python',
        description: 'Python代码检测'
      },
      {
        key: 'sqlQuery',
        value: 'SELECT * FROM users WHERE active = 1',
        expectedLanguage: 'sql',
        description: 'SQL查询检测'
      },
      {
        key: 'htmlContent',
        value: '<div>Hello World</div>',
        expectedLanguage: 'html',
        description: 'HTML内容检测'
      },
      {
        key: 'cssStyles',
        value: '.container { margin: 0 auto; }',
        expectedLanguage: 'css',
        description: 'CSS样式检测'
      },
      {
        key: 'yamlConfig',
        value: 'name: example\nversion: 1.0',
        expectedLanguage: 'yaml',
        description: 'YAML配置检测'
      },
      {
        key: 'markdownText',
        value: '# Hello\n\nThis is **bold** text.',
        expectedLanguage: 'markdown',
        description: 'Markdown文本检测'
      },
      {
        key: 'xmlData',
        value: '<?xml version=\'1.0\'?>\n<root><item>value</item></root>',
        expectedLanguage: 'xml',
        description: 'XML数据检测'
      },
      {
        key: 'plainText',
        value: 'This is just plain text without any special formatting.',
        expectedLanguage: 'javascript', // 默认语言
        description: '普通文本默认为JavaScript'
      },
      {
        key: 'emptyString',
        value: '',
        expectedLanguage: 'javascript', // 默认语言
        description: '空字符串默认为JavaScript'
      }
    ]

    testCases.forEach(({ key, value, expectedLanguage, description }) => {
      it(`should detect ${expectedLanguage} for ${description}`, () => {
        // 创建包含测试数据的JSON文档
        const testJson = JSON.stringify({ [key]: value }, null, 2)
        testDocument = new TextDocument(testJson)
        
        // 查找字段位置
        const content = testDocument.getText()
        const fieldIndex = content.indexOf(`"${key}"`)
        expect(fieldIndex).toBeGreaterThan(-1)
        
        const position = testDocument.positionAt(fieldIndex + key.length + 1)
        
        // 获取hover信息
        const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
        
        if (hover && hover.contents && hover.contents.length > 0) {
          const hoverContent = hover.contents[0] as any
          if (hoverContent.value) {
            // 检查代码块是否使用了正确的语言标识符
            expect(hoverContent.value).toContain(`\`\`\`${expectedLanguage}`)
          }
        }
      })
    })

    // 测试新增的语言检测功能
    const additionalTestCases = [
      {
        key: 'javaCode',
        value: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
        expectedLanguage: 'java',
        description: 'Java代码检测'
      },
      {
        key: 'phpCode',
        value: '<?php\necho "Hello World";\n$name = "test";\n?>',
        expectedLanguage: 'php',
        description: 'PHP代码检测'
      },
      {
        key: 'shellScript',
        value: '#!/bin/bash\necho "Hello World"\nls -la',
        expectedLanguage: 'shellscript',
        description: 'Shell脚本检测'
      },
      {
        key: 'jsonData',
        value: '{"name": "test", "value": 123}',
        expectedLanguage: 'json',
        description: 'JSON数据检测'
      },
      {
        key: 'dockerfile',
        value: 'FROM node:16\nWORKDIR /app\nCOPY package.json .\nRUN npm install',
        expectedLanguage: 'dockerfile',
        description: 'Dockerfile检测'
      },
      {
        key: 'goCode',
        value: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}',
        expectedLanguage: 'go',
        description: 'Go代码检测'
      },
      {
        key: 'rustCode',
        value: 'fn main() {\n    println!("Hello World");\n    let mut x = 5;\n}',
        expectedLanguage: 'rust',
        description: 'Rust代码检测'
      },
      {
        key: 'cCode',
        value: '#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}',
        expectedLanguage: 'c',
        description: 'C代码检测'
      },
      {
        key: 'cppCode',
        value: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}',
        expectedLanguage: 'cpp',
        description: 'C++代码检测'
      }
    ]

    additionalTestCases.forEach(({ key, value, expectedLanguage, description }) => {
      it(`should detect ${expectedLanguage} for ${description}`, () => {
        // 创建包含测试数据的JSON文档
        const testJson = JSON.stringify({ [key]: value }, null, 2)
        testDocument = new TextDocument(testJson)
        
        // 查找字段位置
        const content = testDocument.getText()
        const fieldIndex = content.indexOf(`"${key}"`)
        expect(fieldIndex).toBeGreaterThan(-1)
        
        const position = testDocument.positionAt(fieldIndex + key.length + 1)
        
        // 获取hover信息
        const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
        
        if (hover && hover.contents && hover.contents.length > 0) {
          const hoverContent = hover.contents[0] as any
          if (hoverContent.value) {
            // 检查代码块是否使用了正确的语言标识符
            expect(hoverContent.value).toContain(`\`\`\`${expectedLanguage}`)
          }
        }
      })
    })

    // 测试基于内容的语言检测（不依赖键名）
    it('should detect language based on content patterns', () => {
      const contentBasedTests = [
        {
          value: 'function test() { return true; }',
          expectedLanguage: 'javascript',
          description: 'JavaScript函数'
        },
        {
          value: 'const arrow = () => { console.log("test"); }',
          expectedLanguage: 'javascript',
          description: 'JavaScript箭头函数'
        },
        {
          value: 'import React from "react"',
          expectedLanguage: 'javascript',
          description: 'JavaScript导入语句'
        },
        {
          value: 'def calculate(x, y):\n    return x + y',
          expectedLanguage: 'python',
          description: 'Python函数定义'
        },
        {
          value: 'SELECT name, email FROM users ORDER BY created_at DESC',
          expectedLanguage: 'sql',
          description: 'SQL查询语句'
        }
      ]

      contentBasedTests.forEach(({ value, expectedLanguage, description }) => {
        const testJson = JSON.stringify({ randomKey: value }, null, 2)
        testDocument = new TextDocument(testJson)
        
        const content = testDocument.getText()
        const fieldIndex = content.indexOf('"randomKey"')
        const position = testDocument.positionAt(fieldIndex + 'randomKey'.length + 1)
        
        const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
        
        if (hover && hover.contents && hover.contents.length > 0) {
          const hoverContent = hover.contents[0] as any
          if (hoverContent.value) {
            expect(hoverContent.value).toContain(`\`\`\`${expectedLanguage}`)
          }
        }
      })
    })
  })

  describe('edge cases', () => {
    it('should handle null values gracefully', () => {
      const testJson = JSON.stringify({ nullValue: null }, null, 2)
      testDocument = new TextDocument(testJson)
      
      const content = testDocument.getText()
      const fieldIndex = content.indexOf('"nullValue"')
      const position = testDocument.positionAt(fieldIndex + 'nullValue'.length + 1)
      
      const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
      
      // null值不应该触发hover
      expect(hover).toBeNull()
    })

    it('should handle numeric values gracefully', () => {
      const testJson = JSON.stringify({ numberValue: 42 }, null, 2)
      testDocument = new TextDocument(testJson)
      
      const content = testDocument.getText()
      const fieldIndex = content.indexOf('"numberValue"')
      const position = testDocument.positionAt(fieldIndex + 'numberValue'.length + 1)
      
      const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
      
      // 数值不应该触发hover
      expect(hover).toBeNull()
    })

    it('should handle boolean values gracefully', () => {
      const testJson = JSON.stringify({ booleanValue: true }, null, 2)
      testDocument = new TextDocument(testJson)
      
      const content = testDocument.getText()
      const fieldIndex = content.indexOf('"booleanValue"')
      const position = testDocument.positionAt(fieldIndex + 'booleanValue'.length + 1)
      
      const hover = hoverProvider.provideHover(testDocument, position, {} as any) as any
      
      // 布尔值不应该触发hover
      expect(hover).toBeNull()
    })
  })
})