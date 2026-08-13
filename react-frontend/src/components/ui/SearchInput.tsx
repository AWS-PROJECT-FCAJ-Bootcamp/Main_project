import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input, type InputProps } from './input';

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = 'Tìm kiếm...', className, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    return (
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        leftIcon={<Search size={16} />}
        rightIcon={
          hasValue ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <X size={14} />
            </button>
          ) : undefined
        }
        className={className}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
