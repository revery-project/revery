import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Entry } from '../components/Entry'

describe('Entry Component', () => {
  const mockOnHost = vi.fn()
  const mockOnJoin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders entry form with inputs and buttons', () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /host/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument()
  })

  it('disables host button when passphrase is empty', () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const hostButton = screen.getByRole('button', { name: /host/i })
    expect(hostButton).toBeDisabled()
  })

  it('disables join button when passphrase or address is empty', () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const joinButton = screen.getByRole('button', { name: /join/i })
    expect(joinButton).toBeDisabled()
  })

  it('enables host button when passphrase is provided', async () => {
    const user = userEvent.setup()
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const passphraseInput = screen.getByLabelText(/passphrase/i)
    const hostButton = screen.getByRole('button', { name: /host/i })
    
    await user.type(passphraseInput, 'test-passphrase')
    
    expect(hostButton).not.toBeDisabled()
  })

  it('enables join button when both passphrase and address are provided', async () => {
    const user = userEvent.setup()
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const passphraseInput = screen.getByLabelText(/passphrase/i)
    const addressInput = screen.getByLabelText(/address/i)
    const joinButton = screen.getByRole('button', { name: /join/i })
    
    await user.type(passphraseInput, 'test-passphrase')
    await user.type(addressInput, 'test.onion')
    
    expect(joinButton).not.toBeDisabled()
  })

  it('calls onHost with trimmed passphrase when host button is clicked', async () => {
    const user = userEvent.setup()
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const passphraseInput = screen.getByLabelText(/passphrase/i)
    const hostButton = screen.getByRole('button', { name: /host/i })
    
    await user.type(passphraseInput, '  test-passphrase  ')
    await user.click(hostButton)
    
    expect(mockOnHost).toHaveBeenCalledWith('test-passphrase')
  })

  it('calls onJoin with trimmed values when join button is clicked', async () => {
    const user = userEvent.setup()
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const passphraseInput = screen.getByLabelText(/passphrase/i)
    const addressInput = screen.getByLabelText(/address/i)
    const joinButton = screen.getByRole('button', { name: /join/i })
    
    await user.type(passphraseInput, '  test-passphrase  ')
    await user.type(addressInput, '  test.onion  ')
    await user.click(joinButton)
    
    expect(mockOnJoin).toHaveBeenCalledWith('test.onion', 'test-passphrase')
  })

  it('disables inputs and buttons when loading', () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={true} />)
    
    expect(screen.getByLabelText(/passphrase/i)).toBeDisabled()
    expect(screen.getByLabelText(/address/i)).toBeDisabled()
    expect(screen.getByRole('button', { name: /host/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /join/i })).toBeDisabled()
  })

  it('does not call onHost when passphrase is only whitespace', async () => {
    const user = userEvent.setup()
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />)
    
    const passphraseInput = screen.getByLabelText(/passphrase/i)
    const hostButton = screen.getByRole('button', { name: /host/i })
    
    await user.type(passphraseInput, '   ')
    
    expect(hostButton).toBeDisabled()
  })
})