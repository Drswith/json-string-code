import { describe, expect, it, vi } from 'vitest'
import { getBestKeyValueAtPosition } from '../src/json-parser'

// 简化的Position和Range类
class Position {
  constructor(public line: number, public character: number) {}
}

class Range {
  constructor(public start: Position, public end: Position) {}

  contains(position: Position): boolean {
    return (
      (position.line > this.start.line
        || (position.line === this.start.line && position.character >= this.start.character))
      && (position.line < this.end.line
        || (position.line === this.end.line && position.character <= this.end.character))
    )
  }
}

// Mock vscode module
vi.mock('vscode', () => {
  class MockPosition {
    constructor(public line: number, public character: number) {}
  }

  class MockRange {
    constructor(public start: MockPosition, public end: MockPosition) {}

    contains(position: MockPosition): boolean {
      return (
        (position.line > this.start.line
          || (position.line === this.start.line && position.character >= this.start.character))
        && (position.line < this.end.line
          || (position.line === this.end.line && position.character <= this.end.character))
      )
    }
  }

  return { Position: MockPosition, Range: MockRange }
})

// Mock reactive-vscode
vi.mock('reactive-vscode', () => {
  return {
    useActiveTextEditor: () => ({ value: null }),
    useDisposable: () => {},
  }
})

// Mock config
vi.mock('../src/config', () => {
  return {
    config: {
      enableLogging: false,
      forceCodeKeys: [],
    },
  }
})

// Mock utils
vi.mock('../src/utils', () => {
  return {
    logger: {
      info: () => {},
      error: () => {},
    },
  }
})

// Mock TextDocument for testing
class MockTextDocument {
  constructor(private content: string) {}

  getText(): string {
    return this.content
  }

  positionAt(offset: number): Position {
    const lines = this.content.substring(0, offset).split('\n')
    const line = lines.length - 1
    const character = lines[lines.length - 1].length
    return new Position(line, character)
  }

  offsetAt(position: Position): number {
    const lines = this.content.split('\n')
    let offset = 0
    for (let i = 0; i < position.line; i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    offset += position.character
    return offset
  }
}

describe('getBestKeyValueAtPosition - 多层嵌套问题', () => {
  const jsonContent = `{
  "name": "test-project",
  "version": "1.0.0",
  "scripts": {
    "build": "npm run compile && npm run bundle",
    "test": "jest --coverage --watchAll=false",
    "start": "node dist/index.js"
  },
  "webpack_config": {
    "entry": "./src/index.js",
    "output": {
      "path": "path.resolve(__dirname, 'dist')",
      "filename": "bundle.js"
    },
    "rules": [
      {
        "test": "/\\.js$/",
        "use": "babel-loader",
        "exclude": "/node_modules/"
      }
    ]
  }
}`

  it('应该能够识别第一层嵌套的键值对', () => {
    const document = new MockTextDocument(jsonContent)
    // 光标位于 "build" 值内
    const position = new Position(4, 20) // "npm run compile && npm run bundle" 中间

    const result = getBestKeyValueAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('build')
    expect(result?.value).toBe('npm run compile && npm run bundle')
  })

  it('应该能够识别第二层嵌套的键值对', () => {
    const document = new MockTextDocument(jsonContent)
    // 光标位于 "path" 值内
    const position = new Position(11, 25) // "path.resolve(__dirname, 'dist')" 中间

    const result = getBestKeyValueAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('path')
    expect(result?.value).toBe('path.resolve(__dirname, \'dist\')')
  })

  it('应该能够识别第三层嵌套的键值对', () => {
    const document = new MockTextDocument(jsonContent)
    // 光标位于 "test" 值内（rules数组中的对象）
    const position = new Position(16, 20) // "/\.js$/" 中间

    const result = getBestKeyValueAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('test')
    expect(result?.value).toBe('/js$/')
  })

  it('当光标在对象内但不在具体键值对内时，应该返回第一个键值对', () => {
    const document = new MockTextDocument(jsonContent)
    // 光标位于 scripts 对象的开始大括号后
    const position = new Position(3, 15) // scripts 对象内的空白处

    const result = getBestKeyValueAtPosition(document, position)

    expect(result).toBeDefined()
    // 应该返回 scripts 对象本身
    expect(result?.key).toBe('scripts')
  })

  it('当光标在数组内的对象中时，应该能正确识别', () => {
    const document = new MockTextDocument(jsonContent)
    // 光标位于 rules 数组中对象的 "use" 值内
    const position = new Position(17, 20) // "babel-loader" 中间

    const result = getBestKeyValueAtPosition(document, position)

    expect(result).toBeDefined()
    expect(result?.key).toBe('use')
    expect(result?.value).toBe('babel-loader')
  })
})
