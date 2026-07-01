import {Plus, SlidersHorizontal} from 'lucide-react';
import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {EmptyState} from '../components/EmptyState';
import {AppConfig} from '../types/app';

export function RulesPage({config}: {config: AppConfig}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Rules / Events</h2>
          <p className="mt-1 text-sm text-neutral-500">Command matches will decide which sound or playlist plays.</p>
        </div>
        <Button disabled leftIcon={<Plus size={16} />} variant="secondary">
          New rule
        </Button>
      </div>
      <EmptyState
        icon={<SlidersHorizontal size={20} />}
        title={config.rules.length === 0 ? 'No rules configured' : `${config.rules.length} rules`}
        body="Exact, starts-with, contains, and regex command matching will appear here."
      />
    </Card>
  );
}
