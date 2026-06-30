import type {HTMLAttributes} from 'react';
import {classNames} from '../utils/classNames';

export function Card({children, className, ...props}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={classNames('card', className)} {...props}>
      {children}
    </section>
  );
}
