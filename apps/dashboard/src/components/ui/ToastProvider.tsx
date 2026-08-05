import { useState, useEffect, useCallback } from "react";
import { ShieldAlert, Zap, X, CheckCircle2 } from "lucide-react";

export type ToastType = "INFO" | "SECURITY" | "ARCH";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string | null;
  type: ToastType;
}

// Simple global event bus for toasts
class ToastEmitter {
  private listeners: ((toast: ToastMessage) => void)[] = [];

  subscribe(listener: (toast: ToastMessage) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  emit(toast: Omit<ToastMessage, "id">) {
    const id = Math.random().toString(36).slice(2, 9);
    this.listeners.forEach((l) => l({ ...toast, id }));
  }
}

export const toast = new ToastEmitter();

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      // Auto dismiss after 5s
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    });
    return unsubscribe;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-card border-border animate-in slide-in-from-bottom-5 fade-in pointer-events-auto flex items-start gap-3 rounded-lg border p-4 shadow-lg duration-300"
          role="alert"
        >
          {t.type === "SECURITY" ? (
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          ) : t.type === "ARCH" ? (
            <CheckCircle2 className="text-accent-color mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          )}
          <div className="flex-1">
            <h4 className="text-primary-text mb-1 text-sm font-bold leading-tight">{t.title}</h4>
            {t.description && (
              <p className="text-secondary-text text-xs leading-tight">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-muted-foreground hover:text-primary-text transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
