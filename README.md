# JSON String Code Editor

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/Drswith.vscode-json-string-code-editor.svg?color=blue&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/Drswith/vscode-json-string-code-editor.svg?color=c160ef&label=Open%20VSX)](https://open-vsx.org/extension/Drswith/vscode-json-string-code-editor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful VS Code extension that enhances the editing experience of code snippets embedded within JSON and JSONC files. Edit JavaScript, TypeScript, Python, and other code directly in temporary editor tabs with full syntax highlighting, IntelliSense, and language support.

## ✨ Features

- **🚀 Temporary Code Editor**: Open code strings in dedicated temporary editor tabs with full language support
- **🎯 Smart Detection**: Automatically detects code in JSON string fields like `adapter`, `script`, `code`, `expression`
- **🌈 Syntax Highlighting**: Full syntax highlighting and IntelliSense for multiple programming languages
- **🔧 Right-click Integration**: Easy access through context menu in JSON/JSONC files
- **⚡ Real-time Sync**: Changes in temporary editors are automatically synced back to the original JSON
- **🧹 Auto Cleanup**: Automatic cleanup of temporary files when editors are closed
- **⚙️ Configurable**: Customizable field detection patterns and file inclusion rules

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "JSON String Code Editor"
4. Click Install

### From Command Line

```bash
code --install-extension drswith.vscode-json-string-code-editor
```

## 🚀 Usage

### Basic Usage

1. **Open a JSON or JSONC file** containing code strings
2. **Right-click** on a string value that contains code
3. **Select "Edit Code in Temporary Editor"** from the context menu
4. **Edit your code** in the new temporary tab with full language support
5. **Save the temporary file** (Ctrl+S) to sync changes back to the original JSON

### Example JSON Structure

```json
{
  "adapter": "const adapter = require('./adapter');\nconsole.log('Adapter loaded');",
  "script": "function processData(data) {\n  return data.map(item => item.value);\n}",
  "code": "try {\n  const result = await fetchData();\n  return result;\n} catch (error) {\n  console.error(error);\n}"
}
```

### Auto-Detection

The extension automatically detects code in fields with these names by default:

- `adapter`
- `script`
- `code`
- `expression`

You can customize these field names in the extension settings.

## ⚙️ Configuration

Access settings via `File > Preferences > Settings` and search for "JSON String Code Editor".

### Available Settings

<!-- configs -->

| Key                                                  | Description                                                          | Type      | Default                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------- | --------- | ------------------------------------------ |
| `vscode-json-string-code-editor.include`             | Glob patterns for files where the extension should be active         | `array`   | `["**/*.json","**/*.jsonc"]`               |
| `vscode-json-string-code-editor.autoDetectFields`    | Field names that should be automatically detected as containing code | `array`   | `["adaptor","script","code","expression"]` |
| `vscode-json-string-code-editor.enableAutoDetection` | Automatically detect code in JSON strings                            | `boolean` | `true`                                     |
| `vscode-json-string-code-editor.logLevel`            | Set the logging level for the extension                              | `string`  | `"info"`                                   |

<!-- configs -->

### Example Configuration

```json
{
  "vscode-json-string-code-editor.autoDetectFields": [
    "adapter",
    "script",
    "code",
    "expression",
    "handler",
    "transform"
  ],
  "vscode-json-string-code-editor.include": [
    "**/*.json",
    "**/*.jsonc",
    "**/config/*.json"
  ]
}
```

## 🎯 Commands

The extension provides the following commands accessible via Command Palette (Ctrl+Shift+P):

- **Edit Code in Temporary Editor**: Open selected JSON string in a temporary editor
- **Edit Code at Range**: Edit code at a specific range
- **Clean Up Temporary Files**: Manually clean up all temporary files
<!-- commands -->

| Command                                           | Title                                                  |
| ------------------------------------------------- | ------------------------------------------------------ |
| `vscode-json-string-code-editor.editCode`         | JSON String Code Editor: Edit Code in Temporary Editor |
| `vscode-json-string-code-editor.editCodeAtRange`  | JSON String Code Editor: Edit Code at Range            |
| `vscode-json-string-code-editor.cleanupTempFiles` | JSON String Code Editor: Clean Up Temporary Files      |

<!-- commands -->

## 🔧 Development

### Prerequisites

- Node.js 16+
- pnpm package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/Drswith/vscode-json-string-code-editor.git
cd vscode-json-string-code-editor

# Install dependencies
pnpm install

# Compile the extension
pnpm run compile

# Run tests
pnpm test

# Watch mode for development
pnpm run dev
```

### Building

```bash
# Build for production
pnpm run build

# Package the extension
pnpm run ext:pack
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💖 Support

If you find this extension helpful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs and issues
- 💡 Suggesting new features
- ☕ [Sponsoring the project](https://github.com/sponsors/Drswith)

## 📚 Related

- [VS Code Extension API](https://code.visualstudio.com/api)
- [JSON Schema](https://json-schema.org/)
- [JSONC (JSON with Comments)](https://github.com/microsoft/node-jsonc-parser)

---

**Enjoy coding! 🎉**
