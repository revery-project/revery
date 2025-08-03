import { renderHook, act, waitFor } from '@testing-library/react'
import { useReverySession, ContentType } from '../hooks/useReverySession'

describe('useReverySession Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Reset mock implementations
    global.mockInvoke.mockResolvedValue(undefined)
    global.mockListen.mockResolvedValue(() => {})
    global.mockAddToast.mockImplementation(() => {})
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useReverySession())
    
    expect(result.current.appState).toBe('entry')
    expect(result.current.connectionStatus.state.type).toBe('disconnected')
    expect(result.current.latestMessage).toBeNull()
    expect(result.current.logs).toEqual([])
    expect(result.current.isLoading).toBe(false)
    expect(result.current.hostAddress).toBe('')
  })

  it('provides all expected functions', () => {
    const { result } = renderHook(() => useReverySession())
    
    expect(typeof result.current.hostSession).toBe('function')
    expect(typeof result.current.joinSession).toBe('function')
    expect(typeof result.current.sendMessage).toBe('function')
    expect(typeof result.current.sendImage).toBe('function')
    expect(typeof result.current.disconnect).toBe('function')
  })

  it('calls invoke with correct parameters for hosting session', async () => {
    const { result } = renderHook(() => useReverySession())
    
    await act(async () => {
      await result.current.hostSession('test-passphrase')
    })
    
    expect(global.mockInvoke).toHaveBeenCalledWith('host_session', {
      secret: 'test-passphrase'
    })
  })

  it('calls invoke with correct parameters for joining session', async () => {
    const { result } = renderHook(() => useReverySession())
    
    await act(async () => {
      await result.current.joinSession('test.onion', 'test-passphrase')
    })
    
    expect(global.mockInvoke).toHaveBeenCalledWith('join_session', {
      address: 'test.onion',
      secret: 'test-passphrase'
    })
  })

  it('sets loading state when hosting session', async () => {
    const { result } = renderHook(() => useReverySession())
    
    act(() => {
      result.current.hostSession('test-passphrase')
    })
    
    expect(result.current.isLoading).toBe(true)
    expect(result.current.appState).toBe('connecting')
  })

  it('sets loading state when joining session', async () => {
    const { result } = renderHook(() => useReverySession())
    
    act(() => {
      result.current.joinSession('test.onion', 'test-passphrase')
    })
    
    expect(result.current.isLoading).toBe(true)
    expect(result.current.appState).toBe('connecting')
  })

  it('sends text message with correct format', async () => {
    const { result } = renderHook(() => useReverySession())
    
    // Set connected state
    act(() => {
      result.current.connectionStatus.state.type = 'connected'
    })
    
    await act(async () => {
      await result.current.sendMessage('Hello world')
    })
    
    expect(global.mockInvoke).toHaveBeenCalledWith('send_message', {
      content: {
        type: 'text',
        content: 'Hello world'
      }
    })
  })

  it('sends image with correct format', async () => {
    const { result } = renderHook(() => useReverySession())
    
    // Set connected state
    act(() => {
      result.current.connectionStatus.state.type = 'connected'
    })
    
    const imageData = new Uint8Array([1, 2, 3, 4])
    
    await act(async () => {
      await result.current.sendImage(imageData)
    })
    
    expect(global.mockInvoke).toHaveBeenCalledWith('send_message', {
      content: {
        type: 'image',
        data: [1, 2, 3, 4]
      }
    })
  })

  it('prevents sending messages when not connected', async () => {
    const { result } = renderHook(() => useReverySession())
    
    // Ensure disconnected state
    expect(result.current.connectionStatus.state.type).toBe('disconnected')
    
    await act(async () => {
      await result.current.sendMessage('Hello world')
    })
    
    expect(global.mockInvoke).not.toHaveBeenCalledWith('send_message', expect.any(Object))
    expect(global.mockAddToast).toHaveBeenCalledWith({
      title: 'Cannot send message: Connection not ready',
      color: 'danger'
    })
  })

  it('prevents sending images when not connected', async () => {
    const { result } = renderHook(() => useReverySession())
    
    const imageData = new Uint8Array([1, 2, 3, 4])
    
    await act(async () => {
      await result.current.sendImage(imageData)
    })
    
    expect(global.mockInvoke).not.toHaveBeenCalledWith('send_message', expect.any(Object))
    expect(global.mockAddToast).toHaveBeenCalledWith({
      title: 'Cannot send message: Connection not ready',
      color: 'danger'
    })
  })

  it('handles host session errors', async () => {
    global.mockInvoke.mockRejectedValueOnce(new Error('Connection failed'))
    
    const { result } = renderHook(() => useReverySession())
    
    await act(async () => {
      await result.current.hostSession('test-passphrase')
    })
    
    expect(global.mockAddToast).toHaveBeenCalledWith({
      title: 'Failed to host session: Error: Connection failed',
      color: 'danger'
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.appState).toBe('entry')
  })

  it('handles join session errors', async () => {
    global.mockInvoke.mockRejectedValueOnce(new Error('Connection failed'))
    
    const { result } = renderHook(() => useReverySession())
    
    await act(async () => {
      await result.current.joinSession('test.onion', 'test-passphrase')
    })
    
    expect(global.mockAddToast).toHaveBeenCalledWith({
      title: 'Failed to join session: Error: Connection failed',
      color: 'danger'
    })
    expect(result.current.isLoading).toBe(false)
    expect(result.current.appState).toBe('entry')
  })

  it('resets state on disconnect', async () => {
    const { result } = renderHook(() => useReverySession())
    
    // Set some state first
    act(() => {
      result.current.appState = 'connected'
      result.current.connectionStatus.state.type = 'connected'
      result.current.latestMessage = {
        content: 'test',
        timestamp: new Date(),
        contentType: ContentType.Text
      }
      result.current.logs = ['test log']
      result.current.hostAddress = 'test.onion'
      result.current.isLoading = true
    })
    
    await act(async () => {
      await result.current.disconnect()
    })
    
    expect(result.current.appState).toBe('entry')
    expect(result.current.connectionStatus.state.type).toBe('disconnected')
    expect(result.current.latestMessage).toBeNull()
    expect(result.current.logs).toEqual([])
    expect(result.current.hostAddress).toBe('')
    expect(result.current.isLoading).toBe(false)
  })
})