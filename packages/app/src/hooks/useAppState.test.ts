import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAppState } from "./useAppState";

describe("useAppState", () => {
  it("starts in splash state", () => {
    const { result } = renderHook(() => useAppState());
    expect(result.current.appState).toBe("splash");
    expect(result.current.isLoading).toBe(false);
  });

  it("transitions from splash to entry", () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.leaveSplash();
    });

    expect(result.current.appState).toBe("entry");
  });

  it("transitions to connecting and sets loading", () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.leaveSplash();
      result.current.startConnecting();
    });

    expect(result.current.appState).toBe("connecting");
    expect(result.current.isLoading).toBe(true);
  });

  it("transitions to connected and clears loading", () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.leaveSplash();
      result.current.startConnecting();
      result.current.setConnected();
    });

    expect(result.current.appState).toBe("connected");
    expect(result.current.isLoading).toBe(false);
  });

  it("resets to entry state", () => {
    const { result } = renderHook(() => useAppState());

    act(() => {
      result.current.leaveSplash();
      result.current.startConnecting();
      result.current.resetToEntry();
    });

    expect(result.current.appState).toBe("entry");
    expect(result.current.isLoading).toBe(false);
  });
});
