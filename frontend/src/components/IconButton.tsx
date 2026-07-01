import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {classNames} from '../utils/classNames';
import {Spinner} from './Spinner';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon: ReactNode;
  isLoading?: boolean;
};

export function IconButton({className, disabled, icon, isLoading = false, label, title, type = 'button', ...props}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={classNames('icon-button', className)}
      disabled={disabled || isLoading}
      title={title ?? label}
      type={type}
      {...props}
    >
      {isLoading ? <Spinner /> : icon}
    </button>
  );
}
