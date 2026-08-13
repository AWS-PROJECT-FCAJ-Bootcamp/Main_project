import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  inputSize?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'filled';
  wrapperClassName?: string;
}

const sizeClasses = {
  sm: 'h-8 text-xs px-2.5 py-1 pr-8 rounded-lg',
  md: 'h-10 text-sm px-3.5 py-2 pr-10 rounded-xl',
  lg: 'h-12 text-base px-4 py-2.5 pr-11 rounded-xl',
};

const variantClasses = {
  default:
    'bg-white border-slate-200 text-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300',
  glass:
    'bg-white/70 backdrop-blur-md border-slate-200/80 text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:border-slate-300',
  filled:
    'bg-slate-100/80 border-transparent text-slate-900 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 hover:bg-slate-100',
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      children,
      label,
      error,
      helperText,
      options,
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
    const selectId = id || generatedId;

    return (
      <div className={cn('w-full space-y-1.5', wrapperClassName)}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-bold text-slate-700 tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full">
          <select
            id={selectId}
            disabled={disabled}
            className={cn(
              'w-full border font-semibold appearance-none transition-all duration-200 focus:outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs',
              sizeClasses[inputSize],
              variantClasses[variant],
              error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/10 text-rose-900',
              className
            )}
            ref={ref}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          <div className="absolute right-3.5 flex items-center pointer-events-none text-slate-400">
            {error ? <AlertCircle size={16} className="text-rose-500" /> : <ChevronDown size={16} />}
          </div>
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

Select.displayName = 'Select';

export { Select };
