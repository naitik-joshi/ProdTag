import {Button} from './Button';

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Delete',
  isConfirming = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-modal="true" className="modal-panel" role="dialog">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-neutral-600">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button disabled={isConfirming} onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button isLoading={isConfirming} onClick={onConfirm} variant="danger">
            {isConfirming ? 'Deleting...' : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
