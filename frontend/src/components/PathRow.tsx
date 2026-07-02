import {CompactPath} from './CompactPath';

export function PathRow({label, value}: {label: string; value: string}) {
  return <CompactPath label={label} path={value} />;
}
