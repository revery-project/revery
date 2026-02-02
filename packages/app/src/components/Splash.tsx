import { Button } from "@heroui/react";
import { ReveryLogo } from "../assets/ReveryLogo";

interface SplashProps {
  onContinue: () => void;
}

export const Splash = ({ onContinue }: SplashProps) => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-brand px-8">
      {/* Logo and tagline centered */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <ReveryLogo
          className="w-32 h-32 mb-6"
          fillColor="white"
          eyeColor="#2563EB"
        />
        <h1 className="text-white text-2xl font-semibold text-center leading-tight">
          Identity-less and
          <br />
          deniable messaging
        </h1>
      </div>

      {/* Bottom button */}
      <div className="w-full max-w-xs pb-12">
        <Button
          fullWidth
          size="lg"
          className="bg-white text-brand font-semibold rounded-full"
          onPress={onContinue}
        >
          Create a secure link
        </Button>
      </div>
    </div>
  );
};
