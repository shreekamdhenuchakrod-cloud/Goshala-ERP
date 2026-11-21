import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-9 rounded-lg border bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 dark:focus:border-slate-300 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} ${
              error
                ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500'
                : 'border-slate-200 dark:border-slate-700'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 dark:text-slate-500 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = '', children, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full h-9 rounded-lg border bg-white dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 text-xs px-3 transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-300 focus:border-slate-900 dark:focus:border-slate-300 disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 cursor-pointer ${
            error
              ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500'
              : 'border-slate-200 dark:border-slate-700'
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
