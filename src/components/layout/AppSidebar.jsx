import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '@/lib/navItems';
import { cn } from '@/lib/utils';
import { Radar } from 'lucide-react';

export default function AppSidebar({ collapsed = false, onNavigate }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-sidebar">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(70%_100%_at_20%_0%,hsl(var(--neon)/0.16),transparent_70%)]" />

      <div className={cn('relative flex items-center gap-3 border-b border-sidebar-border px-4 py-4', collapsed && 'justify-center px-2')}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10 shadow-[0_0_22px_-6px_hsl(var(--neon)/0.85)]">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate font-display text-sm font-semibold uppercase tracking-[0.16em] text-foreground">Intelgraph AI</div>
            <div className="ig-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">PS-320 · Demo</div>
          </div>
        )}
      </div>

      <nav className="ig-scroll relative flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="flex items-center gap-2 px-2 pb-1.5">
                <span className="h-px w-3 bg-primary/60" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">{group.label}</span>
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
                      collapsed && 'justify-center px-2',
                      isActive
                        ? 'bg-primary/12 text-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          'absolute inset-y-1 left-0 w-[2px] rounded-full transition-opacity',
                          isActive ? 'bg-primary opacity-100 shadow-[0_0_10px_hsl(var(--neon))]' : 'opacity-0'
                        )}
                      />
                      <Icon className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="relative border-t border-sidebar-border px-4 py-3">
          <p className="text-[10px] leading-relaxed text-muted-foreground/80">
            Educational demonstration · synthetic data only. Not an official investigative system.
          </p>
        </div>
      )}
    </div>
  );
}