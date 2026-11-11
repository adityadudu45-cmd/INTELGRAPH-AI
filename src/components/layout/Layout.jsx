import { useEffect, useState } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { Menu, PanelLeftClose, PanelLeftOpen, Hexagon } from 'lucide-react';
import AppSidebar from './AppSidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ALL_NAV_ITEMS } from '@/lib/navItems';
import NexusChat from '@/components/nexus/NexusChat';
import { cn } from '@/lib/utils';

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const active = ALL_NAV_ITEMS.find((i) => location.pathname.startsWith(i.to));

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-sidebar-border transition-[width] duration-300 md:block',
          collapsed ? 'w-[68px]' : 'w-[248px]'
        )}
      >
        <AppSidebar collapsed={collapsed} />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[264px] border-sidebar-border p-0">
          <AppSidebar onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className={cn('flex min-h-screen flex-col transition-[padding] duration-300', collapsed ? 'md:pl-[68px]' : 'md:pl-[248px]')}>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <span className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            onClick={() => setCollapsed((v) => !v)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>

          <div className="flex min-w-0 items-center gap-2">
            <span className="ig-live-dot" />
            <span className="truncate font-display text-[13px] uppercase tracking-[0.14em]">{active?.label || 'Intelgraph AI'}</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-sm border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary sm:inline">
              Synthetic data
            </span>
            <div className="hidden text-right sm:block">
              <div className="text-[11px] font-medium leading-tight">Public demonstration</div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">No sign-in required</div>
            </div>
            <Button asChild variant="ghost" size="icon" aria-label="Public site" title="Public site">
              <Link to="/"><Hexagon className="h-4 w-4" /></Link>
            </Button>
          </div>
        </header>

        <main key={location.pathname} className="flex-1 animate-fade-in px-4 py-5 md:px-6 md:py-7">
          <Outlet />
        </main>

        <footer className="border-t border-border/60 px-4 py-4 text-[11px] text-muted-foreground md:px-6">
          INTELGRAPH AI · Educational demonstration using synthetic data. Not an official investigative report.
        </footer>
      </div>

      <NexusChat />
    </div>
  );
}