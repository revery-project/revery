import { Button } from "@heroui/react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import { ConnectionStatus } from "../hooks/useReverySession";
import { ReveryLogo } from "../assets/ReveryLogo";

interface ConnectingViewProps {
  onionAddress?: string;
  logs: string[];
  connectionStatus?: ConnectionStatus;
}

export const ConnectingView = ({
  onionAddress,
  logs,
  connectionStatus,
}: ConnectingViewProps) => {
  // Check if we're waiting for someone to join (service is ready)
  const isWaitingForJoin = connectionStatus?.state.type === "waiting";

  // Ref for auto-scrolling logs
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const copyAddress = () => {
    if (onionAddress) {
      navigator.clipboard.writeText(onionAddress);
    }
  };

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-center p-6">
        <ReveryLogo
          className="w-12 h-12"
          fillColor="#2563EB"
          eyeColor="white"
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-8 overflow-hidden">
        {/* Status text */}
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          {isWaitingForJoin ? "Waiting for peer" : "Setting up connection"}
        </h1>
        <p className="text-gray-500 text-sm text-center mb-6">
          {isWaitingForJoin
            ? "Share the address below with the other person"
            : "Creating secure Tor hidden service..."}
        </p>

        {/* Onion address display */}
        {onionAddress && (
          <div className="w-full max-w-sm mb-6">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-4 border border-gray-200">
              <code className="flex-1 font-mono text-xs text-gray-700 break-all">
                {onionAddress}
              </code>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="text-gray-400 hover:text-brand shrink-0"
                onPress={copyAddress}
              >
                <ClipboardDocumentIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-2 mb-4">
          <div
            className={`w-2 h-2 rounded-full ${
              isWaitingForJoin
                ? "bg-green-500 animate-pulse"
                : "bg-brand animate-pulse"
            }`}
          />
          <span className="text-sm text-gray-500">
            {isWaitingForJoin ? "Ready for connection" : "Connecting to Tor..."}
          </span>
        </div>

        {/* Connection logs - collapsible terminal style */}
        <div className="w-full max-w-sm flex-1 min-h-0 mb-6">
          <div className="h-full bg-gray-900 rounded-xl overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-gray-500 ml-2">Connection Log</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
              {logs.map((log, index) => (
                <div key={index} className="mb-1 text-gray-400 leading-relaxed">
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
