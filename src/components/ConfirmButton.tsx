import { useEffect, useState, type ReactNode } from 'react';

/** A button that asks "tap again" instead of opening a confirm() dialog. */
export function ConfirmButton({ onConfirm, children, confirmLabel, className = 'btn', ariaLabel }: { onConfirm: () => void; children: ReactNode; confirmLabel: string; className?: string; ariaLabel?: string }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      className={`${className} ${armed ? 'confirming' : ''}`}
      aria-label={armed ? confirmLabel : ariaLabel}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
