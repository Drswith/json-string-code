import type { Position, TextDocument } from 'vscode'
import * as jsonc from 'jsonc-parser'
import { Range } from 'vscode'
import { config } from './config'
import { logger } from './utils'

export interface CodeSnippet {
  key: string
  value: string
  range: Range
  keyRange: Range
  valueRange: Range
  isForced: boolean
}

/**
 * 检查字符串是否可能是代码片段
 */
function isLikelyCode(value: string): boolean {
  if (!value || typeof value !== 'string')
    return false

  // 检查是否包含常见的代码模式
  const codePatterns = [
    /function\s*\(/, // 函数定义
    /=>\s*[{(]/, // 箭头函数
    /\b(if|for|while|switch)\s*\(/, // 控制结构
    /\b(const|let|var)\s+\w+/, // 变量声明
    /\b(import|export)\s+/, // 模块导入导出
    /\{[^}]*\}/, // 对象字面量
    /\[[^\]]*\]/, // 数组字面量
    /\$\{[^}]+\}/, // 模板字符串
    /\b(return|throw|break|continue)\b/, // 控制语句
    /[;{}]\s*$/m, // 语句结束符
    /^\s*\/\//m, // 单行注释
    /\/\*[\s\S]*?\*\//, // 多行注释
  ]

  return codePatterns.some(pattern => pattern.test(value))
}

/**
 * 检查键名是否在强制代码键列表中
 */
function isForceCodeKey(key: string): boolean {
  const forceKeys = config.forceCodeKeys || []
  return forceKeys.some((forceKey: string) =>
    key.toLowerCase().includes(forceKey.toLowerCase()),
  )
}

/**
 * 解析JSON文档并识别代码片段
 */
export function parseJsonDocument(document: TextDocument): CodeSnippet[] {
  const text = document.getText()
  const snippets: CodeSnippet[] = []

  try {
    const tree = jsonc.parseTree(text)
    if (!tree)
      return snippets

    function visitNode(node: jsonc.Node, path: string[] = []): void {
      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length === 2) {
            const keyNode = child.children[0]
            const valueNode = child.children[1]

            if (keyNode.type === 'string' && valueNode.type === 'string') {
              const key = keyNode.value as string
              const value = valueNode.value as string

              const isForced = isForceCodeKey(key)
              const isCode = isForced || isLikelyCode(value)

              if (isCode) {
                const keyRange = new Range(
                  document.positionAt(keyNode.offset),
                  document.positionAt(keyNode.offset + keyNode.length),
                )

                const valueRange = new Range(
                  document.positionAt(valueNode.offset),
                  document.positionAt(valueNode.offset + valueNode.length),
                )

                const range = new Range(
                  keyRange.start,
                  valueRange.end,
                )

                snippets.push({
                  key,
                  value,
                  range,
                  keyRange,
                  valueRange,
                  isForced,
                })

                if (config.enableLogging) {
                  logger.info(`Found code snippet: ${key} (forced: ${isForced})`)
                }
              }
            }

            // 递归处理嵌套对象
            if (valueNode.type === 'object' || valueNode.type === 'array') {
              visitNode(valueNode, [...path, keyNode.value as string])
            }
          }
        }
      }
      else if (node.type === 'array' && node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]
          if (child.type === 'object' || child.type === 'array') {
            visitNode(child, [...path, i.toString()])
          }
        }
      }
    }

    visitNode(tree)
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Error parsing JSON: ${error}`)
    }
  }

  return snippets
}

/**
 * 根据位置查找代码片段
 */
export function findCodeSnippetAtPosition(snippets: CodeSnippet[], position: Position): CodeSnippet | undefined {
  return snippets.find(snippet => snippet.range.contains(position))
}

/**
 * 根据范围查找代码片段
 */
export function findCodeSnippetAtRange(snippets: CodeSnippet[], range: Range): CodeSnippet | undefined {
  return snippets.find(snippet =>
    snippet.range.intersection(range) !== undefined,
  )
}

/**
 * 解析指定位置的JSON键值对（即使不是代码片段）
 */
export function parseJsonKeyValueAtPosition(document: TextDocument, position: Position): CodeSnippet | undefined {
  const text = document.getText()

  try {
    const tree = jsonc.parseTree(text)
    if (!tree)
      return undefined

    function findNodeAtPosition(node: jsonc.Node): CodeSnippet | undefined {
      if (node.type === 'object' && node.children) {
        for (const child of node.children) {
          if (child.type === 'property' && child.children && child.children.length === 2) {
            const keyNode = child.children[0]
            const valueNode = child.children[1]

            const keyRange = new Range(
              document.positionAt(keyNode.offset),
              document.positionAt(keyNode.offset + keyNode.length),
            )

            const valueRange = new Range(
              document.positionAt(valueNode.offset),
              document.positionAt(valueNode.offset + valueNode.length),
            )

            const fullRange = new Range(
              keyRange.start,
              valueRange.end,
            )

            // 检查位置是否在这个键值对范围内
            if (fullRange.contains(position)) {
              const key = keyNode.type === 'string' ? keyNode.value as string : 'unknown'
              let value = ''

              // 处理不同类型的值
              if (valueNode.type === 'string') {
                value = valueNode.value as string
              }
              else if (valueNode.type === 'number') {
                value = valueNode.value?.toString() || ''
              }
              else if (valueNode.type === 'boolean') {
                value = valueNode.value?.toString() || ''
              }
              else if (valueNode.type === 'null') {
                value = 'null'
              }
              else {
                // 对于对象或数组，获取原始文本
                value = text.substring(valueNode.offset, valueNode.offset + valueNode.length)
              }

              return {
                key,
                value,
                range: fullRange,
                keyRange,
                valueRange,
                isForced: false,
              }
            }

            // 递归搜索嵌套结构
            if (valueNode.type === 'object' || valueNode.type === 'array') {
              const nested = findNodeAtPosition(valueNode)
              if (nested)
                return nested
            }
          }
        }
      }
      else if (node.type === 'array' && node.children) {
        for (const child of node.children) {
          if (child.type === 'object' || child.type === 'array') {
            const nested = findNodeAtPosition(child)
            if (nested)
              return nested
          }
        }
      }

      return undefined
    }

    return findNodeAtPosition(tree)
  }
  catch (error) {
    if (config.enableLogging) {
      logger.error(`Error parsing JSON at position: ${error}`)
    }
    return undefined
  }
}
