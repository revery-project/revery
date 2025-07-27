import { useState, useEffect, useRef } from "react";
import { Button, Card, CardBody, Textarea } from "@heroui/react";
import { format } from "date-fns";
import {
  PaperAirplaneIcon,
  XMarkIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import {
  ConnectionStatus,
  LatestMessage,
  isImageMessage,
} from "../hooks/useReverySession";

interface ChatViewProps {
  connectionStatus: ConnectionStatus;
  latestMessage: LatestMessage | null;
  onSendMessage: (message: string) => void;
  onSendImage: (imageData: Uint8Array) => void;
  onDisconnect: () => void;
}

export const ChatView = ({
  latestMessage,
  onSendMessage,
  onSendImage,
  onDisconnect,
}: ChatViewProps) => {
  const [newMessage, setNewMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when component mounts
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Only support JPEG and PNG images
    if (file.type !== "image/jpeg" && file.type !== "image/png") {
      return;
    }

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    onSendImage(uint8Array);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      handleImageUpload(file);
    }

    // Reset input so same file can be selected again
    if (e.target) {
      e.target.value = "";
    }
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.type.startsWith("image/")) {
        e.preventDefault();

        const file = item.getAsFile();

        if (file) {
          handleImageUpload(file);
        }

        break;
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      handleSend();
    }
  };

  return (
    <div className="w-full max-w-4xl h-full flex flex-col mx-auto">
      {/* Latest Message */}
      <div className="flex-1 mb-4 p-6">
        <div className="flex-1 flex items-center justify-center relative min-h-0">
          {!latestMessage ? (
            <div className="text-center text-slate-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="w-full max-w-lg">
              <div
                className={
                  "rounded-2xl p-6 shadow-md bg-white text-slate-800 mr-8 ring-1 ring-slate-200/50"
                }
              >
                <div className="text-lg font-medium whitespace-pre-wrap break-words text-left leading-relaxed">
                  {isImageMessage(latestMessage.contentType) ? (
                    <img
                      src={latestMessage.content}
                      alt="Shared image"
                      className="max-w-full max-h-96 rounded-lg"
                    />
                  ) : (
                    latestMessage.content
                  )}
                </div>
                <div className={"text-sm mt-3 text-left text-slate-500"}>
                  {format(latestMessage.timestamp, "h:mm a")}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <Card className="shadow-lg bg-white/90 backdrop-blur-sm border-0 ring-1 ring-slate-200/50">
        <CardBody className="p-4">
          <div className="flex gap-3">
            <Textarea
              ref={textareaRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              minRows={1}
              maxRows={4}
              className="flex-1"
              classNames={{
                inputWrapper:
                  "bg-transparent border-0 shadow-none hover:!bg-transparent group-data-[focus=true]:!bg-transparent",
                input: "text-slate-700 placeholder:text-slate-400",
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              color="default"
              variant="light"
              onPress={() => fileInputRef.current?.click()}
              className="self-end text-slate-500 hover:text-slate-700 transition-colors duration-200"
              isIconOnly
            >
              <PhotoIcon className="w-4 h-4" />
            </Button>
            <Button
              color="primary"
              onPress={handleSend}
              isDisabled={!newMessage.trim()}
              className="self-end shadow-lg bg-slate-700 hover:bg-slate-800 transition-all duration-200 hover:scale-105"
              isIconOnly
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </Button>
            <Button
              color="danger"
              variant="light"
              onPress={onDisconnect}
              className="self-end text-slate-500 hover:text-red-500 transition-colors duration-200"
              isIconOnly
            >
              <XMarkIcon className="w-4 h-4" />
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
