import { useState, useCallback } from "react";
import type { AppState } from "./types";

/**
 * Manages the app state machine: splash → entry → connecting → connected
 */
export const useAppState = () => {
  const [appState, setAppState] = useState<AppState>("splash");
  const [isLoading, setIsLoading] = useState(false);

  const leaveSplash = useCallback(() => {
    setAppState("entry");
  }, []);

  const startConnecting = useCallback(() => {
    setIsLoading(true);
    setAppState("connecting");
  }, []);

  const setConnected = useCallback(() => {
    setAppState("connected");
    setIsLoading(false);
  }, []);

  const resetToEntry = useCallback(() => {
    setAppState("entry");
    setIsLoading(false);
  }, []);

  const setLoadingState = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return {
    // State
    appState,
    isLoading,

    // Actions
    leaveSplash,
    startConnecting,
    setConnected,
    resetToEntry,
    setLoadingState,
  };
};
