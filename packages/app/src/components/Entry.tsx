import { useState, useCallback } from "react";
import { Button, Input } from "@heroui/react";
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";
import { ReveryLogo } from "../assets/ReveryLogo";

// Word lists for generating memorable passphrases
const ADJECTIVES = [
  "swift",
  "quiet",
  "bright",
  "calm",
  "bold",
  "warm",
  "cool",
  "soft",
  "wild",
  "pure",
  "deep",
  "high",
  "low",
  "dark",
  "light",
  "quick",
  "slow",
  "old",
  "new",
  "big",
  "small",
  "long",
  "short",
  "wide",
];

const NOUNS = [
  "sunrise",
  "moonrise",
  "sunset",
  "thunder",
  "whisper",
  "shadow",
  "river",
  "mountain",
  "ocean",
  "forest",
  "meadow",
  "canyon",
  "valley",
  "island",
  "harbor",
  "garden",
  "bridge",
  "tower",
  "castle",
  "temple",
  "village",
  "market",
  "lantern",
  "compass",
];

const generatePassphrase = (): string => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
};

type Mode = "host" | "join";

interface EntryProps {
  onHost: (passphrase: string) => void;
  onJoin: (address: string, passphrase: string) => void;
  isLoading: boolean;
}

export const Entry = ({ onHost, onJoin, isLoading }: EntryProps) => {
  const [mode, setMode] = useState<Mode>("host");
  const [passphrase, setPassphrase] = useState("");
  const [address, setAddress] = useState("");
  const [suggestion, setSuggestion] = useState(() => generatePassphrase());

  const handleSubmit = () => {
    const trimmedPassphrase = passphrase.trim();
    if (!trimmedPassphrase) return;

    if (mode === "join") {
      const trimmedAddress = address.trim();
      if (!trimmedAddress) return;
      onJoin(trimmedAddress, trimmedPassphrase);
    } else {
      onHost(trimmedPassphrase);
    }
  };

  const refreshSuggestion = useCallback(() => {
    setSuggestion(generatePassphrase());
  }, []);

  const copySuggestion = useCallback(async () => {
    await navigator.clipboard.writeText(suggestion);
    setPassphrase(suggestion);
  }, [suggestion]);

  const useSuggestion = useCallback(() => {
    setPassphrase(suggestion);
  }, [suggestion]);

  const canSubmit =
    mode === "host"
      ? passphrase.trim() !== ""
      : passphrase.trim() !== "" && address.trim() !== "";

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-8 pt-8 overflow-y-auto">
        {/* Logo */}
        <ReveryLogo
          className="w-16 h-16 mb-6"
          fillColor="#2563EB"
          eyeColor="white"
        />

        {/* Mode toggle */}
        <div className="flex w-full max-w-xs mb-6 bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setMode("host")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              mode === "host"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Create chat
          </button>
          <button
            onClick={() => setMode("join")}
            className={`flex-1 py-2 px-4 rounded-full text-sm font-medium transition-colors ${
              mode === "join"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Join chat
          </button>
        </div>

        {/* Title and subtitle */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {mode === "host" ? "Your passphrase" : "Join existing chat"}
        </h1>
        <p className="text-gray-500 text-center text-sm mb-6 max-w-xs">
          {mode === "host"
            ? "The other person must enter this passphrase to start chatting"
            : "Enter the onion address and passphrase shared with you"}
        </p>

        {/* Join mode: Address input */}
        {mode === "join" && (
          <div className="w-full max-w-xs mb-4">
            <Input
              placeholder="Onion address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              isDisabled={isLoading}
              classNames={{
                inputWrapper:
                  "bg-gray-50 border-gray-200 hover:bg-gray-100 group-data-[focus=true]:bg-white group-data-[focus=true]:border-brand",
                input:
                  "text-gray-900 placeholder:text-gray-400 font-mono text-sm",
              }}
            />
          </div>
        )}

        {/* Passphrase input */}
        <div className="w-full max-w-xs mb-4">
          <Input
            placeholder="Enter passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            isDisabled={isLoading}
            classNames={{
              inputWrapper:
                "bg-gray-50 border-gray-200 hover:bg-gray-100 group-data-[focus=true]:bg-white group-data-[focus=true]:border-brand",
              input: "text-gray-900 placeholder:text-gray-400",
            }}
          />
        </div>

        {/* Suggestion box - only in host mode */}
        {mode === "host" && (
          <div className="w-full max-w-xs border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-medium text-gray-900 mb-3">
              Take suggestion for a quick start
            </p>
            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
                onPress={refreshSuggestion}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </Button>
              <button
                onClick={useSuggestion}
                className="flex-1 text-left px-3 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 transition-colors"
              >
                {suggestion}
              </button>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-gray-400 hover:text-gray-600"
                onPress={copySuggestion}
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom button */}
      <div className="px-8 pb-8">
        <Button
          fullWidth
          size="lg"
          className="bg-brand text-white font-semibold rounded-full"
          onPress={handleSubmit}
          isDisabled={!canSubmit || isLoading}
          isLoading={isLoading}
        >
          {mode === "host" ? "Create a secure link" : "Join secure chat"}
        </Button>
      </div>
    </div>
  );
};
