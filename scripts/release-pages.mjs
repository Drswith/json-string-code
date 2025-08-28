#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { copyFileSync, cpSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { cwd, exit } from 'node:process'

/**
 * 日志输出函数
 * @param {string} message - 日志消息
 * @param {'info' | 'success' | 'error' | 'warn'} [type] - 日志类型
 */
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString()
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warn: '⚠️',
  }[type]

  console.log(`[${timestamp}] ${prefix} ${message}`)
}

/**
 * 执行命令并输出日志
 * @param {string} command - 要执行的命令
 * @param {string} description - 命令描述
 */
function execCommand(command, description) {
  log(`开始执行: ${description}`, 'info')
  try {
    execSync(command, { stdio: 'inherit', cwd: cwd() })
    log(`完成: ${description}`, 'success')
  }
  catch (error) {
    log(`执行失败: ${description}`, 'error')
    throw error
  }
}

/**
 * 拷贝文件并输出日志
 * @param {string} src - 源文件路径
 * @param {string} dest - 目标文件路径
 * @param {string} description - 拷贝描述
 */
function copyFile(src, dest, description) {
  log(`开始拷贝: ${description}`, 'info')
  try {
    // 确保目标目录存在
    const destDir = resolve(dest, '..')
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    copyFileSync(src, dest)
    log(`拷贝完成: ${src} -> ${dest}`, 'success')
  }
  catch (error) {
    log(`拷贝失败: ${description}`, 'error')
    throw error
  }
}

/**
 * 拷贝目录并输出日志
 * @param {string} src - 源目录路径
 * @param {string} dest - 目标目录路径
 * @param {string} description - 拷贝描述
 */
function copyDirectory(src, dest, description) {
  log(`开始拷贝目录: ${description}`, 'info')
  try {
    if (!existsSync(src)) {
      log(`源目录不存在，跳过: ${src}`, 'warn')
      return
    }

    // 确保目标目录的父目录存在
    const destParent = resolve(dest, '..')
    if (!existsSync(destParent)) {
      mkdirSync(destParent, { recursive: true })
    }

    cpSync(src, dest, { recursive: true, force: true })
    log(`目录拷贝完成: ${src} -> ${dest}`, 'success')
  }
  catch (error) {
    log(`目录拷贝失败: ${description}`, 'error')
    throw error
  }
}

/**
 * 主函数
 * @returns {Promise<void>}
 */
async function main() {
  const rootDir = cwd()
  const docsDir = join(rootDir, 'docs')
  const distDir = join(rootDir, 'dist')

  log('开始执行 release-pages 脚本', 'info')

  try {
    // 步骤 0: 拷贝 README.md 到 docs 目录并重命名为 index.md
    const readmePath = join(rootDir, 'README.md')
    const indexPath = join(docsDir, 'index.md')
    copyFile(readmePath, indexPath, 'README.md -> docs/index.md')

    // 拷贝 LICENSE.md 到 docs 目录
    const licensePath = join(rootDir, 'LICENSE.md')
    const docsLicensePath = join(docsDir, 'LICENSE.md')
    copyFile(licensePath, docsLicensePath, 'LICENSE.md -> docs/LICENSE.md')

    // 步骤 1: 执行 npm run docs:build 构建 VitePress 文档
    execCommand('pnpm run docs:build', 'VitePress 文档构建')

    // 步骤 2: 执行测试并生成覆盖率报告和HTML报告
    // execCommand('pnpm run test:coverage', '生成测试覆盖率报告')

    // 步骤 2: 运行测试并生成HTML报告和覆盖率报告
    execCommand('pnpm run test --reporter=html', '生成Vitest HTML报告和覆盖率报告')

    // 步骤 3: 拷贝 coverage 目录到 dist/coverage
    const coverageSourcePath = join(rootDir, 'coverage')
    const coverageDestPath = join(distDir, 'coverage')
    copyDirectory(coverageSourcePath, coverageDestPath, 'coverage -> dist/coverage')

    log('🎉 release-pages 脚本执行完成！', 'success')
    exit(0)
  }
  catch (error) {
    log(`脚本执行失败: ${error}`, 'error')
    exit(1)
  }
}

// 执行主函数
main()
