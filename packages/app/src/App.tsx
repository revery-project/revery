import "./App.css";

import { useReverySession } from "./hooks/useReverySession";
import { Entry, ConnectingView, ChatView } from "./components";

function App() {
  const {
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
  } = useReverySession();

  const renderContent = () => {
    switch (appState) {
      case "entry":
        return (
          <Entry
            onHost={hostSession}
            onJoin={joinSession}
            isLoading={isLoading}
          />
        );
      case "connecting":
        return (
          <ConnectingView
            onionAddress={hostAddress}
            logs={logs}
            connectionStatus={connectionStatus}
          />
        );
      case "connected":
        return (
          <ChatView
            connectionStatus={connectionStatus}
            latestMessage={latestMessage}
            onSendMessage={sendMessage}
            onSendImage={sendImage}
            onDisconnect={disconnect}
          />
        );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.3),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] pointer-events-none" />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <main className="flex-1 flex flex-col items-center justify-center p-4 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;
