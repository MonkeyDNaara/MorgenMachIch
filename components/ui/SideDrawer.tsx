"use client";

import { useEffect, useRef, type ReactNode } from "react";

type SideDrawerProps = {
  open: boolean;
  /** Called on Escape, a backdrop click and when the dialog closes itself. */
  onClose: () => void;
  /** Accessible name of the dialog, e.g. "Edit task". */
  label: string;
  /**
   * Where focus goes on open: "field" = the input inside the element marked
   * `data-autofocus` (e.g. the title of a new task), "dialog" = the dialog
   * itself, so screen readers announce it and no on-screen keyboard opens.
   */
  initialFocus: "field" | "dialog";
  children: ReactNode;
};

/**
 * Right-side slide-over for the task and series forms (#440), built on a
 * native <dialog> opened with showModal() — like the command palette — so
 * the browser provides what the old <aside aria-modal> only promised:
 * focus trapped inside, the page behind inert, Escape to close and focus
 * back on whatever opened it. The dialog stays mounted; its content only
 * while open, so every opening starts with a fresh form.
 *
 * Popovers inside (date picker, tag suggestions) must call
 * `preventDefault()` on their Escape keydown, so Escape closes only them.
 */
export default function SideDrawer({
  open,
  onClose,
  label,
  initialFocus,
  children,
}: SideDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      const field =
        initialFocus === "field"
          ? dialog.querySelector<HTMLElement>("[data-autofocus] input, [data-autofocus] textarea")
          : null;
      (field ?? dialog).focus();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, initialFocus]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      tabIndex={-1}
      onClose={onClose}
      // The dialog has no padding and its content fills it, so a mousedown
      // on the dialog element itself is a click on the backdrop.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-full max-h-none w-full max-w-md overflow-hidden border-0 border-l border-line bg-base-200 p-0 text-base-content shadow-overlay outline-none backdrop:bg-scrim"
    >
      {open && <div className="flex h-full flex-col gap-6 p-6">{children}</div>}
    </dialog>
  );
}
