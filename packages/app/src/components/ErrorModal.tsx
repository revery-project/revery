import {
  Button,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
} from "@heroui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string;
}

export const ErrorModal = ({ isOpen, onClose, error }: ErrorModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onClose}
      classNames={{
        base: "bg-white/95 backdrop-blur-md shadow-2xl border-0 ring-1 ring-slate-200/50",
        backdrop: "backdrop-blur-sm bg-slate-900/30",
      }}
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-center gap-3 pb-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Error</h3>
                <p className="text-sm text-slate-500 font-normal">
                  Something went wrong
                </p>
              </div>
            </ModalHeader>
            <ModalBody className="pt-0 pb-6">
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 mb-4">
                <p className="text-slate-700 leading-relaxed">{error}</p>
              </div>
              <Button
                color="primary"
                onPress={onClose}
                className="w-full shadow-lg bg-slate-700 hover:bg-slate-800 font-medium text-white"
                size="lg"
              >
                OK
              </Button>
            </ModalBody>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
