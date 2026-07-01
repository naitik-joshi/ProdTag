import type {ReactNode} from 'react';
import {Save} from 'lucide-react';
import {Badge} from './Badge';
import {Button} from './Button';

type PageHeaderProps = {
  title: string;
  icon?: ReactNode;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
};

export function PageHeader({title, icon, hasUnsavedChanges, isSaving, canSave, onSave}: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-neutral-200 pb-5">
      <div className="flex items-center gap-3">
        {icon && <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-neutral-700 shadow-sm">{icon}</div>}
        <div>
          <div className="text-sm font-medium text-neutral-500">Local control center</div>
          <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {hasUnsavedChanges && <Badge tone="amber">Unsaved changes</Badge>}
        <Button disabled={isSaving || !canSave} isLoading={isSaving} leftIcon={!isSaving && <Save size={16} />} onClick={onSave}>
          {isSaving ? 'Saving...' : 'Save config'}
        </Button>
      </div>
    </header>
  );
}
