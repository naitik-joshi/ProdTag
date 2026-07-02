import {useState} from 'react';
import {Copy} from 'lucide-react';
import {Button} from './Button';

type CompactPathProps = {
  label: string;
  path?: string | null;
  tone?: 'neutral' | 'green';
};

export function CompactPath({label, path, tone = 'neutral'}: CompactPathProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!path) {
    return null;
  }

  async function copyPath() {
    if (!path) {
      return;
    }
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={tone === 'green' ? 'compact-path compact-path-green' : 'compact-path'}>
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase text-neutral-500">{label}</div>
        <div className="mt-1 truncate text-sm font-semibold text-neutral-800" title={path}>
          {fileName(path)}
        </div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">{folderHint(path)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button className="h-8 px-3 text-xs" leftIcon={<Copy size={13} />} onClick={copyPath} variant="ghost">
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button className="h-8 px-3 text-xs" onClick={() => setIsExpanded((current) => !current)} variant="ghost">
          {isExpanded ? 'Hide' : 'Details'}
        </Button>
      </div>
      {isExpanded && (
        <div className="col-span-full break-all rounded-md bg-white/70 px-2 py-2 font-mono text-xs leading-5 text-neutral-600">
          {path}
        </div>
      )}
    </div>
  );
}

function fileName(path: string) {
  const normalized = path.replace(/\\/g, '/');
  return normalized.split('/').filter(Boolean).pop() || path;
}

function folderHint(path: string) {
  const normalized = path.replace(/\\/g, '/');
  const parts = normalized.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return 'Local path';
  }
  return `in ${parts[parts.length - 2]}`;
}
