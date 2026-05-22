export const adminUi = {
  pageBg:
    'min-h-screen bg-[linear-gradient(160deg,#f6efe1,#f1e7d8)] p-3 sm:p-5 md:p-8 dark:bg-[linear-gradient(160deg,#201927,#17131f)]',
  shell: 'mx-auto w-full max-w-[1780px] space-y-4',
  panel:
    'rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-2)] p-4 shadow-[0_12px_30px_rgba(79,23,48,0.08)] sm:p-6',
  input:
    'h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground outline-none transition focus:border-[var(--surface-strong)] focus:ring-2 focus:ring-ring/50',
  select:
    'h-11 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-2)] px-3 text-foreground outline-none transition focus:border-[var(--surface-strong)] focus:ring-2 focus:ring-ring/50',
  primaryBtn:
    'h-11 rounded-xl bg-[var(--surface-strong)] px-5 text-white hover:bg-[var(--surface-strong-hover)] dark:text-zinc-900',
  dangerBtn: 'h-11 rounded-xl bg-rose-600 px-5 text-white hover:bg-rose-700',
  topNav:
    'flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--surface-border)] bg-[linear-gradient(135deg,#4a1d35,#5f2a45)] px-3 py-2.5 text-white shadow-[0_16px_38px_rgba(36,14,30,0.24)] sm:gap-3 sm:px-4 sm:py-3',
  topNavTab: 'rounded-lg px-2.5 py-1.5 text-sm transition flex items-center gap-2 sm:px-3',
  topNavTabActive: 'bg-white/20 font-semibold',
  topNavTabIdle: 'hover:bg-white/10',
  topNavAction:
    'h-9 rounded-lg bg-white/15 px-2.5 text-white hover:bg-white/25 hover:text-white sm:px-3',
  topNavActionGhost: 'h-9 rounded-lg px-2.5 text-white hover:bg-white/12 hover:text-white sm:px-3',
};
