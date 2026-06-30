export function EmptyState({title, body}: {title: string; body: string}) {
  return (
    <div className="empty-state">
      <div>
        <div className="text-base font-semibold">{title}</div>
        <p className="mt-2 max-w-md text-sm text-neutral-500">{body}</p>
      </div>
    </div>
  );
}
