# JSON String Code Editor

<a href="https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor" target="__blank"><img src="https://img.shields.io/visual-studio-marketplace/v/Drswith.vscode-json-string-code-editor.svg?color=eee&amp;label=VS%20Code%20Marketplace&logo=visual-studio-code" alt="Visual Studio Marketplace Version" /></a>
<a href="https://kermanx.github.io/reactive-vscode/" target="__blank"><img src="https://img.shields.io/badge/made_with-reactive--vscode-%23007ACC?style=flat&labelColor=%23229863"  alt="Made with reactive-vscode" /></a>

一个用于优化 JSON Schema 中代码片段的编辑体验的 VS Code 插件。

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
   - **鼠标悬停**：悬停显示代码预览和编辑按钮
   - **右键菜单**：通过上下文菜单进入编辑模式

4. **临时文件管理**
   - 自动创建临时编辑文件
   - 智能语言检测（基于代码内容和键名）
   - 支持语法高亮和代码补全
   - 保存时自动同步回原 JSON 文件
   - 自动清理临时文件
   - 可配置自动关闭临时标签页

### ⚙️ 配置选项

```json
{
  "vscode-json-string-code-editor.include": [
    "**/*.json",
    "**/*.jsonc"
  ],
  "vscode-json-string-code-editor.forceCodeKeys": [
    "script",
    "code",
    "template",
    "function",
    "expression",
    "query"
  ],
  "vscode-json-string-code-editor.enableLogging": false,
  "vscode-json-string-code-editor.autoCloseTempTab": false,
  "vscode-json-string-code-editor.defaultLanguage": "javascript"
}
```

- `include`: 指定插件生效的文件 glob 模式
- `forceCodeKeys`: 强制识别为代码片段的键名数组
- `enableLogging`: 是否启用调试日志
- `autoCloseTempTab`: 保存更改后自动关闭临时标签页
- `defaultLanguage`: 当无法自动检测语言时使用的默认编程语言（支持：javascript、typescript、python、sql、html、css、xml、yaml、markdown、json、plaintext）

## 使用方法

### 1. 自动识别

插件会自动识别以下模式的代码片段：
- 函数定义（function、箭头函数）
- 控制结构（if、for、while、switch）
- 变量声明（const、let、var）
- 模块导入导出（import、export）
- 对象和数组字面量
- 模板字符串
- 控制语句（return、throw、break、continue）
- 注释（单行和多行）
- SQL 查询语句
- HTML 标签
- CSS 样式
- 正则表达式
- 多行代码块

### 2. 编辑代码片段

#### 方式一：鼠标悬停
1. 将鼠标悬停在代码片段上
2. 在弹出的悬停面板中点击"在临时标签页编辑"
3. 或点击"复制代码"按钮复制代码到剪贴板

#### 方式二：右键菜单
1. 在 JSON 文件中右键点击
2. 选择"Edit as Code"菜单项
3. 如果光标位置有代码片段则直接编辑

### 3. 命令面板

可通过命令面板（Ctrl+Shift+P）执行以下命令：

- `JSON String Code: Edit as Code` - 编辑当前位置的代码片段
- `JSON String Code: Edit Code Snippet from Hover` - 从悬浮提示编辑代码片段
- `JSON String Code: Copy Code Snippet` - 复制代码片段
- `JSON String Code: Refresh Code Snippet Decorations` - 刷新代码片段装饰
- `JSON String Code: Cleanup Temporary Files` - 清理临时文件

## 支持的文件类型

- `.json` - 标准 JSON 文件
- `.jsonc` - 带注释的 JSON 文件

## 技术实现

- 基于 `reactive-vscode` 框架开发
- 使用 `jsonc-parser` 进行 JSON AST 解析，支持带注释的 JSON
- 使用 `minimatch` 进行文件路径匹配和过滤
- 使用 `jsesc` 进行 JavaScript 字符串转义处理
- TypeScript 开发，提供完整的类型支持
- 使用 `tsdown` 进行高效的构建打包
- 使用 `vitest` 进行单元测试

## 开发和构建

```bash
# 安装依赖
pnpm install

# 开发模式（监听文件变化）
pnpm run dev

# 构建
pnpm run build

# 测试
pnpm run test

# 监听测试
pnpm run test:watch

# 代码检查
pnpm run lint

# 修复代码格式
pnpm run lint:fix

# 类型检查
pnpm run typecheck

# 打包扩展
pnpm run pack:vsce

# 发布到 VS Code Marketplace
pnpm run publish:vsce

# 发布到 Open VSX
pnpm run publish:ovsx
```

## 示例

查看 `test-example.json` 文件以了解插件如何识别和处理不同类型的代码片段。该文件包含了以下示例：

- **JavaScript 函数**：自动识别函数定义和复杂逻辑
- **SQL 查询**：支持简单和复杂的 SQL 语句
- **HTML 模板**：识别 HTML 标签和模板语法
- **CSS 样式**：支持 CSS 规则和选择器
- **正则表达式**：识别常见的正则模式
- **配置脚本**：npm scripts 和构建配置

## Configurations

<!-- configs -->

| Key                                               | Description                                  | Type      | Default                                                        |
| ------------------------------------------------- | -------------------------------------------- | --------- | -------------------------------------------------------------- |
| `vscode-json-string-code-editor.include`          | 指定插件生效的文件 glob 模式                      | `array`   | `["**/*.json","**/*.jsonc"]`                                   |
| `vscode-json-string-code-editor.forceCodeKeys`    | 强制识别为代码片段的键名数组                        | `array`   | `["script","code","template","function","expression","query"]` |
| `vscode-json-string-code-editor.enableLogging`    | 是否启用调试日志                               | `boolean` | `false`                                                        |
| `vscode-json-string-code-editor.autoCloseTempTab` | 保存更改后自动关闭临时标签页                       | `boolean` | `false`                                                        |
| `vscode-json-string-code-editor.defaultLanguage`  | 当无法自动检测语言时使用的默认编程语言                | `string`  | `"javascript"`                                                 |

<!-- configs -->

## Commands

<!-- commands -->

| Command                                               | Title                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `vscode-json-string-code-editor.editAsCode`           | JSON 字符串代码: 编辑为代码                                        |
| `vscode-json-string-code-editor.editSnippetFromHover` | JSON 字符串代码: 从悬浮提示编辑代码片段                              |
| `vscode-json-string-code-editor.copySnippetCode`      | JSON 字符串代码: 复制代码片段                                      |
| `vscode-json-string-code-editor.refreshDecorations`   | JSON 字符串代码: 刷新代码片段装饰                                   |
| `vscode-json-string-code-editor.cleanupTempFiles`     | JSON 字符串代码: 清理临时文件                                      |

<!-- commands -->

## License

[MIT](./LICENSE.md) License © 2022 [Drswith](https://github.com/Drswith)
