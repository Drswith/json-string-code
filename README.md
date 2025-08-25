# JSON JavaScript Editor

一个用于在 JSON 文件中编辑嵌入式 JavaScript 代码的 VSCode 扩展。

## 功能特性

- 🔍 **自动检测**: 自动识别 JSON 字符串中的 JavaScript 代码
- ✏️ **临时编辑器**: 在独立的 JavaScript 编辑器中编辑代码，享受完整的语法高亮和智能提示
- 🔄 **实时同步**: 编辑内容自动同步回原始 JSON 文件
- 👁️ **可视化提示**: 通过 CodeLens 和 Hover 提示快速识别和编辑 JavaScript 代码
- ⚙️ **可配置**: 支持自定义字段名检测规则

## 使用方法

### 1. 自动检测

扩展会自动检测以下字段名中的 JavaScript 代码：

- `adaptor`
- `script`
- `code`
- `expression`

### 2. 编辑 JavaScript 代码

有三种方式可以打开 JavaScript 编辑器：

#### 方式一：CodeLens

在包含 JavaScript 代码的字段上方会显示 "Edit JavaScript" 链接，点击即可打开编辑器。

#### 方式二：右键菜单

1. 将光标放在 JavaScript 代码字符串内
2. 右键选择 "Edit JavaScript in Temporary Editor"

#### 方式三：Hover 提示

1. 将鼠标悬停在 JavaScript 代码上
2. 在弹出的提示框中点击 "Edit in JavaScript Editor" 链接

### 3. 编辑和同步

- 在临时编辑器中编辑 JavaScript 代码
- 所有更改会自动同步回原始 JSON 文件
- 状态栏会显示当前编辑状态
- 关闭临时编辑器时会显示同步完成提示

## 配置选项

在 VSCode 设置中可以配置以下选项：

### `vscode-json-string-code-editor.autoDetectFields`

- **类型**: `array`
- **默认值**: `["adaptor", "script", "code", "expression"]`
- **描述**: 自动检测为包含 JavaScript 代码的字段名列表

### `vscode-json-string-code-editor.enableAutoDetection`

- **类型**: `boolean`
- **默认值**: `true`
- **描述**: 是否启用自动检测功能

## 安装方法

### 本地安装

1. 克隆或下载此项目
2. 在项目根目录运行：
   ```bash
   npm install
   npm run compile
   ```
3. 在 VSCode 中按 `F5` 启动扩展开发主机
4. 或者打包安装：
   ```bash
   npm install -g vsce
   vsce package
   code --install-extension json-js-editor-1.0.0.vsix
   ```

## 示例

假设你有以下 JSON 文件：

```json
{
  "name": "示例配置",
  "adaptor": "function processData(data) {\n  return data.map(item => ({\n    id: item.id,\n    name: item.name.toUpperCase()\n  }));\n}",
  "version": "1.0.0"
}
```

使用此扩展，你可以：

1. 看到 `adaptor` 字段上方的 "Edit JavaScript" CodeLens
2. 点击后在新的 JavaScript 编辑器中编辑代码
3. 享受完整的语法高亮、代码补全等功能
4. 编辑完成后自动同步回 JSON 文件

## 技术实现

- **语言**: TypeScript
- **框架**: VSCode Extension API
- **主要功能**:
  - JSON 解析和 JavaScript 代码检测
  - 临时文档创建和管理
  - 实时文档同步
  - CodeLens 和 Hover 提供器

## 许可证

ISC License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 1.0.0

- 初始版本发布
- 支持自动检测 JSON 中的 JavaScript 代码
- 支持临时编辑器编辑和实时同步
- 支持 CodeLens 和 Hover 提示
