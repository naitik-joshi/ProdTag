import {AppDataPaths} from '../types/app';
import {PathRow} from './PathRow';

export function PathList({paths}: {paths: AppDataPaths}) {
  const rows = [
    ['Config', paths.configFile],
    ['Matcher cache', paths.matcherCacheFile],
    ['Original sounds', paths.originalSoundsDir],
    ['Processed sounds', paths.processedSoundsDir],
    ['Logs', paths.logsDir],
  ];

  return (
    <div className="mt-5 space-y-2">
      {rows.map(([label, value]) => (
        <PathRow key={label} label={label} value={value} />
      ))}
    </div>
  );
}
