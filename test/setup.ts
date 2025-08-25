// Test setup file for vitest
import { vi } from 'vitest'

// Global test configuration
globalThis.console = {
  ...console,
  // Suppress console.log in tests unless needed
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}