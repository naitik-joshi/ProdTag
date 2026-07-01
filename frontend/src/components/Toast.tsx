import {Badge} from './Badge';

export type ToastTone = 'neutral' | 'green' | 'amber' | 'rose';

export type ToastState = {
  message: string;
  tone: ToastTone;
};

export function Toast({toast, onDismiss}: {toast: ToastState; onDismiss?: () => void}) {
  return (
    <div className="toast">
      <span className="text-sm text-neutral-700">{toast.message}</span>
      <div className="flex items-center gap-2">
        <Badge tone={toast.tone}>{toastLabel(toast.tone)}</Badge>
        {onDismiss && (
          <button
            aria-label="Dismiss status message"
            className="rounded-full px-2 py-1 text-xs font-semibold text-neutral-500 transition hover:bg-white hover:text-neutral-900"
            onClick={onDismiss}
            type="button"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

function toastLabel(tone: ToastTone) {
  if (tone === 'green') {
    return 'Done';
  }
  if (tone === 'amber') {
    return 'Working';
  }
  if (tone === 'rose') {
    return 'Error';
  }
  return 'Info';
}
