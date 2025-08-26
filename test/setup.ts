// Test setup file for vitest
import { vi } from 'vitest'

// Mock vscode module
vi.mock('vscode', async () => (await import('jest-mock-vscode')).createVSCodeMock(vi))
