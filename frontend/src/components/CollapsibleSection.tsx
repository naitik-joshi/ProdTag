import {useState} from 'react';
import type {ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import {Card} from './Card';
import {classNames} from '../utils/classNames';

type CollapsibleSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
};

export function CollapsibleSection({
  action,
  children,
  defaultOpen = false,
  description,
  title,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="p-0">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-neutral-50"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span>
          <span className="block text-lg font-semibold text-neutral-900">{title}</span>
          {description && <span className="mt-1 block text-sm text-neutral-500">{description}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {action}
          <ChevronDown className={classNames('transition', isOpen && 'rotate-180')} size={18} />
        </span>
      </button>
      {isOpen && <div className="border-t border-neutral-100 px-5 py-5">{children}</div>}
    </Card>
  );
}
