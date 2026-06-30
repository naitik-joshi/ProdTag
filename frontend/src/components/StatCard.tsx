import {Badge} from './Badge';
import {Card} from './Card';

type StatTone = 'green' | 'amber' | 'rose' | 'neutral';

type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: StatTone;
};

export function StatCard({label, value, detail, tone = 'neutral'}: StatCardProps) {
  return (
    <Card className={detail ? 'min-h-[132px]' : 'p-4'}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-neutral-500">{label}</span>
        {detail ? <Badge tone={tone}>{value}</Badge> : null}
      </div>
      {detail ? (
        <p className="mt-5 text-sm text-neutral-600">{detail}</p>
      ) : (
        <div className="mt-2 text-3xl font-semibold">{value}</div>
      )}
    </Card>
  );
}
