import * as React from 'react';
import { cn } from '@/lib/utils';

type NumberInputProps = Omit<React.ComponentProps<'input'>, 'type' | 'inputMode'>;

function NumberInput({ className, ...props }: NumberInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      className={cn(
        'flex h-11 w-full rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-foreground transition',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
}

export { NumberInput };
