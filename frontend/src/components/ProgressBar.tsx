import {classNames} from '../utils/classNames';

type ProgressBarProps = {
  label: string;
  current?: number;
  total?: number;
  indeterminate?: boolean;
};

export function ProgressBar({label, current = 0, total = 0, indeterminate = false}: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <div className="progress-panel" role="status">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-neutral-800">{label}</span>
        {!indeterminate && total > 0 && <span className="text-neutral-500">{current} of {total}</span>}
      </div>
      <div className="progress-track" aria-hidden="true">
        <div
          className={classNames('progress-fill', indeterminate && 'progress-fill-indeterminate')}
          style={indeterminate ? undefined : {width: `${percent}%`}}
        />
      </div>
    </div>
  );
}
