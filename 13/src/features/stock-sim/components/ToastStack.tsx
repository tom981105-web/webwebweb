import { useEffect } from 'react';
import { Bell, CircleAlert, CircleCheck, X } from 'lucide-react';
import type { ToastMessage } from '@/features/stock-sim/types';

type ToastStackProps = {
  toasts: ToastMessage[];
  onDismiss: (toastId: string) => void;
};

function getToastIcon(tone: ToastMessage['tone']) {
  switch (tone) {
    case 'success':
      return <CircleCheck className="ss-h-4 ss-w-4" />;
    case 'error':
      return <CircleAlert className="ss-h-4 ss-w-4" />;
    case 'info':
    default:
      return <Bell className="ss-h-4 ss-w-4" />;
  }
}

function getToastToneClass(tone: ToastMessage['tone']) {
  switch (tone) {
    case 'success':
      return 'ss-border-lime-300/25 ss-bg-lime-300/10 ss-text-lime-100';
    case 'error':
      return 'ss-border-rose-300/25 ss-bg-rose-400/10 ss-text-rose-100';
    case 'info':
    default:
      return 'ss-border-cyan-300/20 ss-bg-cyan-300/10 ss-text-cyan-100';
  }
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  useEffect(() => {
    if (toasts.length === 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss(toasts[toasts.length - 1].id);
    }, 2_800);

    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toasts]);

  return (
    <div className="ss-pointer-events-none ss-fixed ss-bottom-5 ss-right-5 ss-z-50 ss-flex ss-w-[min(92vw,360px)] ss-flex-col ss-gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`ss-pointer-events-auto ss-animate-rise ss-relative ss-overflow-hidden ss-rounded-[22px] ss-border ss-px-4 ss-py-3.5 ss-shadow-glow ${getToastToneClass(
            toast.tone,
          )}`}
        >
          <div className="ss-pointer-events-none ss-absolute ss-inset-x-0 ss-top-0 ss-h-px ss-bg-gradient-to-r ss-from-transparent ss-via-white/70 ss-to-transparent" />
          <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
            <div className="ss-flex ss-items-start ss-gap-3">
              <div className="ss-mt-0.5 ss-flex ss-h-8 ss-w-8 ss-items-center ss-justify-center ss-rounded-full ss-border ss-border-white/10 ss-bg-white/5">
                {getToastIcon(toast.tone)}
              </div>
              <div>
                <p className="ss-font-medium ss-text-white">{toast.title}</p>
                <p className="ss-mt-1 ss-text-sm ss-leading-5 ss-text-slate-100/80">
                  {toast.message}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="ss-inline-flex ss-h-8 ss-w-8 ss-items-center ss-justify-center ss-rounded-full ss-border ss-border-white/10 ss-bg-white/5 ss-text-slate-200 ss-transition hover:ss-bg-white/10"
              aria-label="알림 닫기"
            >
              <X className="ss-h-4 ss-w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
