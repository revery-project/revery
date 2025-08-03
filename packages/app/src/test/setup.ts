import '@testing-library/jest-dom'

// Mock Tauri API
const mockInvoke = vi.fn()
const mockListen = vi.fn()
const mockAddToast = vi.fn()

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}))

vi.mock('@heroui/react', async () => {
  const actual = await vi.importActual('@heroui/react')
  return {
    ...actual,
    addToast: mockAddToast,
  }
})

// Make mocks available globally for tests
global.mockInvoke = mockInvoke
global.mockListen = mockListen
global.mockAddToast = mockAddToast