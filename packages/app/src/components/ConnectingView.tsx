import { Button, Card, CardBody, Input } from "@heroui/react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import { ConnectionStatus } from "../hooks/useReverySession";

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

  return (
    <Card className="w-full max-w-2xl shadow-xl bg-white/90 backdrop-blur-sm border-0 ring-1 ring-slate-200/50">
      <CardBody className="p-8">
        {onionAddress && (
          <div className="mb-6">
            <p className="text-sm text-slate-600 mb-3 font-medium">
              Share this address:
            </p>
            <Input
              value={onionAddress}
              readOnly
              classNames={{
                base: "max-w-full",
                input: "font-mono text-sm",
                inputWrapper:
                  "bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200/50 shadow-sm",
              }}
              endContent={
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="text-slate-600 hover:text-slate-800"
                  onPress={() => navigator.clipboard.writeText(onionAddress)}
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </Button>
              }
            />
          </div>
        )}

        <div className="bg-slate-900 text-slate-100 rounded-xl shadow-inner border border-slate-700/50">
          <div className="flex items-center gap-2 p-5 pb-3 text-slate-400">
            <div
              className={`w-2 h-2 rounded-full ${
                isWaitingForJoin
                  ? "bg-green-400 animate-pulse"
                  : "bg-slate-400 animate-pulse"
              }`}
            ></div>
            <span className="text-xs font-medium">Connection Log</span>
          </div>
          <div className="px-5 pb-5 font-mono text-sm max-h-48 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-800 [&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-500">
            {logs.map((log, index) => (
              <div key={index} className="mb-1 text-slate-200 leading-relaxed">
                {log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
