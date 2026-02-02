import { useCallback, useRef, useEffect } from "react";
import { useAppState } from "./useAppState";
import { useConnection } from "./useConnection";
import { useMessages } from "./useMessages";
import type { LatestMessage } from "./types";

// Re-export types for consumers
export { ContentType, isTextMessage, isImageMessage } from "./types";
export type {
  AppState,
  ConnectionStatus,
  LatestMessage,
  SessionUpdate,
} from "./types";

/**
 * Main orchestration hook for Revery sessions.
 * Composes useAppState, useConnection, and useMessages into a unified API.
 */
export const useReverySession = () => {
  // App state machine
  const {
    appState,
    isLoading,
    leaveSplash,
    startConnecting,
    setConnected,
    resetToEntry,
  } = useAppState();

  // Refs for callbacks to avoid stale closures
  const receiveMessageRef = useRef<(message: LatestMessage) => void>(() => {});

  // Connection callbacks using refs
  const connectionCallbacks = {
    onConnected: () => setConnected(),
    onDisconnected: () => resetToEntry(),
    onError: () => resetToEntry(),
    onAuthSuccess: () => setConnected(),
    onMessageReceived: (message: LatestMessage) =>
      receiveMessageRef.current(message),
  };

  // Connection management
  const {
    connectionStatus,
    logs,
    hostAddress,
    hostSession: doHostSession,
    joinSession: doJoinSession,
    disconnect: doDisconnect,
  } = useConnection(connectionCallbacks);

  // Message handling
  const {
    latestMessage,
    sendMessage,
    sendImage,
    receiveMessage,
    clearMessages,
  } = useMessages(connectionStatus);

  // Keep receiveMessage ref updated
  useEffect(() => {
    receiveMessageRef.current = receiveMessage;
  }, [receiveMessage]);

  // Orchestrated actions that coordinate between hooks
  const hostSession = useCallback(
    async (passphrase: string) => {
      startConnecting();
      try {
        await doHostSession(passphrase);
      } catch {
        resetToEntry();
      }
    },
    [startConnecting, doHostSession, resetToEntry],
  );

  const joinSession = useCallback(
    async (address: string, passphrase: string) => {
      startConnecting();
      try {
        await doJoinSession(address, passphrase);
      } catch {
        resetToEntry();
      }
    },
    [startConnecting, doJoinSession, resetToEntry],
  );

  const disconnect = useCallback(async () => {
    await doDisconnect();
    clearMessages();
    resetToEntry();
  }, [doDisconnect, clearMessages, resetToEntry]);

  return {
    // State
    appState,
    connectionStatus,
    latestMessage,
    logs,
    isLoading,
    hostAddress,

    // Actions
    leaveSplash,
    hostSession,
    joinSession,
    sendMessage,
    sendImage,
    disconnect,
  };
};
