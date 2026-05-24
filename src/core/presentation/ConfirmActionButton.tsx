import { useState } from "react";

type ConfirmActionButtonProps = {
  idleLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
  className?: string;
};

export function ConfirmActionButton({
  idleLabel,
  confirmLabel,
  onConfirm,
  className = "secondary-button",
}: ConfirmActionButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (isConfirming) {
    return (
      <button className="danger-button" type="button" onClick={onConfirm}>
        {confirmLabel}
      </button>
    );
  }

  return (
    <button className={className} type="button" onClick={() => setIsConfirming(true)}>
      {idleLabel}
    </button>
  );
}
