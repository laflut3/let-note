import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-xl border border-white/15 bg-[var(--auth-input-bg)] px-4 py-2 text-sm text-[var(--auth-input-text)] shadow-inner transition',
        'placeholder:text-[var(--auth-input-placeholder)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-input-ring)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { Input };
