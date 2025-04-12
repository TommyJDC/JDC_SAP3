import React, { createContext, useState, useContext, useCallback, ReactNode } from 'react';
// Remove the Node.js crypto import
// import crypto from 'node:crypto';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessageData {
  id: string;
  title: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  toasts: ToastMessageData[];
  addToast: (message: string, type: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

const DEFAULT_DURATION = 5000; // 5 seconds

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessageData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType, title?: string, duration: number = DEFAULT_DURATION) => {
      // Use the Web Crypto API's randomUUID() available in modern browsers
      // Check if self.crypto is available for robustness (though it should be in modern environments)
      const id = typeof self !== 'undefined' && self.crypto && self.crypto.randomUUID
        ? self.crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`; // Fallback

      const newToast: ToastMessageData = {
        id,
        title: title || type.charAt(0).toUpperCase() + type.slice(1), // Default title based on type
        message,
        type,
      };

      setToasts((currentToasts) => [...currentToasts, newToast]);

      // Auto-remove toast after duration
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextProps => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
