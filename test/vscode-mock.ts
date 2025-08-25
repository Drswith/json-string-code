// Mock implementation of VS Code API for testing

export class Range {
  constructor(
    public start: Position,
    public end: Position,
  ) {}
}

export class Position {
  constructor(
    public line: number,
    public character: number,
  ) {}

  isBefore(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character)
  }

  isBeforeOrEqual(other: Position): boolean {
    return this.line < other.line || (this.line === other.line && this.character <= other.character)
  }

  isAfter(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character)
  }

  isAfterOrEqual(other: Position): boolean {
    return this.line > other.line || (this.line === other.line && this.character >= other.character)
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character
  }

  compareTo(other: Position): number {
    if (this.line < other.line) {
      return -1
    }
    if (this.line > other.line) {
      return 1
    }
    if (this.character < other.character) {
      return -1
    }
    if (this.character > other.character) {
      return 1
    }
    return 0
  }

  translate(lineDelta?: number, characterDelta?: number): Position
  translate(change: { lineDelta?: number, characterDelta?: number }): Position
  translate(lineDeltaOrChange?: number | { lineDelta?: number, characterDelta?: number }, characterDelta?: number): Position {
    let lineDelta: number
    let charDelta: number

    if (typeof lineDeltaOrChange === 'object') {
      lineDelta = lineDeltaOrChange.lineDelta || 0
      charDelta = lineDeltaOrChange.characterDelta || 0
    }
    else {
      lineDelta = lineDeltaOrChange || 0
      charDelta = characterDelta || 0
    }

    return new Position(this.line + lineDelta, this.character + charDelta)
  }

  with(line?: number, character?: number): Position
  with(change: { line?: number, character?: number }): Position
  with(lineOrChange?: number | { line?: number, character?: number }, character?: number): Position {
    let newLine: number
    let newCharacter: number

    if (typeof lineOrChange === 'object') {
      newLine = lineOrChange.line !== undefined ? lineOrChange.line : this.line
      newCharacter = lineOrChange.character !== undefined ? lineOrChange.character : this.character
    }
    else {
      newLine = lineOrChange !== undefined ? lineOrChange : this.line
      newCharacter = character !== undefined ? character : this.character
    }

    return new Position(newLine, newCharacter)
  }
}

export class TextDocument {
  private content: string
  public uri: any = { fsPath: '/test.json' }
  public fileName: string = '/test.json'
  public isUntitled: boolean = false
  public languageId: string = 'json'
  public version: number = 1
  public isDirty: boolean = false
  public isClosed: boolean = false
  public eol: number = 1
  public lineCount: number

  constructor(content: string) {
    this.content = content
    this.lineCount = content.split('\n').length
  }

  getText(): string {
    return this.content
  }

  offsetAt(position: Position): number {
    const lines = this.content.split('\n')
    let offset = 0
    for (let i = 0; i < position.line && i < lines.length; i++) {
      offset += lines[i].length + 1 // +1 for newline
    }
    return offset + position.character
  }

  positionAt(offset: number): Position {
    const lines = this.content.split('\n')
    let currentOffset = 0
    for (let line = 0; line < lines.length; line++) {
      if (currentOffset + lines[line].length >= offset) {
        return new Position(line, offset - currentOffset)
      }
      currentOffset += lines[line].length + 1 // +1 for newline
    }
    return new Position(lines.length - 1, lines[lines.length - 1].length)
  }

  lineAt(lineOrPosition: number | Position): any {
    const lineNumber = typeof lineOrPosition === 'number' ? lineOrPosition : lineOrPosition.line
    const lines = this.content.split('\n')
    return {
      text: lines[lineNumber] || '',
      range: new Range(new Position(lineNumber, 0), new Position(lineNumber, (lines[lineNumber] || '').length)),
      rangeIncludingLineBreak: new Range(new Position(lineNumber, 0), new Position(lineNumber + 1, 0)),
      firstNonWhitespaceCharacterIndex: 0,
      isEmptyOrWhitespace: (lines[lineNumber] || '').trim().length === 0,
    }
  }

  getWordRangeAtPosition(): any {
    return null
  }

  validateRange(range: Range): Range {
    return range
  }

  validatePosition(position: Position): Position {
    return position
  }

  save(): Promise<boolean> {
    return Promise.resolve(true)
  }

  encoding: string = 'utf8'
}

export const workspace = {
  getConfiguration: (section: string) => ({
    get: (key: string, defaultValue?: any) => {
      if (section === 'jsonJsEditor' && key === 'autoDetectFields') {
        return ['adaptor', 'adaptor2', 'script', 'code', 'expression']
      }
      return defaultValue
    },
  }),
}