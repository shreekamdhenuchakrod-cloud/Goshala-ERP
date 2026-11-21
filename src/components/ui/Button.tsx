import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-150 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500 disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer';

  const sizeStyles = {
    xs: 'h-7 px-2.5 text-[11px] gap-1.5',
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-9 px-3.5 text-xs gap-2',
    lg: 'h-10 px-4 text-sm gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 dark:active:bg-slate-200 shadow-xs border border-transparent',
    secondary:
      'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:text-white shadow-2xs',
    outline:
      'bg-transparent text-slate-700 border border-slate-200 hover:bg-slate-100/80 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800',
    ghost:
      'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white',
    danger:
      'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 active:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50 dark:hover:bg-rose-900/50',
    success:
      'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 active:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50 dark:hover:bg-emerald-900/50',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
