'use strict'

interface JsescOptions {
  escapeEverything?: boolean
  minimal?: boolean
  isScriptContext?: boolean
  quotes?: 'single' | 'double' | 'backtick'
  wrap?: boolean
  es6?: boolean
  json?: boolean
  compact?: boolean
  lowercaseHex?: boolean
  numbers?: 'decimal' | 'binary' | 'octal' | 'hexadecimal'
  indent?: string
  indentLevel?: number
  __inline1__?: boolean
  __inline2__?: boolean
}

const object = {}
const hasOwnProperty = object.hasOwnProperty

function forOwn(obj: any, callback: (key: string, value: any) => void) {
  for (const key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      callback(key, obj[key])
    }
  }
}

function extend(destination: any, source: any) {
  if (!source) {
    return destination
  }
  forOwn(source, (key, value) => {
    destination[key] = value
  })
  return destination
}

function forEach(array: any[], callback: (value: any) => void) {
  const length = array.length
  let index = -1
  while (++index < length) {
    callback(array[index])
  }
}

function fourHexEscape(hex: string) {
  return `\\u${(`0000${hex}`).slice(-4)}`
}

function hexadecimal(code: number, lowercase: boolean) {
  let hexValue = code.toString(16)
  if (lowercase)
    return hexValue
  return hexValue.toUpperCase()
}

const toString = object.toString
const isArray = Array.isArray

function isBuffer(value: any): boolean {
  // 在浏览器环境中，Buffer 可能不存在
  // eslint-disable-next-line node/prefer-global/buffer
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer) {
    // eslint-disable-next-line node/prefer-global/buffer
    return Buffer.isBuffer(value)
  }
  return false
}

function isObject(value: any) {
  return toString.call(value) === '[object Object]'
}

function isString(value: any) {
  return typeof value === 'string' || toString.call(value) === '[object String]'
}

function isNumber(value: any) {
  return typeof value === 'number' || toString.call(value) === '[object Number]'
}

function isBigInt(value: any) {
  return typeof value === 'bigint'
}

function isFunction(value: any) {
  return typeof value === 'function'
}

function isMap(value: any) {
  return toString.call(value) === '[object Map]'
}

function isSet(value: any) {
  return toString.call(value) === '[object Set]'
}

const singleEscapes: { [key: string]: string } = {
  '\\': '\\\\',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
}

// eslint-disable-next-line no-control-regex
const regexSingleEscape = /[\\\u0008\f\n\r\t]/
const regexDigit = /\d/
const regexWhitespace = /[\xA0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/
const escapeEverythingRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['`"])|[\s\S]/g
// eslint-disable-next-line regexp/no-obscure-range
const escapeNonAsciiRegex = /([\uD800-\uDBFF][\uDC00-\uDFFF])|([\uD800-\uDFFF])|(['`"])|[^ !#-&(-[\]-_a-~]/g

function jsesc(argument: any, options?: JsescOptions): string {
  let indent = ''
  let oldIndent = ''

  const defaults: JsescOptions = {
    escapeEverything: false,
    minimal: false,
    isScriptContext: false,
    quotes: 'single',
    wrap: false,
    es6: false,
    json: false,
    compact: true,
    lowercaseHex: false,
    numbers: 'decimal',
    indent: '\t',
    indentLevel: 0,
    __inline1__: false,
    __inline2__: false,
  }

  const json = options && options.json
  if (json) {
    defaults.quotes = 'double'
    defaults.wrap = true
  }

  const opts = extend(defaults, options) as Required<JsescOptions>

  if (
    opts.quotes !== 'single'
    && opts.quotes !== 'double'
    && opts.quotes !== 'backtick'
  ) {
    opts.quotes = 'single'
  }

  const increaseIndentation = () => {
    oldIndent = indent
    opts.indentLevel = (opts.indentLevel || 0) + 1
    indent = (opts.indent || '\t').repeat(opts.indentLevel)
  }

  const quote = opts.quotes === 'double'
    ? '"'
    : (opts.quotes === 'backtick' ? '`' : '\'')
  const compact = opts.compact
  const lowercaseHex = opts.lowercaseHex
  indent = (opts.indent || '\t').repeat(opts.indentLevel || 0)
  const inline1 = opts.__inline1__
  const inline2 = opts.__inline2__
  const newLine = compact ? '' : '\n'
  let result: string | string[]
  let isEmpty = true
  const useBinNumbers = opts.numbers === 'binary'
  const useOctNumbers = opts.numbers === 'octal'
  const useDecNumbers = opts.numbers === 'decimal'
  const useHexNumbers = opts.numbers === 'hexadecimal'

  if (json && argument && isFunction(argument.toJSON)) {
    argument = argument.toJSON()
  }

  if (!isString(argument)) {
    if (isMap(argument)) {
      if (argument.size === 0) {
        return 'new Map()'
      }
      if (!compact) {
        opts.__inline1__ = true
        opts.__inline2__ = false
      }
      return `new Map(${jsesc(Array.from(argument), opts)})`
    }
    if (isSet(argument)) {
      if (argument.size === 0) {
        return 'new Set()'
      }
      return `new Set(${jsesc(Array.from(argument), opts)})`
    }
    if (isBuffer(argument)) {
      if (argument.length === 0) {
        return 'Buffer.from([])'
      }
      return `Buffer.from(${jsesc(Array.from(argument), opts)})`
    }
    if (isArray(argument)) {
      result = []
      opts.wrap = true
      if (inline1) {
        opts.__inline1__ = false
        opts.__inline2__ = true
      }
      if (!inline2) {
        increaseIndentation()
      }
      forEach(argument, (value) => {
        isEmpty = false
        if (inline2) {
          opts.__inline2__ = false
        }
        (result as string[]).push(
          (compact || inline2 ? '' : indent) + jsesc(value, opts),
        )
      })
      if (isEmpty) {
        return '[]'
      }
      if (inline2) {
        return `[${(result as string[]).join(', ')}]`
      }
      return `[${newLine}${(result as string[]).join(`,${newLine}`)}${newLine
      }${compact ? '' : oldIndent}]`
    }
    else if (isNumber(argument) || isBigInt(argument)) {
      if (json) {
        return JSON.stringify(Number(argument))
      }

      let numResult: string
      if (useDecNumbers) {
        numResult = String(argument)
      }
      else if (useHexNumbers) {
        let hex = argument.toString(16)
        if (!lowercaseHex) {
          hex = hex.toUpperCase()
        }
        numResult = `0x${hex}`
      }
      else if (useBinNumbers) {
        numResult = `0b${argument.toString(2)}`
      }
      else if (useOctNumbers) {
        numResult = `0o${argument.toString(8)}`
      }
      else {
        numResult = String(argument)
      }

      if (isBigInt(argument)) {
        return `${numResult}n`
      }
      return numResult
    }
    else if (!isObject(argument)) {
      if (json) {
        return JSON.stringify(argument) || 'null'
      }
      if (isFunction(argument)) {
        return argument.toString().replace(/\s+/g, ' ').replace(/\{\s+/g, '{ ').replace(/\s+\}/g, ' }').replace(/"/g, '\'')
      }
      return String(argument)
    }
    else {
      result = []
      opts.wrap = true
      increaseIndentation()
      forOwn(argument, (key, value) => {
        isEmpty = false;
        (result as string[]).push(
          `${(compact ? '' : indent)
          + jsesc(key, opts)}:${
            compact ? '' : ' '
          }${jsesc(value, opts)}`,
        )
      })
      if (isEmpty) {
        return '{}'
      }
      return `{${newLine}${(result as string[]).join(`,${newLine}`)}${newLine
      }${compact ? '' : oldIndent}}`
    }
  }

  const regex = opts.escapeEverything ? escapeEverythingRegex : escapeNonAsciiRegex
  result = argument.replace(regex, (char: string, pair: string, lone: string, quoteChar: string, index: number, string: string) => {
    if (pair) {
      if (opts.minimal)
        return pair
      const first = pair.charCodeAt(0)
      const second = pair.charCodeAt(1)
      if (opts.es6) {
        const codePoint = (first - 0xD800) * 0x400 + second - 0xDC00 + 0x10000
        const hex = hexadecimal(codePoint, lowercaseHex || false)
        return `\\u{${hex}}`
      }
      return fourHexEscape(hexadecimal(first, lowercaseHex || false))
        + fourHexEscape(hexadecimal(second, lowercaseHex || false))
    }

    if (lone) {
      return fourHexEscape(hexadecimal(lone.charCodeAt(0), lowercaseHex || false))
    }

    if (char === '\0' && !json && !regexDigit.test(string.charAt(index + 1))) {
      return '\\0'
    }

    if (quoteChar) {
      if (quoteChar === quote || opts.escapeEverything) {
        return `\\${quoteChar}`
      }
      return quoteChar
    }

    if (regexSingleEscape.test(char)) {
      return singleEscapes[char]
    }

    if (opts.minimal && !regexWhitespace.test(char)) {
      return char
    }

    const hex = hexadecimal(char.charCodeAt(0), lowercaseHex || false)
    if (json || hex.length > 2) {
      return fourHexEscape(hex)
    }

    return `\\x${(`00${hex}`).slice(-2)}`
  })

  if (quote === '`') {
    result = (result as string).replace(/\$\{/g, '\\${')
  }
  if (opts.isScriptContext) {
    result = (result as string)
      .replace(/<\/(script|style)/gi, '<\\/$1')
      .replace(/<!--/g, json ? '\\u003C!--' : '\\x3C!--')
  }
  if (opts.wrap) {
    result = quote + result + quote
  }
  return result as string
}

(jsesc as any).version = '3.0.2'

export default jsesc
export { JsescOptions }