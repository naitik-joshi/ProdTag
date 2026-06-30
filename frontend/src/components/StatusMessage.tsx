export function StatusMessage({message}: {message: string}) {
  return (
    <div className="mt-auto rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <div className="text-xs uppercase text-neutral-500">Config</div>
      <div className="mt-1 text-sm font-medium">{message}</div>
    </div>
  );
}
