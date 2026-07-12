import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

/**
 * Each toast: { id, message, type: 'error'|'success'|'warning'|'info' }
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const counterRef = useRef(0);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError   = useCallback((msg, duration) => addToast(msg, 'error',   duration), [addToast]);
  const showSuccess = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const showWarning = useCallback((msg, duration) => addToast(msg, 'warning', duration), [addToast]);
  const showInfo    = useCallback((msg, duration) => addToast(msg, 'info',    duration), [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, showError, showSuccess, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

/* ── Icon map ── */
const ICONS = {
  error:   'error',
  success: 'check_circle',
  warning: 'warning',
  info:    'info',
};

/* ── Colour tokens per type ── */
const STYLES = {
  error:   'bg-error-container text-on-error-container border-error/30',
  success: 'bg-secondary-container text-on-secondary-container border-secondary/30',
  warning: 'bg-tertiary-container text-on-tertiary-container border-tertiary/30',
  info:    'bg-surface-container-high text-on-surface border-outline-variant',
};

const ICON_COLOUR = {
  error:   'text-error',
  success: 'text-secondary',
  warning: 'text-tertiary',
  info:    'text-on-surface-variant',
};

/* ── Individual Toast ── */
function Toast({ toast, onRemove }) {
  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 w-full max-w-sm rounded-xl border shadow-lg px-4 py-3
        animate-slide-in
        ${STYLES[toast.type]}
      `}
    >
      <span
        className={`material-symbols-outlined shrink-0 mt-0.5 ${ICON_COLOUR[toast.type]}`}
        style={{ fontSize: 20 }}
      >
        {ICONS[toast.type]}
      </span>

      <p className="flex-1 text-label-md leading-snug">{toast.message}</p>

      <button
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 p-0.5 rounded-md opacity-70 hover:opacity-100 transition-opacity"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
      </button>
    </div>
  );
}

/* ── Container: stacked in top-right ── */
function ToastContainer({ toasts, onRemove }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
      style={{ maxWidth: '24rem' }}
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}
