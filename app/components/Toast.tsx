import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faExclamationTriangle, faTimes } from '@fortawesome/free-solid-svg-icons';

interface ToastProps {
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}

const toastConfig = {
  success: {
    icon: faCheckCircle,
    bgClass: 'bg-green-600',
    iconColor: 'text-green-100',
    textColor: 'text-green-50',
  },
  error: {
    icon: faExclamationCircle,
    bgClass: 'bg-red-600',
    iconColor: 'text-red-100',
    textColor: 'text-red-50',
  },
  info: {
    icon: faInfoCircle,
    bgClass: 'bg-blue-600',
    iconColor: 'text-blue-100',
    textColor: 'text-blue-50',
  },
  warning: {
    icon: faExclamationTriangle,
    bgClass: 'bg-yellow-500',
    iconColor: 'text-yellow-100',
    textColor: 'text-yellow-50',
  },
};

export const Toast: React.FC<ToastProps> = ({ title, message, type, onClose }) => {
  const config = toastConfig[type];

  return (
    <div
      className={`max-w-sm w-full ${config.bgClass} shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <FontAwesomeIcon icon={config.icon} className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${config.textColor}`}>{title}</p>
            <p className={`mt-1 text-sm ${config.textColor} opacity-90`}>{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className={`inline-flex rounded-md ${config.bgClass} ${config.textColor} opacity-80 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${type}-600 focus:ring-white`}
            >
              <span className="sr-only">Fermer</span>
              <FontAwesomeIcon icon={faTimes} className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
