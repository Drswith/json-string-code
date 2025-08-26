import { beforeEach, describe, expect, it } from 'vitest'
import { CodeDetector } from '../src/codeDetector'
import { TextDocument, workspace, Uri } from 'vscode'

// 测试语言检测功能
describe('language Detection', () => {
  let detector: CodeDetector

  beforeEach(() => {
    detector = new CodeDetector()
  })

  describe('detectLanguage function', () => {
    // 从示例配置文件中获取的测试数据
    const testCases = [
      {
        key: 'pythonCode',
        value: 'def hello():\n    print(\'Hello World\')',
        expectedLanguage: 'python',
        description: 'Python代码检测',
      },
      {
        key: 'sqlQuery',
        value: 'SELECT * FROM users WHERE active = 1',
        expectedLanguage: 'sql',
        description: 'SQL查询检测',
      },
      {
        key: 'htmlContent',
        value: '<div>Hello World</div>',
        expectedLanguage: 'html',
        description: 'HTML内容检测',
      },
      {
        key: 'cssStyles',
        value: '.container { margin: 0 auto; }',
        expectedLanguage: 'css',
        description: 'CSS样式检测',
      },
      {
        key: 'yamlConfig',
        value: 'name: example\nversion: 1.0',
        expectedLanguage: 'yaml',
        description: 'YAML配置检测',
      },
      {
        key: 'markdownText',
        value: '# Hello\n\nThis is **bold** text.',
        expectedLanguage: 'markdown',
        description: 'Markdown文本检测',
      },
      {
        key: 'xmlData',
        value: '<?xml version=\'1.0\'?>\n<root><item>value</item></root>',
        expectedLanguage: 'xml',
        description: 'XML数据检测',
      },
      {
        key: 'plainText',
        value: 'This is just plain text without any special formatting.',
        expectedLanguage: 'javascript', // 默认语言
        description: '普通文本默认为JavaScript',
      },
      {
        key: 'emptyString',
        value: '',
        expectedLanguage: 'javascript', // 默认语言
        description: '空字符串默认为JavaScript',
      },
    ]

    testCases.forEach(({ key, value, expectedLanguage, description }) => {
      it(`should detect ${expectedLanguage} for ${description}`, () => {
        const detectedLanguage = detector.detectLanguage(key, value)
        expect(detectedLanguage).toBe(expectedLanguage)
      })
    })

    // 测试新增的语言检测功能
    const additionalTestCases = [
      {
        key: 'javaCode',
        value: 'public class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello World");\n    }\n}',
        expectedLanguage: 'java',
        description: 'Java代码检测',
      },
      {
        key: 'phpCode',
        value: '<?php\necho "Hello World";\n$name = "test";\n?>',
        expectedLanguage: 'php',
        description: 'PHP代码检测',
      },
      {
        key: 'shellScript',
        value: '#!/bin/bash\necho "Hello World"\nls -la',
        expectedLanguage: 'shellscript',
        description: 'Shell脚本检测',
      },
      {
        key: 'jsonData',
        value: '{"name": "test", "value": 123}',
        expectedLanguage: 'json',
        description: 'JSON数据检测',
      },
      {
        key: 'dockerfile',
        value: 'FROM node:16\nWORKDIR /app\nCOPY package.json .\nRUN npm install',
        expectedLanguage: 'dockerfile',
        description: 'Dockerfile检测',
      },
      {
        key: 'goCode',
        value: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello World")\n}',
        expectedLanguage: 'go',
        description: 'Go代码检测',
      },
      {
        key: 'rustCode',
        value: 'fn main() {\n    println!("Hello World");\n    let mut x = 5;\n}',
        expectedLanguage: 'rust',
        description: 'Rust代码检测',
      },
      {
        key: 'cCode',
        value: '#include <stdio.h>\n\nint main() {\n    printf("Hello World");\n    return 0;\n}',
        expectedLanguage: 'c',
        description: 'C代码检测',
      },
      {
        key: 'cppCode',
        value: '#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}',
        expectedLanguage: 'cpp',
        description: 'C++代码检测',
      },
    ]

    additionalTestCases.forEach(({ key, value, expectedLanguage, description }) => {
      it(`should detect ${expectedLanguage} for ${description}`, () => {
        const detectedLanguage = detector.detectLanguage(key, value)
        expect(detectedLanguage).toBe(expectedLanguage)
      })
    })

    // 测试基于内容的语言检测（不依赖键名）
    it('should detect language based on content patterns', () => {
      const contentBasedTests = [
        {
          value: 'function test() { return true; }',
          expectedLanguage: 'javascript',
          description: 'JavaScript函数',
        },
        {
          value: 'const arrow = () => { console.log("test"); }',
          expectedLanguage: 'javascript',
          description: 'JavaScript箭头函数',
        },
        {
          value: 'import React from "react"',
          expectedLanguage: 'javascript',
          description: 'JavaScript导入语句',
        },
        {
          value: 'def calculate(x, y):\n    return x + y',
          expectedLanguage: 'python',
          description: 'Python函数定义',
        },
        {
          value: 'SELECT name, email FROM users ORDER BY created_at DESC',
          expectedLanguage: 'sql',
          description: 'SQL查询语句',
        },
      ]

      contentBasedTests.forEach(({ value, expectedLanguage, description }) => {
        const detectedLanguage = detector.detectLanguage('randomKey', value)
        expect(detectedLanguage).toBe(expectedLanguage)
      })
    })
  })

  describe('detectAllCodeBlocks function', () => {
    it('should detect multiple code blocks with correct languages', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-language-detection-multi.json')
      const testDocument = await workspace.openTextDocument(uri)
      
      const codeBlocks = detector.detectAllCodeBlocks(testDocument)
      
      expect(codeBlocks).toHaveLength(4)
      
      const languages = codeBlocks.map(block => block.language)
      expect(languages).toContain('python')
      expect(languages).toContain('sql')
      expect(languages).toContain('html')
      expect(languages).toContain('css')
    })

    it('should handle empty JSON document', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-language-detection-empty.json')
      const testDocument = await workspace.openTextDocument(uri)
      const codeBlocks = detector.detectAllCodeBlocks(testDocument)
      expect(codeBlocks).toHaveLength(0)
    })

    it('should handle JSON with non-string values', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-language-detection-mixed.json')
      const testDocument = await workspace.openTextDocument(uri)
      
      const codeBlocks = detector.detectAllCodeBlocks(testDocument)
      
      // 只应该检测到一个代码块（codeValue）
      expect(codeBlocks).toHaveLength(1)
      expect(codeBlocks[0].language).toBe('javascript')
    })
  })

  describe('detectCodeAtPosition function', () => {
    it('should detect code at specific position', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-language-detection-python.json')
      const testDocument = await workspace.openTextDocument(uri)
      
      // 查找值的位置（在字符串值内部）
      const content = testDocument.getText()
      const valueIndex = content.indexOf('def hello()')
      const position = testDocument.positionAt(valueIndex + 5) // 在'def hello()'中间
      
      const codeInfo = detector.detectCodeAtPosition(testDocument, position)
      
      expect(codeInfo).not.toBeNull()
      expect(codeInfo?.language).toBe('python')
      expect(codeInfo?.fieldName).toBe('pythonCode')
    })

    it('should return null for non-code positions', async () => {
      const uri = Uri.joinPath(Uri.file(process.cwd()), 'examples/test-language-detection-number.json')
      const testDocument = await workspace.openTextDocument(uri)
      
      const content = testDocument.getText()
      const fieldIndex = content.indexOf('"numberValue"')
      const position = testDocument.positionAt(fieldIndex + 'numberValue'.length + 1)
      
      const codeInfo = detector.detectCodeAtPosition(testDocument, position)
      expect(codeInfo).toBeNull()
    })
  })
})