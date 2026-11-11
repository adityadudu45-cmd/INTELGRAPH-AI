import { cn } from '@/lib/utils';

export default function StatCard({ label, value, hint, icon: Icon, tone = 'primary', loading }) {
  const tones = {
    primary: 'text-primary bg-primary/10 ring-primary/30',
    accent: 'text-[#ffc2ce] bg-primary/10 ring-primary/25',
    violet: 'text-[#ffc9d5] bg-crimson/30 ring-crimson/60',
    green: 'text-[#ffd0da] bg-primary/10 ring-primary/25',
    amber: 'text-[#ffe1e7] bg-white/[0.05] ring-white/15'
  };

  return (
    <div className="ig-panel ig-panel-lift group relative overflow-hidden p-4">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="ig-label truncate">{label}</div>
          <div className="mt-2 font-display text-2xl font-semibold tabular-nums">
            {loading ? <span className="inline-block h-7 w-12 animate-pulse rounded-sm bg-muted" /> : value}
          </div>
          {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
        </div>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ring-1 transition-shadow duration-300 group-hover:shadow-[0_0_22px_-8px_hsl(var(--neon)/0.9)]', tones[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}