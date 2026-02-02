import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { addToast } from "@heroui/react";
import type { ConnectionStatus, LatestMessage } from "./types";

/**
 * Manages message sending and receiving
 */
export const useMessages = (connectionStatus: ConnectionStatus) => {
  const [latestMessage, setLatestMessage] = useState<LatestMessage | null>(
    null,
  );

  const isConnected = connectionStatus.state.type === "connected";

  const sendMessage = useCallback(
    async (message: string) => {
      if (!isConnected) {
        addToast({
          title: "Cannot send message: Connection not ready",
          color: "danger",
        });
        return;
      }

      try {
        await invoke("send_message", {
          content: {
            type: "text",
            content: message,
          },
        });
      } catch (error) {
        addToast({
          title: `Failed to send message: ${error}`,
          color: "danger",
        });
      }
    },
    [isConnected],
  );

  const sendImage = useCallback(
    async (imageData: Uint8Array) => {
      if (!isConnected) {
        addToast({
          title: "Cannot send message: Connection not ready",
          color: "danger",
        });
        return;
      }

      try {
        await invoke("send_message", {
          content: {
            type: "image",
            data: Array.from(imageData),
          },
        });
      } catch (error) {
        addToast({
          title: `Failed to send image: ${error}`,
          color: "danger",
        });
      }
    },
    [isConnected],
  );

  const receiveMessage = useCallback((message: LatestMessage) => {
    setLatestMessage(message);
  }, []);

  const clearMessages = useCallback(() => {
    setLatestMessage(null);
  }, []);

  return {
    // State
    latestMessage,

    // Actions
    sendMessage,
    sendImage,
    receiveMessage,
    clearMessages,
  };
};
