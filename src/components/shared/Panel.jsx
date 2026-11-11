import { cn } from '@/lib/utils';

export default function Panel({ title, subtitle, action, children, className, bodyClassName }) {
  return (
    <section className={cn('ig-panel overflow-hidden', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            {title && (
              <div className="flex items-center gap-2">
                <span className="h-3 w-[2px] shrink-0 bg-primary/80 shadow-[0_0_8px_hsl(var(--neon)/0.8)]" />
                <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
              </div>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-4', bodyClassName)}>{children}</div>
    </section>
  );
}