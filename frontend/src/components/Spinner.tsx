import {classNames} from '../utils/classNames';

export function Spinner({className}: {className?: string}) {
  return (
    <span
      aria-hidden="true"
      className={classNames('inline-block h-4 w-4 rounded-full border-2 border-current border-r-transparent spinner', className)}
    />
  );
}
