import { describe, expect, it } from 'vitest'
import jsesc from '../src/custom.jsesc'

describe('common usage', () => {
  it('works correctly for common operations', () => {
    expect(
      typeof (jsesc as any).version,
    ).toBe('string')

    expect(
      jsesc('\0\x31'),
    ).toBe('\\x001')

    expect(
      jsesc('\0\x38'),
    ).toBe('\\x008')

    expect(
      jsesc('\0\x39'),
    ).toBe('\\x009')

    expect(
      jsesc('\0a'),
    ).toBe('\\0a')

    expect(
      jsesc('foo"bar\'baz', {
        quotes: 'LOLWAT' as any, // invalid setting
      }),
    ).toBe('foo"bar\\\'baz')

    expect(
      jsesc('foo${1+1} `bar`', {
        quotes: 'backtick',
      }),
    ).toBe('foo\\${1+1} \\`bar\\`')

    expect(
      jsesc('foo${1+1} `bar`', {
        quotes: 'backtick',
        wrap: true,
      }),
    ).toBe('`foo\\${1+1} \\`bar\\``')

    expect(
      jsesc('foo${1+1}</script>', {
        quotes: 'backtick',
        wrap: true,
        isScriptContext: true,
      }),
    ).toBe('`foo\\${1+1}<\\/script>`')

    expect(
      jsesc('\\x00'),
    ).toBe('\\\\x00')

    expect(
      jsesc('a\\x00'),
    ).toBe('a\\\\x00')

    expect(
      jsesc('\\\x00'),
    ).toBe('\\\\\\0')

    expect(
      jsesc('\\\\x00'),
    ).toBe('\\\\\\\\x00')

    expect(
      jsesc('lolwat"foo\'bar', {
        escapeEverything: true,
      }),
    ).toBe('\\x6C\\x6F\\x6C\\x77\\x61\\x74\\"\\x66\\x6F\\x6F\\\'\\x62\\x61\\x72')

    expect(
      jsesc('\0foo\u2029bar\nbaz\xA9qux\uD834\uDF06flops\uD834_\uDF06_\uDF06\uD834\xA0\u2000', {
        minimal: true,
      }),
    ).toBe('\\0foo\\u2029bar\\nbaz\xA9qux\uD834\uDF06flops\\uD834_\\uDF06_\\uDF06\\uD834\\xA0\\u2000')

    expect(
      jsesc('foo</script>bar</style>baz</script>qux', {
        isScriptContext: true,
      }),
    ).toBe('foo<\\/script>bar<\\/style>baz<\\/script>qux')

    expect(
      jsesc('foo</sCrIpT>bar</STYLE>baz</SCRIPT>qux', {
        isScriptContext: true,
      }),
    ).toBe('foo<\\/sCrIpT>bar<\\/STYLE>baz<\\/SCRIPT>qux')

    expect(
      jsesc('"<!--<script></script>";alert(1);', {
        isScriptContext: true,
      }),
    ).toBe('"\\x3C!--<script><\\/script>";alert(1);')

    expect(
      jsesc('"<!--<script></script>";alert(1);', {
        isScriptContext: true,
        json: true,
      }),
    ).toBe('"\\"\\u003C!--<script><\\/script>\\";alert(1);"')

    expect(
      jsesc([
        0x42,
        0x1337,
        50n,
        100n,
        // `BigInt` lower than `-Number.MAX_VALUE`
        BigInt(`-1${'0'.repeat(310)}`),
        // `BigInt` higher than `Number.MAX_VALUE`
        BigInt(`1${'0'.repeat(310)}`),
      ], {
        numbers: 'decimal',
      }),
    ).toBe('[66,4919,50n,100n,-10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n,10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n]')

    expect(
      jsesc([
        0x42,
        0x1337,
        50n,
        100n,
        // `BigInt` lower than `-Number.MAX_VALUE`
        BigInt(`-1${'0'.repeat(310)}`),
        // `BigInt` higher than `Number.MAX_VALUE`
        BigInt(`1${'0'.repeat(310)}`),
      ], {
        numbers: 'binary',
      }),
    ).toBe('[0b1000010,0b1001100110111,0b110010n,0b1100100n,0b-1101111010000001111001000000101000000011010010111100111101001111111110000000011101111111011111101010011001011110010110001101000100001011101010001110011010101110001101101010100101000000010100101100100010111010100011101101101010111011011011000110010010000100001111100011110111010001100010100110000111110001000110111100101100001001110011001111011110010010100100101110001001111001000011010110000111011110001000111111001011101000101000111111100011110000111011101000010000001100001110000010110100110000101011001100000001010100100101111010111001011100111001111111000101000110101111001010010001010001111000101010111111101110000111001101101100000100001100000110000110010001110010101111100000010011110001000100001101010010010010010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n,0b1101111010000001111001000000101000000011010010111100111101001111111110000000011101111111011111101010011001011110010110001101000100001011101010001110011010101110001101101010100101000000010100101100100010111010100011101101101010111011011011000110010010000100001111100011110111010001100010100110000111110001000110111100101100001001110011001111011110010010100100101110001001111001000011010110000111011110001000111111001011101000101000111111100011110000111011101000010000001100001110000010110100110000101011001100000001010100100101111010111001011100111001111111000101000110101111001010010001010001111000101010111111101110000111001101101100000100001100000110000110010001110010101111100000010011110001000100001101010010010010010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n]')

    expect(
      jsesc([
        0x42,
        0x1337,
        50n,
        100n,
        // `BigInt` lower than `-Number.MAX_VALUE`
        BigInt(`-1${'0'.repeat(310)}`),
        // `BigInt` higher than `Number.MAX_VALUE`
        BigInt(`1${'0'.repeat(310)}`),
        Number.NaN,
        Infinity,
      ], {
        numbers: 'binary',
        json: true,
      }),
    ).toBe('[66,4919,50,100,null,null,null,null]')

    expect(
      jsesc([
        0x42,
        0x1337,
        50n,
        100n,
        // `BigInt` lower than `-Number.MAX_VALUE`
        BigInt(`-1${'0'.repeat(310)}`),
        // `BigInt` higher than `Number.MAX_VALUE`
        BigInt(`1${'0'.repeat(310)}`),
      ], {
        numbers: 'octal',
      }),
    ).toBe('[0o102,0o11467,0o62n,0o144n,0o-15720171005003227475177600357737523136261504135216325615524500245442724355527333062204174367214246076106745411631736224456117103260736107713505077436073502014160264605314012445727134717705065712212170527756071554041406062162574023610415222220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n,0o15720171005003227475177600357737523136261504135216325615524500245442724355527333062204174367214246076106745411631736224456117103260736107713505077436073502014160264605314012445727134717705065712212170527756071554041406062162574023610415222220000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000n]')

    expect(
      jsesc([
        0x42,
        0x1337,
        50n,
        100n,
        // `BigInt` lower than `-Number.MAX_VALUE`
        BigInt(`-1${'0'.repeat(310)}`),
        // `BigInt` higher than `Number.MAX_VALUE`
        BigInt(`1${'0'.repeat(310)}`),
      ], {
        numbers: 'hexadecimal',
      }),
    ).toBe('[0x42,0x1337,0x32n,0x64n,0x-37A0790280D2F3D3FE01DFDFA997963442EA39AB8DAA5014B22EA3B6AEDB19210F8F7462987C46F2C2733DE4A4B89E43587788FCBA28FE3C3BA1030E0B4C2B301525EB9739FC51AF291478ABFB8736C10C186472BE04F110D492400000000000000000000000000000000000000000000000000000000000000000000000000000n,0x37A0790280D2F3D3FE01DFDFA997963442EA39AB8DAA5014B22EA3B6AEDB19210F8F7462987C46F2C2733DE4A4B89E43587788FCBA28FE3C3BA1030E0B4C2B301525EB9739FC51AF291478ABFB8736C10C186472BE04F110D492400000000000000000000000000000000000000000000000000000000000000000000000000000n]')

    expect(
      jsesc('a\uD834\uDF06b', {
        es6: true,
      }),
    ).toBe('a\\u{1D306}b')

    expect(
      jsesc('a\uD834\uDF06b\uD83D\uDCA9c', {
        es6: true,
      }),
    ).toBe('a\\u{1D306}b\\u{1F4A9}c')

    expect(
      jsesc('a\uD834\uDF06b\uD83D\uDCA9c', {
        es6: true,
        escapeEverything: true,
      }),
    ).toBe('\\x61\\u{1D306}\\x62\\u{1F4A9}\\x63')

    expect(
      jsesc({}, {
        compact: true,
      }),
    ).toBe('{}')

    expect(
      jsesc({}, {
        compact: false,
      }),
    ).toBe('{}')

    expect(
      jsesc([], {
        compact: true,
      }),
    ).toBe('[]')

    expect(
      jsesc([], {
        compact: false,
      }),
    ).toBe('[]')

    // Stringifying flat objects containing only string values
    expect(
      jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }),
    ).toBe('{\'foo\\0bar\\uFFFDbaz\':\'foo\\0bar\\uFFFDbaz\'}')

    expect(
      jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
        quotes: 'double',
      }),
    ).toBe('{"foo\\0bar\\uFFFDbaz":"foo\\0bar\\uFFFDbaz"}')

    expect(
      jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
        compact: false,
      }),
    ).toBe('{\n\t\'foo\\0bar\\uFFFDbaz\': \'foo\\0bar\\uFFFDbaz\'\n}')

    expect(
      jsesc(['a', 'b', 'c'], {
        compact: false,
        indentLevel: 1,
      }),
    ).toBe('[\n\t\t\'a\',\n\t\t\'b\',\n\t\t\'c\'\n\t]')

    expect(
      jsesc(['a', 'b', 'c'], {
        compact: false,
        indentLevel: 2,
      }),
    ).toBe('[\n\t\t\t\'a\',\n\t\t\t\'b\',\n\t\t\t\'c\'\n\t\t]')

    expect(
      jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
        compact: false,
        indent: '  ',
      }),
    ).toBe('{\n  \'foo\\0bar\\uFFFDbaz\': \'foo\\0bar\\uFFFDbaz\'\n}')

    expect(
      jsesc({ 'foo\x00bar\uFFFDbaz': 'foo\x00bar\uFFFDbaz' }, {
        escapeEverything: true,
      }),
    ).toBe('{\'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A\':\'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A\'}')

    // Stringifying flat arrays containing only string values
    expect(
      jsesc(['foo\x00bar\uFFFDbaz', '\xA9'], {
        escapeEverything: true,
      }),
    ).toBe('[\'\\x66\\x6F\\x6F\\0\\x62\\x61\\x72\\uFFFD\\x62\\x61\\x7A\',\'\\xA9\']')

    expect(
      jsesc(['foo\x00bar\uFFFDbaz', '\xA9'], {
        compact: false,
      }),
    ).toBe('[\n\t\'foo\\0bar\\uFFFDbaz\',\n\t\'\\xA9\'\n]')

    expect(
      jsesc(
        new Map([]),
      ),
    ).toBe('new Map()')

    expect(
      jsesc(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        {
          compact: true,
        },
      ),
    ).toBe('new Map([[\'a\',1],[\'b\',2]])')

    expect(
      jsesc(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        {
          compact: false,
        },
      ),
    ).toBe('new Map([\n\t[\'a\', 1],\n\t[\'b\', 2]\n])')

    expect(
      jsesc(
        // @ts-expect-error let it be
        new Map([
          ['a', 1],
          // @ts-expect-error let it be
          ['b', [
            'a',
            'nested',
            'array',
          ]] as [string, any][],
        ]),
        {
          compact: false,
        },
      ),
    ).toBe('new Map([\n\t[\'a\', 1],\n\t[\'b\', [\n\t\t\'a\',\n\t\t\'nested\',\n\t\t\'array\'\n\t]]\n])')

    expect(
      jsesc(
        new Map([
          ['a', 1],
          ['b', new Map([
            ['x', 2],
            ['y', 3],
          ])],
        ] as [string, any][]),
        {
          compact: false,
        },
      ),
    ).toBe('new Map([\n\t[\'a\', 1],\n\t[\'b\', new Map([\n\t\t[\'x\', 2],\n\t\t[\'y\', 3]\n\t])]\n])')

    expect(
      jsesc(
        new Set([]),
      ),
    ).toBe('new Set()')

    // Test array with various types
    const testArray = [
      undefined,
      Infinity,
      Number(Infinity),
      -Infinity,
      Number(-Infinity),
      0,
      Number(0),
      -0,
      Number(-0),
      +0,
      Number(+0),
      'str',
      function zomg() { return 'desu' },
      null,
      true,
      Boolean(true),
      false,
      Boolean(false),
      {
        foo: 42,
        hah: [1, 2, 3, { foo: 42 }],
      },
    ]

    expect(
      jsesc(testArray, {
        json: false,
      }),
    ).toBe('[undefined,Infinity,Infinity,-Infinity,-Infinity,0,0,0,0,0,0,\'str\',function zomg() { return \'desu\'; },null,true,true,false,false,{\'foo\':42,\'hah\':[1,2,3,{\'foo\':42}]}]')

    expect(
      jsesc(testArray, {
        json: true,
      }),
    ).toBe('[null,null,null,null,null,0,0,0,0,0,0,"str",null,null,true,true,false,false,{"foo":42,"hah":[1,2,3,{"foo":42}]}]')

    expect(
      jsesc(testArray, {
        json: true,
        compact: false,
      }),
    ).toBe('[\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\tnull,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t0,\n\t"str",\n\tnull,\n\tnull,\n\ttrue,\n\ttrue,\n\tfalse,\n\tfalse,\n\t{\n\t\t"foo": 42,\n\t\t"hah": [\n\t\t\t1,\n\t\t\t2,\n\t\t\t3,\n\t\t\t{\n\t\t\t\t"foo": 42\n\t\t\t}\n\t\t]\n\t}\n]')
  })
})