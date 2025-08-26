import * as os from 'node:os'
import * as path from 'node:path'
import * as vscode from 'vscode'

/**
 * 获取扩展专用的临时目录路径
 * @returns 临时目录的 URI
 */
export function getTempDirectoryUri(): vscode.Uri {
  const systemTmpDir = os.tmpdir()
  const extensionTmpDir = path.join(systemTmpDir, 'vscode-json-string-code-editor')
  return vscode.Uri.file(extensionTmpDir)
}

/**
 * 确保临时目录存在
 * @returns Promise<void>
 */
export async function ensureTempDirectoryExists(): Promise<void> {
  const tmpDirUri = getTempDirectoryUri()
  try {
    await vscode.workspace.fs.stat(tmpDirUri)
  }
  catch {
    await vscode.workspace.fs.createDirectory(tmpDirUri)
  }
}
