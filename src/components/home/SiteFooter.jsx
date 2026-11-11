import { Link } from 'react-router-dom';
import { Radar, ArrowUpRight } from 'lucide-react';

const scrollToId = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' });
};

export default function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/[0.08] bg-[hsl(0_0%_1.5%)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px ig-neon-rule" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-56 w-96 bg-[radial-gradient(50%_60%_at_30%_100%,hsl(var(--neon)/0.18),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-sm border border-primary/45 bg-primary/10">
                <Radar className="h-4 w-4 text-primary" />
              </span>
              <span className="font-display text-[13px] font-bold uppercase tracking-[0.2em]">
                Intelgraph <span className="text-primary">AI</span>
              </span>
            </div>
            <p className="mt-4 max-w-xs text-[11px] leading-relaxed text-muted-foreground">
              AI-assisted network analysis for synthetic datasets. Document intelligence, interactive relationship
              graphs, explainable patterns and source-grounded analysis in one workspace.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Platform</h3>
            <ul className="mt-3 space-y-2 text-[12px]">
              {[
                ['Overview', 'top'],
                ['Modules', 'platform'],
                ['Explore network', 'explore'],
                ['Security', 'about']
              ].map(([label, id]) => (
                <li key={label}>
                  <button type="button" onClick={() => scrollToId(id)} className="text-muted-foreground transition-colors hover:text-primary">
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Application</h3>
            <ul className="mt-3 space-y-2 text-[12px]">
              <li>
                <button type="button" onClick={() => scrollToId('how')} className="text-muted-foreground transition-colors hover:text-primary">How it works</button>
              </li>
              <li>
                <Link to="/graph" className="text-muted-foreground transition-colors hover:text-primary">Network graph</Link>
              </li>
              <li>
                <Link to="/audit" className="text-muted-foreground transition-colors hover:text-primary">Audit logs</Link>
              </li>
              <li>
                <Link to="/dashboard" className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-primary">
                  Launch platform <ArrowUpRight className="h-3 w-3" />
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Privacy</h3>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              No account, no personal details and no tracking pixels on this page. The workspace stores only synthetic
              demonstration records created for this educational environment.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-[10px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="uppercase tracking-[0.14em]">Educational demonstration using synthetic data. Not an official investigative system.</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground/70">
            © {new Date().getFullYear()} Intelgraph AI · PS-320
          </p>
        </div>
      </div>
    </footer>
  );
}