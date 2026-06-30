import type {ReactNode} from 'react';
import {classNames} from '../utils/classNames';

type BadgeTone = 'green' | 'amber' | 'rose' | 'neutral';

const toneClass: Record<BadgeTone, string> = {
  green: 'badge-green',
  amber: 'badge-amber',
  rose: 'badge-rose',
  neutral: 'badge-neutral',
};

export function Badge({children, tone = 'neutral'}: {children: ReactNode; tone?: BadgeTone}) {
  return <span className={classNames('badge', toneClass[tone])}>{children}</span>;
}
