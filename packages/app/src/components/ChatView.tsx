import { useState, useEffect, useRef } from "react";
import { Button } from "@heroui/react";
import { format } from "date-fns";
import { PlusIcon } from "@heroicons/react/24/outline";
import {
  ConnectionStatus,
  LatestMessage,
  isImageMessage,
} from "../hooks/useReverySession";

interface Message {
  id: string;
  content: string;
  contentType: "text" | "image";
  timestamp: Date;
  isSent: boolean;
}

interface ChatViewProps {
  connectionStatus: ConnectionStatus;
  latestMessage: LatestMessage | null;
  onSendMessage: (message: string) => void;
  onSendImage: (imageData: Uint8Array) => void;
  onDisconnect: () => void;
}

export const ChatView = ({
  connectionStatus,
  latestMessage,
  onSendMessage,
  onSendImage,
  onDisconnect,
}: ChatViewProps) => {
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isConnected = connectionStatus.state.type === "connected";

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Add received messages to the list
  useEffect(() => {
    if (latestMessage) {
      const newMsg: Message = {
        id: `received-${Date.now()}`,
        content: latestMessage.content,
        contentType: isImageMessage(latestMessage.contentType)
          ? "image"
          : "text",
        timestamp: latestMessage.timestamp,
        isSent: false,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  }, [latestMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      const msg: Message = {
        id: `sent-${Date.now()}`,
        content: newMessage.trim(),
        contentType: "text",
        timestamp: new Date(),
        isSent: true,
      };
      setMessages((prev) => [...prev, msg]);
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.type !== "image/jpeg" && file.type !== "image/png") return;

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Create a data URL for display
    const reader = new FileReader();
    reader.onload = () => {
      const msg: Message = {
        id: `sent-${Date.now()}`,
        content: reader.result as string,
        contentType: "image",
        timestamp: new Date(),
        isSent: true,
      };
      setMessages((prev) => [...prev, msg]);
    };
    reader.readAsDataURL(file);

    onSendImage(uint8Array);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    if (e.target) {
      e.target.value = "";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-gray-900 text-sm">Other user is online</span>
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
        </div>
        <button
          onClick={onDisconnect}
          className="text-gray-900 text-sm font-semibold hover:text-gray-600 transition-colors"
        >
          End chat
        </button>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400 text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.isSent ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.isSent
                    ? "bg-brand text-white rounded-br-md"
                    : "bg-gray-100 text-gray-900 rounded-bl-md"
                }`}
              >
                {msg.contentType === "image" ? (
                  <img
                    src={msg.content}
                    alt="Shared image"
                    className="max-w-full max-h-64 rounded-lg"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.isSent ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {format(msg.timestamp, "HH:mm")}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-3">
          {/* Plus button for attachments */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            isIconOnly
            variant="light"
            className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
            onPress={() => fileInputRef.current?.click()}
          >
            <PlusIcon className="w-6 h-6" />
          </Button>

          {/* Message input */}
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              placeholder="Type your message"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              className="w-full bg-gray-100 text-gray-900 text-sm rounded-full px-4 py-3 border-0 focus:outline-none focus:ring-2 focus:ring-brand/20 placeholder:text-gray-400"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 pt-1">
        <p className="text-center text-gray-400 text-xs">
          Secure connection active
        </p>
      </div>
    </div>
  );
};
