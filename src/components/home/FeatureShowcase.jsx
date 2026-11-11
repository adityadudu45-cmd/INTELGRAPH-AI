import { Link } from 'react-router-dom';
import {
  UploadCloud, FileSearch, Boxes, Network, GitBranch, Activity,
  Clock, Archive, FileText, ScrollText, ArrowUpRight
} from 'lucide-react';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';

const FEATURES = [
  { to: '/ingestion', title: 'Data Ingestion', icon: UploadCloud, span: '', desc: 'Upload CSV or JSON samples, map columns to a case and see every rejected row with its reason.' },
  { to: '/documents', title: 'Document Intelligence', icon: FileSearch, span: '', desc: 'PDF and TXT samples are read for text, entities and references, then queued for review.' },
  { to: '/entities', title: 'Entity Explorer', icon: Boxes, span: '', desc: 'Search fictional people, organisations, vehicles and identifiers with confidence and review state.' },
  {
    to: '/graph',
    title: 'Network Graph',
    icon: Network,
    span: 'lg:col-span-2',
    highlight: true,
    desc: 'The signature workspace: stored entities and relationships as an interactive graph with degree, centrality and community calculations you can inspect node by node.'
  },
  { to: '/relationships', title: 'Relationship Analysis', icon: GitBranch, span: '', desc: 'Filter by type and verification state, then trace the shortest recorded path between two entities.' },
  { to: '/graph', title: 'Network Analytics', icon: Activity, span: '', desc: 'Density, degree distribution, top-connected entities and connected components at a glance.' },
  { to: '/patterns', title: 'Pattern Analysis', icon: Activity, span: '', desc: 'Explainable observations with confidence notes, supporting records and stated limitations.' },
  { to: '/timeline', title: 'Timeline Analysis', icon: Clock, span: '', desc: 'Chronological reconstruction with exact, approximate and unknown timestamp confidence.' },
  { to: '/evidence', title: 'Evidence Library', icon: Archive, span: '', highlight: true, desc: 'A register of sample evidence with verification states, version history and reviewer notes.' },
  { to: '/reports', title: 'Reports', icon: FileText, span: 'lg:col-span-2', desc: 'Build a versioned analytical report from the case, review its sections and export a PDF.' },
  { to: '/audit', title: 'Audit Logs', icon: ScrollText, span: '', desc: 'Every action recorded with actor, outcome and timestamp — filtered by event type.' }
];

export default function FeatureShowcase() {
  return (
    <section className="relative border-t border-white/[0.06] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="ig-label">Modules</span>
            <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] sm:text-4xl lg:text-5xl">
              Eleven modules.<span className="text-primary"> One case file.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Every module below is live in the application and operates on the same stored synthetic records.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--neon))]" />
            Not visual mockups
          </div>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Reveal key={`${feature.title}-${index}`} delay={(index % 3) * 70} className={feature.span}>
                <TiltCard className="h-full">
                  <Link
                    to={feature.to}
                    className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-white/[0.08] bg-card/50 p-5 transition-colors duration-300 hover:border-primary/45 hover:bg-card/80"
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: 'radial-gradient(70% 90% at var(--ig-glow-x,50%) var(--ig-glow-y,50%), hsl(var(--neon) / 0.12), transparent 70%)' }}
                    />
                    <div className="relative flex items-start justify-between">
                      <span className="flex h-9 w-9 items-center justify-center rounded-sm border border-primary/25 bg-primary/[0.07] text-primary transition-colors group-hover:border-primary/60">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground/60">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className={`relative mt-4 font-display text-sm font-semibold uppercase tracking-[0.08em] ${feature.highlight ? 'text-primary' : 'text-foreground'}`}>
                      {feature.title}
                    </h3>
                    <p className="relative mt-2 flex-1 text-[12px] leading-relaxed text-muted-foreground">{feature.desc}</p>
                    <div className="relative mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors group-hover:text-primary">
                      Open module
                      <ArrowUpRight className="h-3 w-3 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                    <span className="absolute inset-x-0 bottom-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-500 group-hover:scale-x-100" />
                  </Link>
                </TiltCard>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}