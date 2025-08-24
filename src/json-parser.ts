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
 * Check if string might be a code snippet
 */
function isLikelyCode(value: string): boolean {
  if (!value || typeof value !== 'string')
    return false

  // Check if contains common code patterns
  const codePatterns = [
    /function\s*\(/, // Function definition
    /=>\s*[{(]/, // Arrow function
    /\b(if|for|while|switch)\s*\(/, // Control structures
    /\b(const|let|var)\s+\w+/, // Variable declaration
    /\b(import|export)\s+/, // Module import/export
    /\{[^}]*\}/, // Object literal
    /\[[^\]]*\]/, // Array literal
    /\$\{[^}]+\}/, // Template string
    /\b(return|throw|break|continue)\b/, // Control statements
    /[;{}]\s*$/m, // Statement terminator
    /^\s*\/\//m, // Single line comment
    /\/\*[\s\S]*?\*\//, // Multi-line comment
  ]

  return codePatterns.some(pattern => pattern.test(value))
}

/**
 * Check if key name is in the forced code keys list
 */
function isForceCodeKey(key: string): boolean {
  const forceKeys = config.forceCodeKeys || []
  return forceKeys.some((forceKey: string) =>
    key.toLowerCase().includes(forceKey.toLowerCase()),
  )
}

/**
 * Parse JSON document and identify code snippets
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

            // Recursively process nested objects
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
 * Find code snippet by position
 */
export function findCodeSnippetAtPosition(snippets: CodeSnippet[], position: Position): CodeSnippet | undefined {
  return snippets.find(snippet => snippet.range.contains(position))
}

/**
 * Find code snippet by range
 */
export function findCodeSnippetAtRange(snippets: CodeSnippet[], range: Range): CodeSnippet | undefined {
  return snippets.find(snippet =>
    snippet.range.intersection(range) !== undefined,
  )
}

/**
 * Parse JSON key-value pair at specified position (even if not a code snippet)
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

            // Check if position is within this key-value pair range
            if (fullRange.contains(position)) {
              const key = keyNode.type === 'string' ? keyNode.value as string : 'unknown'
              let value = ''

              // Handle different types of values
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
                // For objects or arrays, get original text
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

            // Recursively search nested structures
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
