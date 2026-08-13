import * as React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'filled';
  wrapperClassName?: string;
}

const sizeClasses = {
  sm: 'h-8 text-xs px-2.5 py-1 rounded-lg',
  md: 'h-10 text-sm px-3.5 py-2 rounded-xl',
  lg: 'h-12 text-base px-4 py-2.5 rounded-xl',
};

const iconPaddingLeft = {
  sm: 'pl-8',
  md: 'pl-10',
  lg: 'pl-11',
};

const iconPaddingRight = {
  sm: 'pr-8',
  md: 'pr-10',
  lg: 'pr-11',
};

const variantClasses = {
  default:
    'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300',
  glass:
    'bg-white/70 backdrop-blur-md border-slate-200/80 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300',
  filled:
    'bg-slate-100/80 border-transparent text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-slate-100',
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      inputSize = 'md',
      variant = 'default',
      wrapperClassName,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            type={type}
            disabled={disabled}
            className={cn(
              'w-full border font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs',
              sizeClasses[inputSize],
              variantClasses[variant],
              leftIcon && iconPaddingLeft[inputSize],
              (rightIcon || error) && iconPaddingRight[inputSize],
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-900',
              className
            )}
            ref={ref}
            {...props}
          />

          {error ? (
            <div className="absolute right-3 flex items-center pointer-events-none text-rose-500">
              <AlertCircle size={16} />
            </div>
          ) : (
            rightIcon && (
              <div className="absolute right-3 flex items-center text-slate-400">{rightIcon}</div>
            )
          )}
        </div>

        {error && (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p className="text-[11px] text-slate-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
