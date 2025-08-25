/**
 * 语言工具函数
 * 提供语言检测和文件扩展名映射功能
 */

/**
 * 语言到文件扩展名的映射
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: '.js',
  typescript: '.ts',
  python: '.py',
  java: '.java',
  cpp: '.cpp',
  c: '.c',
  csharp: '.cs',
  php: '.php',
  go: '.go',
  rust: '.rs',
  sql: '.sql',
  html: '.html',
  css: '.css',
  xml: '.xml',
  yaml: '.yml',
  json: '.json',
  markdown: '.md',
  shellscript: '.sh',
  dockerfile: '.dockerfile',
  powershell: '.ps1',
  ruby: '.rb',
  swift: '.swift',
  kotlin: '.kt',
  scala: '.scala',
  perl: '.pl',
  lua: '.lua',
  r: '.r',
  matlab: '.m',
  vb: '.vb',
  fsharp: '.fs',
  dart: '.dart',
  elixir: '.ex',
  erlang: '.erl',
  haskell: '.hs',
  clojure: '.clj',
  groovy: '.groovy',
  coffeescript: '.coffee',
  less: '.less',
  scss: '.scss',
  sass: '.sass',
  stylus: '.styl',
  vue: '.vue',
  svelte: '.svelte',
  jsx: '.jsx',
  tsx: '.tsx',
}

/**
 * 根据语言获取对应的文件扩展名
 * @param language 语言类型
 * @returns 文件扩展名
 */
export function getFileExtension(language: string): string {
  const normalizedLanguage = language.toLowerCase()
  return LANGUAGE_EXTENSIONS[normalizedLanguage] || '.txt'
}

/**
 * 获取所有支持的语言列表
 * @returns 支持的语言数组
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_EXTENSIONS)
}

/**
 * 检查是否为支持的语言
 * @param language 语言类型
 * @returns 是否支持
 */
export function isSupportedLanguage(language: string): boolean {
  const normalizedLanguage = language.toLowerCase()
  return normalizedLanguage in LANGUAGE_EXTENSIONS
}

/**
 * 根据文件扩展名获取语言类型
 * @param extension 文件扩展名（包含点号）
 * @returns 语言类型，如果未找到则返回 'plaintext'
 */
export function getLanguageFromExtension(extension: string): string {
  const normalizedExt = extension.toLowerCase()
  for (const [language, ext] of Object.entries(LANGUAGE_EXTENSIONS)) {
    if (ext === normalizedExt) {
      return language
    }
  }
  return 'plaintext'
}

/**
 * 生成临时文件名
 * @param fieldName 字段名
 * @param language 语言类型
 * @param timestamp 时间戳（可选）
 * @returns 临时文件名
 */
export function generateTempFileName(fieldName: string, language: string, timestamp?: number): string {
  const cleanFieldName = fieldName.replace(/[^a-z0-9]/gi, '_')
  const ts = timestamp || Date.now()
  const extension = getFileExtension(language)
  return `temp_${cleanFieldName}_${ts}${extension}`
}