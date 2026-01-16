'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
  indeterminate?: boolean;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, indeterminate = false, checked, ...props }, ref) => {
    return (
      <label className="inline-flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`
              h-5 w-5 rounded border-2 transition-all duration-200
              flex items-center justify-center
              ${
                checked || indeterminate
                  ? 'bg-[#2E1A4A] border-[#2E1A4A]'
                  : 'bg-white border-slate-300 group-hover:border-[#3d2563]'
              }
              peer-focus:ring-2 peer-focus:ring-[#3d2563] peer-focus:ring-offset-2
              peer-disabled:opacity-50 peer-disabled:cursor-not-allowed
            `}
          >
            {indeterminate ? (
              <Minus className="h-3 w-3 text-white" strokeWidth={3} />
            ) : checked ? (
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            ) : null}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-900">{label}</span>
            )}
            {description && (
              <span className="text-sm text-slate-500">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };
