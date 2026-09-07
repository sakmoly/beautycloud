"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const maxW =
    size === "xl" ? "max-w-2xl" : size === "lg" ? "max-w-xl" : "max-w-lg";

  return createPortal(
    <div
      className="bc-modal-root fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#1a1a1a]/45 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={`bc-modal-panel relative flex max-h-[min(96dvh,920px)] w-full flex-col ${maxW} overflow-hidden rounded-[1.75rem] bg-[color:var(--bc-surface)] shadow-[var(--bc-shadow-lg)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="sr-only">
            <h2>{title}</h2>
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
