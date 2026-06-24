'use client';

import React, { useEffect, useState } from 'react';
import { useToastStore, ToastMessage } from '../store/toast.store';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: ToastMessage }) {
  const hide = useToastStore((s) => s.hide);
  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => hide(toast.id), 250);
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
      default:
        return <Info className="h-5 w-5 text-blue-400" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success':
        return 'border-emerald-500/20';
      case 'error':
        return 'border-rose-500/20';
      case 'warning':
        return 'border-amber-500/20';
      default:
        return 'border-blue-500/20';
    }
  };

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl border bg-slate-900/90 backdrop-blur-md px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] transition-all duration-300 ${
        getBorderColor()
      } ${isExiting ? 'opacity-0 translate-x-5' : 'opacity-100 translate-x-0'}`}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-sm font-semibold text-slate-100">{toast.message}</span>
      </div>
      <button
        onClick={handleDismiss}
        className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
