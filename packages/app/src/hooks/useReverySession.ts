import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addToast } from "@heroui/react";

// Content types matching backend enum
export enum ContentType {
  Text = 0,
  Image = 1,
}

// Utility functions for content type checking
export const isTextMessage = (contentType: ContentType): boolean => {
  return contentType === ContentType.Text;
};

export const isImageMessage = (contentType: ContentType): boolean => {
  return contentType === ContentType.Image;
};

// Types
type UpdateType =
  | "status"
  | "info"
  | "success"
  | "error"
  | "warning"
  | "debug"
  | "message_sent"
  | "message_received";

export interface SessionUpdate {
  type: UpdateType;
  message: string;
  data?: any;
}

export interface ConnectionState {
  type: "disconnected" | "connecting" | "waiting" | "connected";
  onion_address?: string;
}

export interface ConnectionStatus {
  state: ConnectionState;
}

export interface LatestMessage {
  content: string;
  timestamp: Date;
  contentType: ContentType;
}

type AppState = "entry" | "connecting" | "connected";

export const useReverySession = () => {
  // Core state
  const [appState, setAppState] = useState<AppState>("entry");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: { type: "disconnected" },
  });
  const [latestMessage, setLatestMessage] = useState<LatestMessage | null>(
    null
  );
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [hostAddress, setHostAddress] = useState<string>("");

  // Track if listeners are already set up to prevent duplicates
  const listenersSetUp = useRef(false);

  // Set up event listeners for backend communication
  useEffect(() => {
    if (listenersSetUp.current) {
      return;
    }
    listenersSetUp.current = true;
    const setupListeners = async () => {
      // Session updates (progress, errors, etc.)
      const unlistenSessionUpdate = await listen<SessionUpdate>(
        "session_update",
        (event) => {
          const update = event.payload;
          setLogs((prev) => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ${update.message}`,
          ]);

          if (update.type === "error") {
            addToast({
              title: update.message,
              color: "danger",
            });
            setIsLoading(false);
            setAppState("entry");
          } else if (update.type === "warning") {
            addToast({
              title: update.message,
              color: "warning",
            });
          } else if (
            update.type === "success" &&
            update.message.includes("Authentication successful")
          ) {
            // Add small delay to ensure conversation is fully set up
            setTimeout(() => {
              setAppState("connected");
              setIsLoading(false);
            }, 100);
          }
        }
      );

      // Connection status changes
      const unlistenConnectionStatus = await listen<ConnectionStatus>(
        "connection_status",
        (event) => {
          const status = event.payload;
          setConnectionStatus(status);

          if (status.state.type === "waiting" && status.state.onion_address) {
            setCurrentSessionId(status.state.onion_address);
            setHostAddress(status.state.onion_address);
          }

          if (status.state.type === "connected") {
            setAppState("connected");
            setIsLoading(false);
          } else if (status.state.type === "disconnected") {
            setAppState("entry");
            setIsLoading(false);
            setLatestMessage(null);
            setLogs([]);
            setHostAddress("");
            addToast({
              title: "Connection lost",
              color: "warning",
            });
          }
        }
      );

      // Incoming messages
      const unlistenMessageReceived = await listen<{
        content: string;
        content_type: number;
      }>("message_received", (event) => {
        const messageData = event.payload;
        setLatestMessage({
          content: messageData.content,
          timestamp: new Date(),
          contentType: messageData.content_type as ContentType,
        });
      });

      // Sent message confirmations (don't show on sender side)
      const unlistenMessageSent = await listen<{
        content: string;
        content_type: number;
      }>("message_sent", (_) => {
        // Message sent successfully, but don't display it
        // Only received messages are shown in the UI
      });

      return () => {
        unlistenSessionUpdate();
        unlistenConnectionStatus();
        unlistenMessageReceived();
        unlistenMessageSent();
      };
    };

    let cleanup: (() => void) | undefined;

    setupListeners().then((cleanupFn) => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
      listenersSetUp.current = false;
    };
  }, []);

  // Actions
  const hostSession = async (passphrase: string) => {
    setIsLoading(true);
    setAppState("connecting");
    setLogs([]);

    try {
      await invoke("host_session", { secret: passphrase });
    } catch (error) {
      addToast({
        title: `Failed to host session: ${error}`,
        color: "danger",
      });
      setIsLoading(false);
      setAppState("entry");
    }
  };

  const joinSession = async (address: string, passphrase: string) => {
    setIsLoading(true);
    setAppState("connecting");
    setLogs([]);

    try {
      await invoke("join_session", { address, secret: passphrase });
    } catch (error) {
      addToast({
        title: `Failed to join session: ${error}`,
        color: "danger",
      });
      setIsLoading(false);
      setAppState("entry");
    }
  };

  const sendMessage = async (message: string) => {
    // Don't allow sending messages unless we're fully connected
    if (connectionStatus.state.type !== "connected") {
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
  };

  const disconnect = async () => {
    if (currentSessionId) {
      try {
        await invoke("disconnect_session", { sessionId: currentSessionId });
      } catch (error) {
        console.error("Failed to disconnect:", error);
        addToast({
          title: "Failed to disconnect cleanly",
          color: "warning",
        });
      }
    }

    // Reset state
    setAppState("entry");
    setConnectionStatus({ state: { type: "disconnected" } });
    setLatestMessage(null);
    setLogs([]);
    setCurrentSessionId("");
    setHostAddress("");
    setIsLoading(false);
  };

  const sendImage = async (imageData: Uint8Array) => {
    // Don't allow sending messages unless we're fully connected
    if (connectionStatus.state.type !== "connected") {
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
  };

  return {
    // State
    appState,
    connectionStatus,
    latestMessage,
    logs,
    isLoading,
    hostAddress,

    // Actions
    hostSession,
    joinSession,
    sendMessage,
    sendImage,
    disconnect,
  };
};
