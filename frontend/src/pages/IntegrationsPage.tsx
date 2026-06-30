import {Badge} from '../components/Badge';
import {Card} from '../components/Card';
import {AppConfig} from '../types/app';

export function IntegrationsPage({config}: {config: AppConfig}) {
  const integrations = [
    ['zsh', config.integrations.zsh],
    ['bash', config.integrations.bash],
    ['PowerShell', config.integrations.powerShell],
  ] as const;

  return (
    <Card>
      <h2 className="text-lg font-semibold">Shell integrations</h2>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {integrations.map(([name, integration]) => (
          <div key={name} className="rounded-lg border border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold">{name}</div>
              <Badge tone={integration.installed ? 'green' : 'neutral'}>
                {integration.installed ? 'Installed' : 'Not installed'}
              </Badge>
            </div>
            <div className="mt-3 text-sm text-neutral-500">
              {integration.scope || 'Install and doctor checks will appear here.'}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
