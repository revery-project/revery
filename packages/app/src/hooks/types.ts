/**
 * Shared types for Revery session hooks
 */

// App state machine
export type AppState = "splash" | "entry" | "connecting" | "connected";

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

// Session update types from backend
export type UpdateType =
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
  data?: unknown;
}

// Connection state from backend
export interface ConnectionState {
  type: "disconnected" | "connecting" | "waiting" | "connected";
  onion_address?: string;
}

export interface ConnectionStatus {
  state: ConnectionState;
}

// Message types
export interface LatestMessage {
  content: string;
  timestamp: Date;
  contentType: ContentType;
}

// Backend message payload
export interface MessagePayload {
  content: string;
  content_type: number;
}
