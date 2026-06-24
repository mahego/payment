import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: ToastMessage[];
  show: (message: string, type?: ToastType, duration?: number) => void;
  hide: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message, type = 'info', duration = 3500) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, duration);
  },
  hide: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (msg: string, dur?: number) => useToastStore.getState().show(msg, 'success', dur),
  error: (msg: string, dur?: number) => useToastStore.getState().show(msg, 'error', dur),
  info: (msg: string, dur?: number) => useToastStore.getState().show(msg, 'info', dur),
  warning: (msg: string, dur?: number) => useToastStore.getState().show(msg, 'warning', dur),
};
