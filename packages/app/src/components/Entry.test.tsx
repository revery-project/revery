import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Entry } from "./Entry";

// Mock HeroUI components to render properly in tests
vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual("@heroui/react");
  return {
    ...actual,
    // Simple Button that respects isDisabled
    Button: ({
      children,
      onPress,
      isDisabled,
      isLoading,
      isIconOnly,
      fullWidth: _fullWidth,
      size: _size,
      className: _className,
      variant: _variant,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
      isLoading?: boolean;
      isIconOnly?: boolean;
      fullWidth?: boolean;
      size?: string;
      className?: string;
      variant?: string;
    }) => (
      <button
        onClick={onPress}
        disabled={isDisabled || isLoading}
        data-icon-only={isIconOnly}
      >
        {children}
      </button>
    ),
    // Simple Input
    Input: ({
      value,
      onChange,
      placeholder,
      isDisabled,
    }: {
      value?: string;
      onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
      placeholder?: string;
      isDisabled?: boolean;
    }) => (
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={isDisabled}
      />
    ),
  };
});

describe("Entry", () => {
  const mockOnHost = vi.fn();
  const mockOnJoin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders in host mode by default", () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    expect(screen.getByText("Your passphrase")).toBeInTheDocument();
    expect(screen.getByText("Create a secure link")).toBeInTheDocument();
    expect(
      screen.getByText("Take suggestion for a quick start"),
    ).toBeInTheDocument();
  });

  it("switches to join mode when clicking Join chat", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    await user.click(screen.getByText("Join chat"));

    expect(screen.getByText("Join existing chat")).toBeInTheDocument();
    expect(screen.getByText("Join secure chat")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Onion address")).toBeInTheDocument();
    // Suggestion box should be hidden in join mode
    expect(
      screen.queryByText("Take suggestion for a quick start"),
    ).not.toBeInTheDocument();
  });

  it("disables submit button when passphrase is empty", () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    const submitButton = screen.getByText("Create a secure link");
    expect(submitButton).toBeDisabled();
  });

  it("enables submit when passphrase is entered in host mode", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    await user.type(screen.getByPlaceholderText("Enter passphrase"), "test123");

    const submitButton = screen.getByText("Create a secure link");
    expect(submitButton).not.toBeDisabled();
  });

  it("requires both address and passphrase in join mode", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    await user.click(screen.getByText("Join chat"));

    // Just passphrase - should still be disabled
    await user.type(screen.getByPlaceholderText("Enter passphrase"), "secret");
    expect(screen.getByText("Join secure chat")).toBeDisabled();

    // Add address - should enable
    await user.type(
      screen.getByPlaceholderText("Onion address"),
      "abc123.onion",
    );
    expect(screen.getByText("Join secure chat")).not.toBeDisabled();
  });

  it("calls onHost with passphrase when hosting", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    await user.type(
      screen.getByPlaceholderText("Enter passphrase"),
      "my secret",
    );
    await user.click(screen.getByText("Create a secure link"));

    expect(mockOnHost).toHaveBeenCalledWith("my secret");
    expect(mockOnJoin).not.toHaveBeenCalled();
  });

  it("calls onJoin with address and passphrase when joining", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    await user.click(screen.getByText("Join chat"));
    await user.type(
      screen.getByPlaceholderText("Onion address"),
      "abc123.onion",
    );
    await user.type(
      screen.getByPlaceholderText("Enter passphrase"),
      "shared secret",
    );
    await user.click(screen.getByText("Join secure chat"));

    expect(mockOnJoin).toHaveBeenCalledWith("abc123.onion", "shared secret");
    expect(mockOnHost).not.toHaveBeenCalled();
  });

  it("disables inputs when loading", () => {
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={true} />);

    expect(screen.getByPlaceholderText("Enter passphrase")).toBeDisabled();
  });

  it("uses suggestion when clicked", async () => {
    const user = userEvent.setup();
    render(<Entry onHost={mockOnHost} onJoin={mockOnJoin} isLoading={false} />);

    // The suggestion button has a generated passphrase
    const suggestionButtons = screen.getAllByRole("button");
    // Find the suggestion text button (it's the one in the middle of the suggestion box)
    const suggestionButton = suggestionButtons.find(
      (btn) =>
        btn.textContent &&
        !["Create chat", "Join chat", "Create a secure link"].includes(
          btn.textContent,
        ) &&
        !btn.hasAttribute("data-icon-only"),
    );

    if (suggestionButton) {
      const suggestionText = suggestionButton.textContent;
      await user.click(suggestionButton);

      const input = screen.getByPlaceholderText(
        "Enter passphrase",
      ) as HTMLInputElement;
      expect(input.value).toBe(suggestionText);
    }
  });
});
