import type { PropsWithChildren, ReactNode } from 'react';
import { X } from 'lucide-react';

type ModalProps = PropsWithChildren<{
  open: boolean;
  title: string;
  onClose: () => void;
  actions?: ReactNode;
  maxWidthClass?: string;
}>;

export function Modal({
  open,
  title,
  onClose,
  actions,
  maxWidthClass = 'max-w-2xl',
  children,
}: ModalProps) {
  if (!open) return null;

  return (
    <section
      className="fixed inset-0 z-[100] flex items-center justify-center bg-violet-950/45 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className={`w-full ${maxWidthClass} rounded-2xl border border-violet-200 bg-white p-6 shadow-[0_40px_120px_rgba(30,10,80,0.35)]`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-violet-950">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-violet-200 p-2 text-violet-700 transition hover:bg-violet-50"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="mt-4">{children}</div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </section>
  );
}
