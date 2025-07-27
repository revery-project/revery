import { useState } from "react";
import { Button, Card, CardBody, Input, Spacer } from "@heroui/react";

interface EntryProps {
  onHost: (passphrase: string) => void;
  onJoin: (address: string, passphrase: string) => void;
  isLoading: boolean;
}

export const Entry = ({ onHost, onJoin, isLoading }: EntryProps) => {
  const [passphrase, setPassphrase] = useState("");
  const [address, setAddress] = useState("");

  const handleHost = () => {
    if (passphrase.trim()) {
      onHost(passphrase.trim());
    }
  };

  const handleJoin = () => {
    if (passphrase.trim() && address.trim()) {
      onJoin(address.trim(), passphrase.trim());
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl bg-white/90 backdrop-blur-sm border-0 ring-1 ring-slate-200/50">
      <CardBody className="p-8">
        <Input
          isRequired
          label="Passphrase"
          type="password"
          value={passphrase}
          onChange={(ev) => setPassphrase(ev.target.value)}
          isDisabled={isLoading}
          classNames={{
            inputWrapper:
              "shadow-sm bg-white/70 border-slate-200/60 hover:!bg-white group-data-[focus=true]:!bg-white group-data-[focus=true]:!border-slate-500",
            input: "text-slate-700 placeholder:text-slate-400",
          }}
        />
        <Spacer y={5} />
        <Input
          label="Address (for joining)"
          placeholder="abc123.onion"
          value={address}
          onChange={(ev) => setAddress(ev.target.value)}
          isDisabled={isLoading}
          classNames={{
            inputWrapper:
              "shadow-sm bg-white/70 border-slate-200/60 hover:!bg-white group-data-[focus=true]:!bg-white group-data-[focus=true]:!border-slate-500",
            input: "text-slate-700 placeholder:text-slate-400",
          }}
        />

        <div className="flex gap-2 w-full pt-4">
          <Button
            color="default"
            fullWidth
            onPress={handleHost}
            isDisabled={passphrase.trim() === "" || isLoading}
            isLoading={isLoading}
          >
            Host
          </Button>
          <Button
            color="default"
            fullWidth
            onPress={handleJoin}
            isDisabled={
              passphrase.trim() === "" || address.trim() === "" || isLoading
            }
            isLoading={isLoading}
          >
            Join
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
