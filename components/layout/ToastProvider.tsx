"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastAction = { label: string; onAction: () => unknown };

type Toast = { id: number; message: string; action?: ToastAction };

type ToastContextValue = {
  /** Shows a short message at the bottom; with an action (e.g. Undo) it stays a little longer. */
  notify: (message: string, options?: { action?: ToastAction }) => void;
};

const PLAIN_MS = 3000;
const ACTION_MS = 6000;

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide toast (#239), extracted from the command palette provider
 * (#197) so any feature can confirm an action — and offer Undo — without
 * depending on the palette. One toast at a time: a new one replaces the
 * old. The region is a polite live region, so screen readers announce
 * the message; the action button is reachable by mouse and keyboard.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const notify = useCallback<ToastContextValue["notify"]>((message, options) => {
    if (timer.current) clearTimeout(timer.current);
    nextId.current += 1;
    setToast({ id: nextId.current, message, action: options?.action });
    timer.current = setTimeout(() => setToast(null), options?.action ? ACTION_MS : PLAIN_MS);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6"
      >
        {toast && (
          <p
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 rounded-full border border-line-strong bg-base-300 py-2 pr-2 pl-4 text-sm shadow-overlay"
          >
            <span>{toast.message}</span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  const action = toast.action;
                  dismiss();
                  void action?.onAction();
                }}
                className="cursor-pointer rounded-full px-3 py-1 font-medium text-accent outline-none! transition-colors hover:bg-line focus-visible:shadow-focus"
              >
                {toast.action.label}
              </button>
            ) : (
              <span className="pr-2" />
            )}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
}
