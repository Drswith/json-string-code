# JSON String Code Editor

<a href="https://marketplace.visualstudio.com/items?itemName=Drswith.json-string-code" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/Drswith.json-string-code.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>
<a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>

一个基于 reactive-vscode 开发的 VS Code 插件，用于优化 JSON Schema 中代码片段的编辑体验。

## 功能特性

### 🎯 核心功能

1. **智能代码片段识别**
   - 自动识别 JSON 字符串值中的代码片段
   - 支持多种编程语言（JavaScript、SQL、HTML、CSS、正则表达式等）
   - 可配置强制识别的键名列表

2. **可视化标识**
   - 识别为代码片段的值会显示下划线装饰
   - 强制识别的代码片段有特殊的视觉标识
   - 支持不同类型代码片段的差异化显示

3. **便捷编辑方式**
   - **左键单击**：直接点击代码片段打开临时编辑标签页
   - **鼠标悬停**：悬停显示代码预览和编辑按钮
   - **右键菜单**：通过上下文菜单进入编辑模式

4. **临时文件管理**
   - 自动创建临时编辑文件
   - 支持语法高亮和代码补全
   - 保存时自动同步回原 JSON 文件
   - 自动清理临时文件

### ⚙️ 配置选项

```json
{
  "json-string-code.include": [
    "**/*.json",
    "**/*.jsonc"
  ],
  "json-string-code.forceCodeKeys": [
    "script",
    "code",
    "template",
    "query"
  ],
  "json-string-code.enableLogging": false
}
```

- `include`: 指定插件生效的文件 glob 模式
- `forceCodeKeys`: 强制识别为代码片段的键名数组
- `enableLogging`: 是否启用调试日志

## 使用方法

### 1. 自动识别

插件会自动识别以下模式的代码片段：
- 包含函数定义的字符串
- SQL 查询语句
- HTML 标签
- CSS 样式
- 正则表达式
- 多行代码块

### 2. 编辑代码片段

#### 方式一：左键单击
1. 将鼠标移动到有下划线的代码片段上
2. 左键单击即可打开临时编辑标签页
3. 在临时标签页中编辑代码
4. 保存文件（Ctrl+S）自动同步到原 JSON

#### 方式二：鼠标悬停
1. 将鼠标悬停在代码片段上
2. 在弹出的悬停面板中点击"在临时标签页编辑"
3. 或点击"复制代码"按钮复制代码到剪贴板

#### 方式三：右键菜单
1. 在 JSON 文件中右键点击
2. 选择"Edit as Code"菜单项
3. 如果光标位置有代码片段则直接编辑
4. 否则显示代码片段选择器

### 3. 命令面板

可通过命令面板（Ctrl+Shift+P）执行以下命令：

- `JSON String Code: Edit as Code` - 编辑当前位置的代码片段
- `JSON String Code: Refresh Code Snippet Decorations` - 刷新代码片段装饰
- `JSON String Code: Cleanup Temporary Files` - 清理临时文件

## 支持的文件类型

- `.json` - 标准 JSON 文件
- `.jsonc` - 带注释的 JSON 文件

## 技术实现

- 基于 `reactive-vscode` 框架开发
- 使用 `jsonc-parser` 进行 JSON AST 解析
- 支持 `minimatch` 进行文件路径匹配
- TypeScript 开发，提供完整的类型支持

## 开发和构建

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev

# 构建
pnpm run build

# 测试
pnpm run test

# 发布
pnpm run publish
```

## 示例

查看 `test-example.json` 文件以了解插件如何识别和处理不同类型的代码片段。

## Configurations

<!-- configs -->

| Key                                 | Description                                  | Type      | Default                                                        |
| ----------------------------------- | -------------------------------------------- | --------- | -------------------------------------------------------------- |
| `json-string-code.include`          | %configuration.include.description%          | `array`   | `["**/*.json","**/*.jsonc"]`                                   |
| `json-string-code.forceCodeKeys`    | %configuration.forceCodeKeys.description%    | `array`   | `["script","code","template","function","expression","query"]` |
| `json-string-code.enableLogging`    | %configuration.enableLogging.description%    | `boolean` | `false`                                                        |
| `json-string-code.autoCloseTempTab` | %configuration.autoCloseTempTab.description% | `boolean` | `false`                                                        |
| `json-string-code.defaultLanguage`  | %configuration.defaultLanguage.description%  | `string`  | `"javascript"`                                                 |

<!-- configs -->

## Commands

<!-- commands -->

| Command                                 | Title                                                           |
| --------------------------------------- | --------------------------------------------------------------- |
| `json-string-code.editAsCode`           | %category.jsonStringCode%: %command.editAsCode.title%           |
| `json-string-code.editSnippetFromHover` | %category.jsonStringCode%: %command.editSnippetFromHover.title% |
| `json-string-code.copySnippetCode`      | %category.jsonStringCode%: %command.copySnippetCode.title%      |
| `json-string-code.refreshDecorations`   | %category.jsonStringCode%: %command.refreshDecorations.title%   |
| `json-string-code.cleanupTempFiles`     | %category.jsonStringCode%: %command.cleanupTempFiles.title%     |

<!-- commands -->

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/Drswith/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/Drswith/static/sponsors.png'/>
  </a>
</p>

## License

[MIT](./LICENSE.md) License © 2022 [Drswith](https://github.com/Drswith)
