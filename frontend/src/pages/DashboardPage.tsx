import {Badge} from '../components/Badge';
import {CollapsibleSection} from '../components/CollapsibleSection';
import {PathList} from '../components/PathList';
import {StatCard} from '../components/StatCard';
import {AppConfig, AppDataPaths} from '../types/app';

export function DashboardPage({config, paths}: {config: AppConfig; paths: AppDataPaths | null}) {
  const enabledRules = config.rules.filter((rule) => rule.enabled).length;
  const readySounds = config.sounds.filter((sound) => sound.status === 'ready').length;
  const processedSounds = config.sounds.filter((sound) => Boolean(sound.processedPath)).length;
  const installedShells = Object.values(config.integrations).filter((integration) => integration.installed).length;
  const eventValue = config.listening ? (config.eventEngineEnabled ? 'On' : 'Engine paused') : 'Listening off';
  const eventTone = config.listening && config.eventEngineEnabled ? 'green' : 'amber';
  const playbackValue = !config.playbackEnabled ? 'Off' : config.muted ? 'Muted' : 'Ready';
  const playbackTone = !config.playbackEnabled ? 'amber' : config.muted ? 'rose' : 'green';

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Event intake"
          value={eventValue}
          detail={config.listening ? 'Incoming events can reach the rule engine.' : 'Incoming events are ignored.'}
          tone={eventTone}
        />
        <StatCard
          label="Playback"
          value={playbackValue}
          detail={config.muted ? 'Rules can match and log without sound.' : 'Matching events can start backend audio.'}
          tone={playbackTone}
        />
        <StatCard
          label="Shell setup"
          value={installedShells > 0 ? `${installedShells}/3 installed` : 'Not installed'}
          detail="Shell hooks and helper intake arrive in the next phase."
          tone="neutral"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard label="Sounds" value={config.sounds.length} detail="Imported local library items." />
        <StatCard label="Ready / processed" value={`${readySounds} / ${processedSounds}`} detail="Ready sounds and normalized WAV files." />
        <StatCard label="Rules" value={config.rules.length} detail="Event-to-sound mappings." />
        <StatCard label="Enabled rules" value={enabledRules} detail="Rules active in the matcher." />
      </section>

      <CollapsibleSection
        action={<Badge tone="green">Ready</Badge>}
        title="Local app data"
        description="ProdTag has created folders for config, sounds, processed playback files, and logs."
      >
        {paths && <PathList paths={paths} />}
      </CollapsibleSection>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Rule engine"
          value={config.eventEngineEnabled ? 'Enabled' : 'Disabled'}
          detail="Disabled means received events are not matched."
          tone={config.eventEngineEnabled ? 'green' : 'amber'}
        />
        <StatCard
          label="Backend playback"
          value={config.playbackEnabled ? 'Enabled' : 'Disabled'}
          detail="Disabled means matches will not start audio."
          tone={config.playbackEnabled ? 'green' : 'amber'}
        />
        <StatCard
          label="Local intake"
          value="Coming next"
          detail="No HTTP, CLI, or shell receiver is installed yet."
        />
      </section>
    </div>
  );
}
