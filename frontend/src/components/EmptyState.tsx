import type {ReactNode} from 'react';

export function EmptyState({body, icon, title}: {title: string; body: string; icon?: ReactNode}) {
  return (
    <div className="empty-state">
      <div>
        {icon && <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-neutral-600">{icon}</div>}
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-2 max-w-md text-sm text-neutral-500">{body}</p>
      </div>
    </div>
  );
}
