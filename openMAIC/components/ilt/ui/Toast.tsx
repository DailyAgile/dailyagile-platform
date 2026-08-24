'use client';

/**
 * Toast Notification Wrapper
 * Uses sonner for lightweight, accessible toast notifications
 *
 * Usage:
 * import { showToast } from '@/components/ilt/ui/Toast';
 *
 * showToast.success('Student added!');
 * showToast.error('Email already exists');
 * showToast.loading('Importing students...');
 */

import { toast as sonnerToast, Toaster } from 'sonner';

/**
 * Toast notification interface for consistent API
 */
export const toast = {
  /**
   * Show success toast (green, auto-dismiss 3s)
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Show error toast (red, requires manual dismiss)
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Show loading toast
   */
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
    });
  },

  /**
   * Show info toast
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Update an existing toast
   */
  update: (id: string | number, options: any) => {
    return sonnerToast(id, options);
  },

  /**
   * Dismiss a toast by ID
   */
  dismiss: (id?: string | number) => {
    return sonnerToast.dismiss(id);
  },
};

/**
 * Toast Provider Component
 * Must be placed near root of application to display toasts
 *
 * Example in layout.tsx:
 * <Toaster />
 */
export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      theme="system"
      richColors
      expand
      closeButton
      toastOptions={{
        classNames: {
          toast: 'rounded-lg shadow-lg',
          title: 'font-medium',
          description: 'text-sm opacity-90',
        },
      }}
    />
  );
}
