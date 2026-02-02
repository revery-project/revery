import "./App.css";

import { useReverySession } from "./hooks/useReverySession";
import { Splash, Entry, ConnectingView, ChatView } from "./components";

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
    leaveSplash,
    hostSession,
    joinSession,
    sendMessage,
    sendImage,
    disconnect,
  } = useReverySession();

  const renderContent = () => {
    switch (appState) {
      case "splash":
        return <Splash onContinue={leaveSplash} />;
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

  // All screens use full-bleed layout
  return (
    <div className="h-screen w-screen overflow-hidden">{renderContent()}</div>
  );
}

export default App;
