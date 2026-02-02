import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addToast } from "@heroui/react";
import type {
  ConnectionStatus,
  SessionUpdate,
  LatestMessage,
  MessagePayload,
  ContentType,
} from "./types";

interface ConnectionCallbacks {
  onConnected: () => void;
  onDisconnected: () => void;
  onError: () => void;
  onAuthSuccess: () => void;
  onMessageReceived: (message: LatestMessage) => void;
}

/**
 * Manages Tauri IPC connection and event listeners
 */
export const useConnection = (callbacks: ConnectionCallbacks) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    state: { type: "disconnected" },
  });
  const [logs, setLogs] = useState<string[]>([]);
  const [hostAddress, setHostAddress] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState("");

  const listenersSetUp = useRef(false);
  const callbacksRef = useRef(callbacks);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Set up Tauri event listeners
  useEffect(() => {
    if (listenersSetUp.current) return;
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
            addToast({ title: update.message, color: "danger" });
            callbacksRef.current.onError();
          } else if (update.type === "warning") {
            addToast({ title: update.message, color: "warning" });
          } else if (
            update.type === "success" &&
            update.message.includes("Authentication successful")
          ) {
            setTimeout(() => {
              callbacksRef.current.onAuthSuccess();
            }, 100);
          }
        },
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
            callbacksRef.current.onConnected();
          } else if (status.state.type === "disconnected") {
            setHostAddress("");
            addToast({ title: "Connection lost", color: "warning" });
            callbacksRef.current.onDisconnected();
          }
        },
      );

      // Incoming messages
      const unlistenMessageReceived = await listen<MessagePayload>(
        "message_received",
        (event) => {
          const messageData = event.payload;
          callbacksRef.current.onMessageReceived({
            content: messageData.content,
            timestamp: new Date(),
            contentType: messageData.content_type as ContentType,
          });
        },
      );

      // Sent message confirmations (currently unused)
      const unlistenMessageSent = await listen<MessagePayload>(
        "message_sent",
        () => {
          // Message sent successfully - could add confirmation UI here
        },
      );

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
      cleanup?.();
      listenersSetUp.current = false;
    };
  }, []);

  // Actions
  const hostSession = useCallback(async (passphrase: string) => {
    setLogs([]);
    try {
      await invoke("host_session", { secret: passphrase });
    } catch (error) {
      addToast({ title: `Failed to host session: ${error}`, color: "danger" });
      throw error;
    }
  }, []);

  const joinSession = useCallback(
    async (address: string, passphrase: string) => {
      setLogs([]);
      try {
        await invoke("join_session", { address, secret: passphrase });
      } catch (error) {
        addToast({
          title: `Failed to join session: ${error}`,
          color: "danger",
        });
        throw error;
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    if (currentSessionId) {
      try {
        await invoke("disconnect_session", { sessionId: currentSessionId });
      } catch (error) {
        console.error("Failed to disconnect:", error);
        addToast({ title: "Failed to disconnect cleanly", color: "warning" });
      }
    }

    // Reset connection state
    setConnectionStatus({ state: { type: "disconnected" } });
    setLogs([]);
    setCurrentSessionId("");
    setHostAddress("");
  }, [currentSessionId]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    // State
    connectionStatus,
    logs,
    hostAddress,

    // Actions
    hostSession,
    joinSession,
    disconnect,
    clearLogs,
  };
};
