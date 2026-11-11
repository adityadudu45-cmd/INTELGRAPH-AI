import { useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown, Network, GitBranch, Archive, ShieldCheck } from 'lucide-react';
import HeroScene from './HeroScene';
import MagneticButton from '@/components/motion/MagneticButton';
import useReducedMotion from '@/hooks/useReducedMotion';

const PANELS = [
  {
    key: 'network',
    depth: 26,
    className: 'left-4 top-32 hidden xl:block',
    icon: Network,
    label: 'Network view',
    body: 'Entities and recorded relationships plotted as a live graph.',
    chips: ['Individual', 'Organization', 'Vehicle', 'Location']
  },
  {
    key: 'metrics',
    depth: 42,
    className: 'right-4 top-40 hidden xl:block',
    icon: GitBranch,
    label: 'Graph metrics',
    body: 'Degree, centrality, community and path calculations from stored edges.',
    chips: ['Degree', 'Centrality', 'Community', 'Paths']
  },
  {
    key: 'evidence',
    depth: 18,
    className: 'right-10 bottom-24 hidden lg:block',
    icon: Archive,
    label: 'Evidence register',
    body: 'Every sample item keeps its source, verification state and version history.',
    chips: ['Sourced', 'Versioned', 'Reviewable']
  }
];

export default function Hero() {
  const sectionRef = useRef(null);
  const layers = useRef([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || reduced) return undefined;
    let frame = 0;
    const onMove = (event) => {
      const rect = el.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        layers.current.forEach((node) => {
          if (!node) return;
          const depth = Number(node.dataset.depth || 16);
          node.style.transform = `translate3d(${(-x * depth).toFixed(2)}px, ${(-y * depth).toFixed(2)}px, 0)`;
        });
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <section ref={sectionRef} id="top" className="relative isolate min-h-[100svh] overflow-hidden">
      <HeroScene className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 ig-grid-fine opacity-40" />
      <div className="pointer-events-none absolute inset-0 ig-vignette" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />

      {PANELS.map((panel, index) => {
        const Icon = panel.icon;
        return (
          <div
            key={panel.key}
            ref={(node) => { layers.current[index] = node; }}
            data-depth={panel.depth}
            className={`pointer-events-none absolute z-20 w-[228px] transition-transform duration-500 ease-out ${panel.className}`}
          >
            <div className="ig-holo ig-clip animate-float-slow rounded-sm p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-primary" />
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-foreground">{panel.label}</span>
                <span className="ml-auto h-1 w-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--neon))]" />
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{panel.body}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {panel.chips.map((chip) => (
                  <span key={chip} className="rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                    {chip}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}

      <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-5 pb-24 pt-28 text-center sm:px-8">
        <div data-depth="10" ref={(node) => { layers.current[3] = node; }} className="transition-transform duration-500 ease-out">
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/[0.06] px-3 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span className="font-display text-[10px] font-semibold uppercase tracking-[0.24em] text-foreground/90">
              AI-assisted network analysis · educational demonstration
            </span>
          </div>
        </div>

        <h1 className="mt-7 font-display text-[13vw] font-bold uppercase leading-[0.86] tracking-[-0.02em] sm:text-[92px] lg:text-[118px]">
          <span className="block bg-gradient-to-b from-white via-white to-white/45 bg-clip-text text-transparent">Intelgraph</span>
          <span className="block ig-text-glow text-primary">AI</span>
        </h1>

        <p className="mt-6 font-display text-sm font-semibold uppercase leading-relaxed tracking-[0.34em] text-foreground/90 sm:text-base">
          Beyond data.
          <span className="mt-1 block text-muted-foreground">Discover connections.</span>
        </p>

        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          An AI-assisted network analysis platform that transforms fragmented synthetic datasets into structured,
          interactive and explainable intelligence.
        </p>

        <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
          <MagneticButton href="#platform" className="w-full sm:w-auto">
            Explore platform <ArrowRight className="h-3.5 w-3.5" />
          </MagneticButton>
          <MagneticButton href="#how" variant="ghost" className="w-full sm:w-auto">
            Discover how it works
          </MagneticButton>
        </div>

        <div className="mt-12 grid w-full max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.05]">
          {[
            { value: '12', label: 'Analysis modules' },
            { value: '07', label: 'Workflow stages' },
            { value: '100%', label: 'Synthetic data' }
          ].map((item) => (
            <div key={item.label} className="bg-background/70 px-3 py-3 backdrop-blur-sm">
              <div className="font-display text-lg font-semibold text-foreground">{item.value}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        <a
          href="#explore"
          className="mt-12 inline-flex flex-col items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-primary"
        >
          Scroll to explore
          <ChevronDown className="h-4 w-4 animate-float" />
        </a>
      </div>
    </section>
  );
}