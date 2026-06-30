import {Button} from './Button';

export function PathRow({label, value}: {label: string; value: string}) {
  return (
    <div className="path-row">
      <span className="text-sm font-semibold text-neutral-600">{label}</span>
      <span className="min-w-0 break-words font-mono text-sm leading-6 text-neutral-700" title={value}>
        {value}
      </span>
      <div className="flex gap-2 md:justify-end">
        <Button className="h-8 px-3 text-xs" disabled variant="ghost">
          Copy
        </Button>
        <Button className="h-8 px-3 text-xs" disabled variant="ghost">
          Open
        </Button>
      </div>
    </div>
  );
}
