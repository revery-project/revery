import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatView } from "./ChatView";
import type { ConnectionStatus, LatestMessage } from "../hooks/types";
import { ContentType } from "../hooks/types";

// Mock date-fns format to avoid timezone issues in tests
vi.mock("date-fns", () => ({
  format: () => "12:00",
}));

// Mock HeroUI
vi.mock("@heroui/react", async () => {
  const actual = await vi.importActual("@heroui/react");
  return {
    ...actual,
    Button: ({
      children,
      onPress,
      isIconOnly,
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isIconOnly?: boolean;
    }) => (
      <button onClick={onPress} data-icon-only={isIconOnly}>
        {children}
      </button>
    ),
  };
});

describe("ChatView", () => {
  const connectedStatus: ConnectionStatus = {
    state: { type: "connected" },
  };

  const disconnectedStatus: ConnectionStatus = {
    state: { type: "disconnected" },
  };

  const mockSendMessage = vi.fn();
  const mockSendImage = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows online status when connected", () => {
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    expect(screen.getByText("Other user is online")).toBeInTheDocument();
  });

  it("shows empty state when no messages", () => {
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    expect(
      screen.getByText("No messages yet. Start the conversation!"),
    ).toBeInTheDocument();
  });

  it("sends message on Enter key", async () => {
    const user = userEvent.setup();
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    const input = screen.getByPlaceholderText("Type your message");
    await user.type(input, "Hello world{enter}");

    expect(mockSendMessage).toHaveBeenCalledWith("Hello world");
  });

  it("clears input after sending", async () => {
    const user = userEvent.setup();
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    const input = screen.getByPlaceholderText(
      "Type your message",
    ) as HTMLInputElement;
    await user.type(input, "Hello{enter}");

    expect(input.value).toBe("");
  });

  it("does not send empty messages", async () => {
    const user = userEvent.setup();
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    const input = screen.getByPlaceholderText("Type your message");
    await user.type(input, "   {enter}");

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it("displays received messages", async () => {
    const latestMessage: LatestMessage = {
      content: "Hello from peer",
      timestamp: new Date(),
      contentType: ContentType.Text,
    };

    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={latestMessage}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Hello from peer")).toBeInTheDocument();
    });
  });

  it("calls disconnect when End chat is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    await user.click(screen.getByText("End chat"));

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("shows secure connection footer", () => {
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    expect(screen.getByText("Secure connection active")).toBeInTheDocument();
  });

  it("displays sent messages locally", async () => {
    const user = userEvent.setup();
    render(
      <ChatView
        connectionStatus={connectedStatus}
        latestMessage={null}
        onSendMessage={mockSendMessage}
        onSendImage={mockSendImage}
        onDisconnect={mockDisconnect}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Type your message"),
      "My sent message{enter}",
    );

    await waitFor(() => {
      expect(screen.getByText("My sent message")).toBeInTheDocument();
    });
  });
});
