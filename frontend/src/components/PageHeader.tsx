import {Badge} from './Badge';
import {Button} from './Button';

type PageHeaderProps = {
  title: string;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  canSave: boolean;
  onSave: () => void;
};

export function PageHeader({title, hasUnsavedChanges, isSaving, canSave, onSave}: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-center justify-between gap-4 border-b border-neutral-200 pb-5">
      <div>
        <div className="text-sm font-medium text-neutral-500">Local control center</div>
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        {hasUnsavedChanges && <Badge tone="amber">Unsaved changes</Badge>}
        <Button disabled={isSaving || !canSave} onClick={onSave}>
          {isSaving ? 'Saving...' : 'Save config'}
        </Button>
      </div>
    </header>
  );
}
