import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Radar } from 'lucide-react';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <div className="pointer-events-none absolute inset-0 ig-grid-lines opacity-[0.14]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_35%,hsl(var(--neon)/0.16),transparent_72%)]" />

      <div className="relative max-w-md text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-sm border border-primary/45 bg-primary/10">
          <Radar className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-6 font-display text-7xl font-bold leading-none text-primary/25">404</p>
        <div className="mx-auto mt-4 h-px w-16 ig-neon-rule" />
        <h1 className="mt-5 font-display text-xl font-semibold uppercase tracking-[0.12em]">Signal lost</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <span className="font-mono text-[11px] text-foreground/80">/{pageName}</span> is not part of the Intelgraph AI workspace.
        </p>
        <Link
          to="/"
          className="mt-7 inline-flex items-center gap-2 rounded-sm border border-primary/40 bg-primary/10 px-4 py-2.5 font-display text-[11px] uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/20"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to overview
        </Link>
      </div>
    </div>
  );
}