import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { addToast } from "@heroui/react";
import { useMessages } from "./useMessages";
import type { ConnectionStatus } from "./types";

vi.mock("@tauri-apps/api/core");
vi.mock("@heroui/react", () => ({
  addToast: vi.fn(),
}));

describe("useMessages", () => {
  const connectedStatus: ConnectionStatus = {
    state: { type: "connected" },
  };

  const disconnectedStatus: ConnectionStatus = {
    state: { type: "disconnected" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with no messages", () => {
    const { result } = renderHook(() => useMessages(connectedStatus));
    expect(result.current.latestMessage).toBeNull();
  });

  it("prevents sending when disconnected", async () => {
    const { result } = renderHook(() => useMessages(disconnectedStatus));

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(invoke).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Cannot send message: Connection not ready",
        color: "danger",
      }),
    );
  });

  it("sends text message when connected", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useMessages(connectedStatus));

    await act(async () => {
      await result.current.sendMessage("hello world");
    });

    expect(invoke).toHaveBeenCalledWith("send_message", {
      content: {
        type: "text",
        content: "hello world",
      },
    });
  });

  it("sends image when connected", async () => {
    vi.mocked(invoke).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useMessages(connectedStatus));

    const imageData = new Uint8Array([1, 2, 3, 4]);

    await act(async () => {
      await result.current.sendImage(imageData);
    });

    expect(invoke).toHaveBeenCalledWith("send_message", {
      content: {
        type: "image",
        data: [1, 2, 3, 4],
      },
    });
  });

  it("handles send errors gracefully", async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useMessages(connectedStatus));

    await act(async () => {
      await result.current.sendMessage("test");
    });

    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Failed to send message"),
        color: "danger",
      }),
    );
  });

  it("receives and stores messages", () => {
    const { result } = renderHook(() => useMessages(connectedStatus));

    act(() => {
      result.current.receiveMessage({
        content: "received message",
        timestamp: new Date(),
        contentType: 0, // Text
      });
    });

    expect(result.current.latestMessage).toEqual(
      expect.objectContaining({
        content: "received message",
        contentType: 0,
      }),
    );
  });

  it("clears messages", () => {
    const { result } = renderHook(() => useMessages(connectedStatus));

    act(() => {
      result.current.receiveMessage({
        content: "test",
        timestamp: new Date(),
        contentType: 0,
      });
    });

    expect(result.current.latestMessage).not.toBeNull();

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.latestMessage).toBeNull();
  });
});
