import {Card} from '../components/Card';
import {AppConfig} from '../types/app';

export function HotkeysPage({config}: {config: AppConfig}) {
  const rows = [
    ['Stop audio', config.hotkeys.stopAudio],
    ['Toggle listening', config.hotkeys.toggleListening],
    ['Mute / unmute', config.hotkeys.toggleMute],
    ['Open app', config.hotkeys.openApp],
  ];

  return (
    <Card>
      <h2 className="text-lg font-semibold">Hotkeys</h2>
      <div className="mt-5 divide-y divide-neutral-100">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3">
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            <span className="rounded-lg bg-neutral-100 px-3 py-1 text-sm text-neutral-500">
              {value || 'Not set'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
