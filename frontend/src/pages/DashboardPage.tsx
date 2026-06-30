import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {PathList} from '../components/PathList';
import {StatCard} from '../components/StatCard';
import {AppConfig, AppDataPaths} from '../types/app';

export function DashboardPage({config, paths}: {config: AppConfig; paths: AppDataPaths | null}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Listening"
          value={config.listening ? 'On' : 'Paused'}
          detail={config.listening ? 'Terminal events can be processed.' : 'Terminal events are ignored.'}
          tone={config.listening ? 'green' : 'amber'}
        />
        <StatCard
          label="Audio"
          value={config.muted ? 'Muted' : 'Ready'}
          detail={config.muted ? 'Events will be logged without playback.' : 'Matching events can play sounds.'}
          tone={config.muted ? 'rose' : 'green'}
        />
        <StatCard
          label="Helper"
          value="Not started"
          detail="Helper status will appear here once playback is connected."
          tone="neutral"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Sounds" value={config.sounds.length} />
        <StatCard label="Playlists" value={config.playlists.length} />
        <StatCard label="Rules" value={config.rules.length} />
        <StatCard
          label="Shells"
          value={Object.values(config.integrations).filter((integration) => integration.installed).length}
        />
      </section>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Local app data</h2>
            <p className="mt-1 text-sm text-neutral-500">
              ProdTag has created the folders it needs for config, sounds, processed playback files, and logs.
            </p>
          </div>
          <Badge tone="green">Ready</Badge>
        </div>
        {paths && <PathList paths={paths} />}
      </Card>
    </div>
  );
}
