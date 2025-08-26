# Changelog


## v0.3.6-beta.1...main

[compare changes](https://github.com/Drswith/vscode-json-string-code-editor/compare/v0.3.6-beta.1...main)

### 📖 Documentation

- 添加CHANGELOG.md文件记录项目变更历史 ([ae0b72f](https://github.com/Drswith/vscode-json-string-code-editor/commit/ae0b72f))
- 在README中添加变更日志链接 ([b06ade4](https://github.com/Drswith/vscode-json-string-code-editor/commit/b06ade4))
- 更新README文档添加下载统计和贡献指南 ([ea898e5](https://github.com/Drswith/vscode-json-string-code-editor/commit/ea898e5))

### 🏡 Chore

- 更新 eslint 配置和 package.json 脚本 ([d1c8c26](https://github.com/Drswith/vscode-json-string-code-editor/commit/d1c8c26))

### ❤️ Contributors

- Drswith <540628938@qq.com>

## v0.3.1...v0.3.6-beta.1

[compare changes](https://github.com/Drswith/vscode-json-string-code-editor/compare/v0.3.1...v0.3.6-beta.1)

### 🚀 Enhancements

- **文件处理:** 添加文件排除功能并优化处理逻辑 ([7496c89](https://github.com/Drswith/vscode-json-string-code-editor/commit/7496c89))
- 添加自动检测功能开关配置 ([499df3f](https://github.com/Drswith/vscode-json-string-code-editor/commit/499df3f))
- **检测器:** 重构代码检测逻辑以支持配置化字段检测 ([32e2483](https://github.com/Drswith/vscode-json-string-code-editor/commit/32e2483))
- 添加示例JSON文件用于测试代码检测功能 ([a415019](https://github.com/Drswith/vscode-json-string-code-editor/commit/a415019))

### 🩹 Fixes

- **代码检测:** 修复自动检测字段为空时的逻辑错误 ([a8699f6](https://github.com/Drswith/vscode-json-string-code-editor/commit/a8699f6))
- 修复文件末尾缺少换行符的问题 ([d4ee05b](https://github.com/Drswith/vscode-json-string-code-editor/commit/d4ee05b))

### 💅 Refactors

- **jsesc:** 替换自定义jsesc实现为官方库 ([33ebfe5](https://github.com/Drswith/vscode-json-string-code-editor/commit/33ebfe5))
- 统一将'adapter'重命名为'adaptor' ([f04bac0](https://github.com/Drswith/vscode-json-string-code-editor/commit/f04bac0))
- 将字段名从adaptor2更改为expression ([80a07f9](https://github.com/Drswith/vscode-json-string-code-editor/commit/80a07f9))
- **code-detector:** 重构代码检测逻辑为通用代码块检测 ([4908d57](https://github.com/Drswith/vscode-json-string-code-editor/commit/4908d57))

### 📖 Documentation

- 更新README.md中的配置项文档 ([53fc6df](https://github.com/Drswith/vscode-json-string-code-editor/commit/53fc6df))
- 更新README中语言检测部分的支持语言列表和检测逻辑 ([e6fa266](https://github.com/Drswith/vscode-json-string-code-editor/commit/e6fa266))

### 🏡 Chore

- 从.gitignore中移除src/generated目录 ([fd89936](https://github.com/Drswith/vscode-json-string-code-editor/commit/fd89936))
- Release v0.3.2 ([bb64ec3](https://github.com/Drswith/vscode-json-string-code-editor/commit/bb64ec3))
- 在eslint配置中忽略src/generated目录 ([8d17936](https://github.com/Drswith/vscode-json-string-code-editor/commit/8d17936))
- Release v0.3.3 ([50cfdfb](https://github.com/Drswith/vscode-json-string-code-editor/commit/50cfdfb))
- Release v0.3.4 ([f7e4c88](https://github.com/Drswith/vscode-json-string-code-editor/commit/f7e4c88))
- Release v0.3.5 ([d6a1d7d](https://github.com/Drswith/vscode-json-string-code-editor/commit/d6a1d7d))
- 更新版本至0.3.5并添加lint-staged和simple-git-hooks配置 ([5084e11](https://github.com/Drswith/vscode-json-string-code-editor/commit/5084e11))
- Release v0.3.6-beta.1 ([ca830d1](https://github.com/Drswith/vscode-json-string-code-editor/commit/ca830d1))

### ✅ Tests

- 替换自定义vscode mock为jest-mock-vscode ([8d0a70a](https://github.com/Drswith/vscode-json-string-code-editor/commit/8d0a70a))
- **autoDetectFields:** 重构测试用例使用真实JSON文件并改进模拟配置 ([967706e](https://github.com/Drswith/vscode-json-string-code-editor/commit/967706e))
- 添加测试JSON文件并更新测试用例使用真实文件 ([67c0aab](https://github.com/Drswith/vscode-json-string-code-editor/commit/67c0aab))
- 更新测试配置和模拟文件路径 ([a4f4124](https://github.com/Drswith/vscode-json-string-code-editor/commit/a4f4124))

### 🎨 Styles

- 修复多个配置文件末尾缺少换行符的问题 ([1cf106a](https://github.com/Drswith/vscode-json-string-code-editor/commit/1cf106a))

### ❤️ Contributors

- Drswith <540628938@qq.com>

## v0.2.0...v0.2.1

[compare changes](https://github.com/Drswith/vscode-json-string-code-editor/compare/v0.2.0...v0.2.1)

### 💅 Refactors

- 清理未使用的导入和注释代码 ([ea1149c](https://github.com/Drswith/vscode-json-string-code-editor/commit/ea1149c))

### 🏡 Chore

- Release v0.2.1 ([33f741c](https://github.com/Drswith/vscode-json-string-code-editor/commit/33f741c))

### ❤️ Contributors

- Drswith <drswith@outlook.com>

## v0.1.0...v0.1.4

[compare changes](https://github.com/Drswith/vscode-json-string-code-editor/compare/v0.1.0...v0.1.4)

### 🩹 Fixes

- 回退vscode引擎版本至1.87.0以兼容旧版本 ([91d5e3b](https://github.com/Drswith/vscode-json-string-code-editor/commit/91d5e3b))

### 📖 Documentation

- 更新中英文README文件的配置和命令描述 ([ae9fae1](https://github.com/Drswith/vscode-json-string-code-editor/commit/ae9fae1))
- 移除README文件中的冗余注释标记 ([0a4a99c](https://github.com/Drswith/vscode-json-string-code-editor/commit/0a4a99c))

### 🏡 Chore

- Release v0.1.1 ([cb6d8c8](https://github.com/Drswith/vscode-json-string-code-editor/commit/cb6d8c8))
- Release v0.1.2 ([c369a1b](https://github.com/Drswith/vscode-json-string-code-editor/commit/c369a1b))
- Release v0.1.3 ([b8d12c5](https://github.com/Drswith/vscode-json-string-code-editor/commit/b8d12c5))
- 更新依赖和优化发布流程 ([d9a66dc](https://github.com/Drswith/vscode-json-string-code-editor/commit/d9a66dc))
- Release v0.1.4 ([fb81548](https://github.com/Drswith/vscode-json-string-code-editor/commit/fb81548))

### ❤️ Contributors

- Drswith <540628938@qq.com>

## v0.0.1...v0.0.15

[compare changes](https://github.com/Drswith/vscode-json-string-code-editor/compare/v0.0.1...v0.0.15)

### 🩹 Fixes

- 修正 package.json 中的 publisher 字段大小写 ([bc58210](https://github.com/Drswith/vscode-json-string-code-editor/commit/bc58210))

### 📖 Documentation

- 调整README.md表格对齐格式 ([c9091ed](https://github.com/Drswith/vscode-json-string-code-editor/commit/c9091ed))
- 更新 README 以反映最新功能和配置选项 ([c705fa3](https://github.com/Drswith/vscode-json-string-code-editor/commit/c705fa3))
- 更新README文档以反映最新的编辑功能 ([e8b190b](https://github.com/Drswith/vscode-json-string-code-editor/commit/e8b190b))
- 更新 README.md 中的配置和命令描述为中文 ([ae2a3fb](https://github.com/Drswith/vscode-json-string-code-editor/commit/ae2a3fb))
- 添加简体中文版README文档 ([8928c93](https://github.com/Drswith/vscode-json-string-code-editor/commit/8928c93))

### 📦 Build

- 添加 ovsx 依赖及相关平台支持 ([8e79379](https://github.com/Drswith/vscode-json-string-code-editor/commit/8e79379))

### 🏡 Chore

- 更新 package.json 中的版本号至 0.0.3 ([f27b83e](https://github.com/Drswith/vscode-json-string-code-editor/commit/f27b83e))
- 分离版本和发布命令以优化发布流程 ([f0ae9ad](https://github.com/Drswith/vscode-json-string-code-editor/commit/f0ae9ad))
- Release v0.0.7 ([31f628c](https://github.com/Drswith/vscode-json-string-code-editor/commit/31f628c))
- Release v0.0.6 ([89a69cf](https://github.com/Drswith/vscode-json-string-code-editor/commit/89a69cf))
- 更新 package.json 中的版本管理和发布脚本 ([e54f87f](https://github.com/Drswith/vscode-json-string-code-editor/commit/e54f87f))
- Release v0.0.8 ([23e3f8d](https://github.com/Drswith/vscode-json-string-code-editor/commit/23e3f8d))
- Release v0.0.9 ([af22737](https://github.com/Drswith/vscode-json-string-code-editor/commit/af22737))
- Release v0.0.10 ([356eb4f](https://github.com/Drswith/vscode-json-string-code-editor/commit/356eb4f))
- Release v0.0.11 ([bbb7320](https://github.com/Drswith/vscode-json-string-code-editor/commit/bbb7320))
- Release v0.0.12 ([3f189f0](https://github.com/Drswith/vscode-json-string-code-editor/commit/3f189f0))
- Release v0.0.13 ([af93836](https://github.com/Drswith/vscode-json-string-code-editor/commit/af93836))
- Release v0.0.14 ([0b15c7a](https://github.com/Drswith/vscode-json-string-code-editor/commit/0b15c7a))
- Release v0.0.15 ([9a5fc0d](https://github.com/Drswith/vscode-json-string-code-editor/commit/9a5fc0d))

### 🤖 CI

- **github:** 更新发布工作流以使用独立打包和发布步骤 ([e52687f](https://github.com/Drswith/vscode-json-string-code-editor/commit/e52687f))
- 更新发布工作流并添加对OVSX的支持 ([f0daeda](https://github.com/Drswith/vscode-json-string-code-editor/commit/f0daeda))
- 更新 GitHub Actions 使用的 actions 版本 ([35dc3e3](https://github.com/Drswith/vscode-json-string-code-editor/commit/35dc3e3))
- 移除不必要的构建产物上传步骤并简化发布流程 ([56c2957](https://github.com/Drswith/vscode-json-string-code-editor/commit/56c2957))
- 移除ovsx打包时的--no-dependencies参数 ([0f66a9e](https://github.com/Drswith/vscode-json-string-code-editor/commit/0f66a9e))
- **workflow:** 修复发布扩展时OVSX_TOKEN的使用方式 ([ca51d53](https://github.com/Drswith/vscode-json-string-code-editor/commit/ca51d53))
- 简化发布工作流中的步骤名称和结构 ([e072db9](https://github.com/Drswith/vscode-json-string-code-editor/commit/e072db9))
- 添加自动更新版权年份的工作流 ([ce630fe](https://github.com/Drswith/vscode-json-string-code-editor/commit/ce630fe))
- **workflow:** 更新版权年份工作流并添加构建依赖 ([bb7bde2](https://github.com/Drswith/vscode-json-string-code-editor/commit/bb7bde2))

### ❤️ Contributors

- Drswith <540628938@qq.com>

