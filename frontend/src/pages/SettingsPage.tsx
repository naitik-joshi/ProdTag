import type {ReactNode} from 'react';
import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {CollapsibleSection} from '../components/CollapsibleSection';
import {PathList} from '../components/PathList';
import {ToggleCard} from '../components/ToggleCard';
import {AppConfig, AppDataPaths} from '../types/app';

type SettingsPageProps = {
  config: AppConfig;
  paths: AppDataPaths | null;
  updateDraft: (patch: Partial<AppConfig>) => void;
};

export function SettingsPage({config, paths, updateDraft}: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold">Runtime controls</h2>
        <p className="mt-1 text-sm text-neutral-500">
          These controls decide whether ProdTag accepts events, evaluates rules, and starts sound playback.
        </p>
        <div className="mt-5 grid gap-5">
          <RuntimeGroup
            title="Event intake"
            description="Listening is the outside gate. Off means incoming terminal or app events are ignored."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <ToggleCard
                label="Listening"
                description="Off means ProdTag ignores incoming terminal/app events."
                checked={config.listening}
                onChange={(listening) => updateDraft({listening})}
              />
              <ToggleCard
                label="Event engine"
                description="Off means received events may be logged, but rules are not evaluated."
                checked={config.eventEngineEnabled}
                onChange={(eventEngineEnabled) => updateDraft({eventEngineEnabled})}
              />
            </div>
          </RuntimeGroup>

          <RuntimeGroup
            title="Sound playback"
            description="Muted keeps rule evaluation/logging on but silences output. Playback off disables backend audio entirely."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <ToggleCard
                label="Muted"
                description="On means events can match and be logged, but no sound plays."
                checked={config.muted}
                onChange={(muted) => updateDraft({muted})}
              />
              <ToggleCard
                label="Backend playback"
                description="Off means matching events will not start local audio playback."
                checked={config.playbackEnabled}
                onChange={(playbackEnabled) => updateDraft({playbackEnabled})}
              />
              <ToggleCard
                label="Stop previous sound"
                description="On means a new event stops current backend playback before starting another sound."
                checked={config.stopPreviousSoundOnNewEvent}
                onChange={(stopPreviousSoundOnNewEvent) => updateDraft({stopPreviousSoundOnNewEvent})}
              />
            </div>
          </RuntimeGroup>

          <RuntimeGroup
            title="Startup"
            description="Helper startup is reserved for the background helper phase."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <ToggleCard
                label="Start helper at login"
                description="Reserved for the background helper startup setting."
                checked={config.launchHelperAtStartup}
                onChange={(launchHelperAtStartup) => updateDraft({launchHelperAtStartup})}
              />
            </div>
          </RuntimeGroup>
        </div>
      </Card>

      <CollapsibleSection
        action={<Badge>v{config.version}</Badge>}
        title="Config file"
        description={`Last saved: ${formatDate(config.updatedAt)}`}
      >
        {paths && <PathList paths={paths} />}
      </CollapsibleSection>
    </div>
  );
}

function RuntimeGroup({children, description, title}: {children: ReactNode; description: string; title: string}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <h3 className="text-sm font-semibold uppercase text-neutral-500">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function formatDate(value: string) {
  if (!value) {
    return 'Not saved yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}
