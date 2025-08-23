# JSON String Code Editor

[English](./README.md) | [简体中文](./README.zh-CN.md)

[![VS Code Marketplace](https://img.shields.io/vscode-marketplace/v/Drswith.vscode-json-string-code-editor.svg?color=blue&label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor)
[![Open VSX Registry](https://img.shields.io/open-vsx/v/Drswith/vscode-json-string-code-editor.svg?color=c160ef&label=Open%20VSX)](https://open-vsx.org/extension/Drswith/vscode-json-string-code-editor)

A VS Code extension for optimizing the editing experience of code snippets in JSON Schema.

## Features

### 🎯 Core Features

1. **Smart Code Snippet Recognition**
   - Automatically recognizes code snippets in JSON string values
   - Supports multiple programming languages (JavaScript, SQL, HTML, CSS, regular expressions, etc.)
   - Configurable list of key names for forced recognition

2. **Visual Indicators**
   - Values recognized as code snippets display underline decorations
   - Forced recognition code snippets have special visual indicators
   - Supports differentiated display for different types of code snippets

3. **Convenient Editing Methods**
   - **Mouse Hover**: Hover to display code preview and edit button
   - **Right-click Menu**: Enter edit mode through context menu

4. **Temporary File Management**
   - Automatically creates temporary editing files
   - Smart language detection (based on code content and key names)
   - Supports syntax highlighting and code completion
   - Automatically syncs back to original JSON file on save
   - Automatic cleanup of temporary files
   - Configurable auto-close temporary tabs

### ⚙️ Configuration Options

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

- `include`: Specifies the file glob patterns where the plugin takes effect
- `forceCodeKeys`: Array of key names to be forcibly recognized as code snippets
- `enableLogging`: Whether to enable debug logging
- `autoCloseTempTab`: Automatically close temporary tabs after saving changes
- `defaultLanguage`: Default programming language when auto-detection fails (supports: javascript, typescript, python, sql, html, css, xml, yaml, markdown, json, plaintext)

## Usage

### 1. Automatic Recognition

The plugin automatically recognizes code snippets with the following patterns:
- Function definitions (function, arrow functions)
- Control structures (if, for, while, switch)
- Variable declarations (const, let, var)
- Module imports/exports (import, export)
- Object and array literals
- Template strings
- Control statements (return, throw, break, continue)
- Comments (single-line and multi-line)
- SQL query statements
- HTML tags
- CSS styles
- Regular expressions
- Multi-line code blocks

### 2. Editing Code Snippets

#### Method 1: Mouse Hover
1. Hover your mouse over a code snippet
2. Click "Edit in temporary tab" in the popup hover panel
3. Or click the "Copy code" button to copy code to clipboard

#### Method 2: Right-click Menu
1. Right-click in a JSON file
2. Select the "Edit as Code" menu item
3. If there's a code snippet at the cursor position, it will be edited directly

### 3. Command Palette

You can execute the following commands through the command palette (Ctrl+Shift+P):

- `JSON String Code: Edit as Code` - Edit code snippet at current position
- `JSON String Code: Edit Code Snippet from Hover` - Edit code snippet from hover
- `JSON String Code: Copy Code Snippet` - Copy code snippet
- `JSON String Code: Refresh Code Snippet Decorations` - Refresh code snippet decorations
- `JSON String Code: Cleanup Temporary Files` - Cleanup temporary files

## Supported File Types

- `.json` - Standard JSON files
- `.jsonc` - JSON files with comments

## Technical Implementation

- Built on the `reactive-vscode` framework
- Uses `jsonc-parser` for JSON AST parsing, supporting JSON with comments
- Uses `minimatch` for file path matching and filtering
- Uses `jsesc` for JavaScript string escaping
- Developed in TypeScript with complete type support
- Uses `tsdown` for efficient build packaging
- Uses `vitest` for unit testing

## Development and Build

```bash
# Install dependencies
pnpm install

# Development mode (watch file changes)
pnpm run dev

# Build
pnpm run build

# Test
pnpm run test

# Watch tests
pnpm run test:watch

# Lint code
pnpm run lint

# Fix code format
pnpm run lint:fix

# Type check
pnpm run typecheck

# Package extension
pnpm run pack:vsce

# Publish to VS Code Marketplace
pnpm run publish:vsce

# Publish to Open VSX
pnpm run publish:ovsx
```

## Examples

Check the `test-example.json` file to understand how the plugin recognizes and handles different types of code snippets. The file contains the following examples:

- **JavaScript Functions**: Automatically recognizes function definitions and complex logic
- **SQL Queries**: Supports simple and complex SQL statements
- **HTML Templates**: Recognizes HTML tags and template syntax
- **CSS Styles**: Supports CSS rules and selectors
- **Regular Expressions**: Recognizes common regex patterns
- **Configuration Scripts**: npm scripts and build configurations

## Configurations

| Key                                               | Description                                  | Type      | Default                                                        |
| ------------------------------------------------- | -------------------------------------------- | --------- | -------------------------------------------------------------- |
| `vscode-json-string-code-editor.include`          | Glob patterns for files where the extension should be active | `array`   | `["**/*.json","**/*.jsonc"]`                                   |
| `vscode-json-string-code-editor.forceCodeKeys`    | Array of key names that should always be treated as code snippets | `array`   | `["script","code","template","function","expression","query"]` |
| `vscode-json-string-code-editor.enableLogging`    | Enable debug logging for the extension | `boolean` | `false`                                                        |
| `vscode-json-string-code-editor.autoCloseTempTab` | Automatically close temporary tab when original file is closed | `boolean` | `false`                                                        |
| `vscode-json-string-code-editor.defaultLanguage`  | Default programming language for temporary edit windows when language cannot be auto-detected | `string`  | `"javascript"`                                                 |

## Commands

| Command                                               | Title                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------- |
| `vscode-json-string-code-editor.editAsCode`           | Edit as Code                                        |
| `vscode-json-string-code-editor.editSnippetFromHover` | Edit Code Snippet from Hover                              |
| `vscode-json-string-code-editor.copySnippetCode`      | Copy Code Snippet                                      |
| `vscode-json-string-code-editor.refreshDecorations`   | Refresh Code Snippet Decorations                                   |
| `vscode-json-string-code-editor.cleanupTempFiles`     | Cleanup Temporary Files                                      |

## License

[MIT](./LICENSE.md) License © 2025 [Drswith](https://github.com/Drswith)
