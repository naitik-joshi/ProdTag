import {Button} from '../components/Button';
import {Card} from '../components/Card';
import {EmptyState} from '../components/EmptyState';
import {AppConfig} from '../types/app';

export function SoundsPage({config}: {config: AppConfig}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Sound library</h2>
          <p className="mt-1 text-sm text-neutral-500">Imported producer tags will appear here.</p>
        </div>
        <Button disabled variant="secondary">
          Import sound
        </Button>
      </div>
      <EmptyState
        title={config.sounds.length === 0 ? 'No sounds yet' : `${config.sounds.length} sounds`}
        body="Import, preview, normalization, rename, delete, and playlists will appear here."
      />
    </Card>
  );
}
