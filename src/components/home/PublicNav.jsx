import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Radar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import MagneticButton from '@/components/motion/MagneticButton';

const LINKS = [
  { label: 'Home', target: 'top' },
  { label: 'Explore', target: 'explore' },
  { label: 'Platform', target: 'platform' },
  { label: 'How It Works', target: 'how' },
  { label: 'About', target: 'about' }
];

function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
}

export default function PublicNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const go = (target) => {
    setOpen(false);
    scrollToId(target);
  };

  return (
    <>
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-500',
          scrolled ? 'border-b border-white/[0.07] bg-background/80 backdrop-blur-xl' : 'bg-transparent'
        )}
      >
        <div className="mx-auto flex h-[68px] max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-8 w-8 items-center justify-center rounded-sm border border-primary/45 bg-primary/10 shadow-[0_0_20px_-6px_hsl(var(--neon)/0.95)]">
              <Radar className="h-4 w-4 text-primary" />
            </span>
            <span className="font-display text-[13px] font-bold uppercase tracking-[0.2em] text-foreground">
              Intelgraph <span className="text-primary">AI</span>
            </span>
          </Link>

          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                onClick={() => go(link.target)}
                className="relative rounded-sm px-3 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-x-3 -bottom-px h-px scale-x-0 bg-primary transition-transform duration-300 hover:scale-x-100" />
              </button>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <MagneticButton to="/dashboard" className="hidden px-4 py-2.5 text-[11px] sm:inline-flex">
              Launch platform <ArrowRight className="h-3 w-3" />
            </MagneticButton>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-white/10 text-foreground lg:hidden"
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>

      <div
        className={cn(
          'fixed inset-0 z-40 flex flex-col bg-background/97 px-6 pb-10 pt-24 backdrop-blur-2xl transition-all duration-300 lg:hidden',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <nav className="flex flex-col divide-y divide-white/[0.06]">
          {LINKS.map((link, index) => (
            <button
              key={link.label}
              type="button"
              onClick={() => go(link.target)}
              className="flex items-center justify-between py-4 text-left font-display text-xl uppercase tracking-[0.1em] text-foreground"
            >
              <span>{link.label}</span>
              <span className="font-mono text-[10px] text-muted-foreground">0{index + 1}</span>
            </button>
          ))}
        </nav>
        <div className="mt-8 flex flex-col gap-3">
          <MagneticButton to="/dashboard" className="w-full">Launch platform</MagneticButton>
          <MagneticButton href="#how" variant="ghost" className="w-full">How it works</MagneticButton>
        </div>
        <p className="mt-auto pt-8 text-[10px] leading-relaxed text-muted-foreground">
          Educational demonstration using synthetic data. Not an official investigative system.
        </p>
      </div>
    </>
  );
}