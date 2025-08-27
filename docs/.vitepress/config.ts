import path from 'node:path'
import process from 'node:process'
import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'en-US',
  title: 'JSON String Code Editor',
  description: 'Enhanced JSON schema code snippet editing experience with temporary code editor tabs',
  // base: '/vscode-json-string-code-editor/',

  head: [
    // ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'theme-color', content: '#007acc' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'JSON String Code Editor' }],
  ],

  themeConfig: {

    nav: [
      {
        text: 'Links',
        items: [
          { text: 'VS Code Marketplace', link: 'https://marketplace.visualstudio.com/items?itemName=Drswith.vscode-json-string-code-editor' },
          { text: 'Open VSX', link: 'https://open-vsx.org/extension/Drswith/vscode-json-string-code-editor' },
          { text: 'GitHub', link: 'https://github.com/Drswith/vscode-json-string-code-editor' },
          { text: 'Issues', link: 'https://github.com/Drswith/vscode-json-string-code-editor/issues' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Drswith/vscode-json-string-code-editor' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Drswith',
    },

    editLink: {
      pattern: 'https://github.com/Drswith/vscode-json-string-code-editor/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
  outDir: path.resolve(process.cwd(), 'dist'),
})
