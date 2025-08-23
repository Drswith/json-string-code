import * as vscode from 'vscode'

/**
 * 国际化工具类
 * 用于处理扩展的多语言支持
 */
class I18n {
  private readonly translations: Record<string, Record<string, string>> = {
    'en': {
      'hover.editButton': '✏️ Edit in Temporary Tab',
      'hover.copyButton': '📋 Copy Code',
      'hover.language': 'Language',
      'hover.preview': 'Preview',
      'hover.forceCodeSnippet': 'This is a force code snippet (key matches configured patterns)',
      'notification.tempFileCreated': 'Temporary file created: {0}',
      'notification.changesSynced': 'Changes synced to original file',
      'notification.tempFileClosed': 'Temporary file closed',
      'notification.codeCopied': 'Code copied to clipboard',
      'notification.noCodeSnippet': 'No code snippet found at cursor position',
      'notification.syncFailed': 'Failed to sync changes: {0}',
      'notification.tempFileCleanup': 'Cleaned up {0} temporary files',
      'notification.noActiveEditor': 'No active editor found',
      'notification.jsonFilesOnly': 'This command only works with JSON/JSONC files',
      'notification.openedEditor': 'Opened code editor for "{0}". Save to sync changes.',
      'notification.failedToOpen': 'Failed to open code editor: {0}',
      'notification.failedToCopy': 'Failed to copy code: {0}',
      'notification.failedToCreate': 'Failed to create temporary file: {0}',
    },
    'zh-cn': {
      'hover.editButton': '✏️ 在临时标签页中编辑',
      'hover.copyButton': '📋 复制代码',
      'hover.language': '语言',
      'hover.preview': '预览',
      'hover.forceCodeSnippet': '这是一个强制代码片段（键名匹配配置的模式）',
      'notification.tempFileCreated': '已创建临时文件：{0}',
      'notification.changesSynced': '更改已同步到原始文件',
      'notification.tempFileClosed': '临时文件已关闭',
      'notification.codeCopied': '代码已复制到剪贴板',
      'notification.noCodeSnippet': '在光标位置未找到代码片段',
      'notification.syncFailed': '同步更改失败：{0}',
      'notification.tempFileCleanup': '已清理 {0} 个临时文件',
      'notification.noActiveEditor': '未找到活动编辑器',
      'notification.jsonFilesOnly': '此命令仅适用于 JSON/JSONC 文件',
      'notification.openedEditor': '已为 "{0}" 打开代码编辑器。保存以同步更改。',
      'notification.failedToOpen': '打开代码编辑器失败：{0}',
      'notification.failedToCopy': '复制代码失败：{0}',
      'notification.failedToCreate': '创建临时文件失败：{0}',
    },
  }

  /**
   * 获取当前VSCode的语言设置
   */
  private getCurrentLanguage(): string {
    const locale = vscode.env.language.toLowerCase()
    // 支持的语言列表
    const supportedLanguages = ['en', 'zh-cn']

    // 检查是否直接匹配
    if (supportedLanguages.includes(locale)) {
      return locale
    }

    // 检查语言前缀匹配（如 zh-tw 匹配 zh-cn）
    const languagePrefix = locale.split('-')[0]
    const matchedLanguage = supportedLanguages.find(lang => lang.startsWith(languagePrefix))

    return matchedLanguage || 'en' // 默认返回英文
  }

  /**
   * 获取翻译文本
   * @param key 翻译键
   * @param args 格式化参数
   */
  t(key: string, ...args: string[]): string {
    const language = this.getCurrentLanguage()
    const translations = this.translations[language] || this.translations.en
    let text = translations[key] || key

    // 替换占位符 {0}, {1}, etc.
    args.forEach((arg, index) => {
      text = text.replace(`{${index}}`, arg)
    })

    return text
  }

  /**
   * 检查是否为中文环境
   */
  isChinese(): boolean {
    return this.getCurrentLanguage().startsWith('zh')
  }
}

// 导出单例实例
export const i18n = new I18n()
