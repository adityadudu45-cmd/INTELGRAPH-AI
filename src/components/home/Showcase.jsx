import { LayoutDashboard, Network, FileSearch, Archive, Activity, Clock } from 'lucide-react';
import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import PreviewMock from './PreviewMock';

const ITEMS = [
  { variant: 'dashboard', icon: LayoutDashboard, title: 'Dashboard', body: 'Live counts across cases, entities, relationships and pending reviews.' },
  { variant: 'graph', icon: Network, title: 'Interactive network graph', body: 'Pan, zoom, filter and inspect each stored relationship.' },
  { variant: 'documents', icon: FileSearch, title: 'Document intelligence', body: 'Extraction results waiting for an analyst decision.' },
  { variant: 'evidence', icon: Archive, title: 'Evidence library', body: 'Verification states with version history and reviewer notes.' },
  { variant: 'patterns', icon: Activity, title: 'Pattern analysis', body: 'Observations with confidence and stated limitations.' },
  { variant: 'timeline', icon: Clock, title: 'Timeline analysis', body: 'Timestamp confidence made explicit, never implied.' }
];

export default function Showcase() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] px-5 py-20 sm:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--neon)/0.08),transparent_70%)]" />
      <div className="relative mx-auto max-w-6xl">
        <Reveal className="max-w-2xl">
          <span className="ig-label">Inside the platform</span>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] sm:text-4xl lg:text-5xl">
            The command surface<span className="text-primary">, up close.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Interface previews of the shipped screens — same layout, same data model, same red-neon system applied
            across every module.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {ITEMS.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.variant} delay={(index % 2) * 80}>
                <div className="group relative">
                  <div className="pointer-events-none absolute -inset-3 rounded-md bg-[radial-gradient(60%_60%_at_50%_50%,hsl(var(--neon)/0.12),transparent_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <TiltCard strength={5}>
                    <div className="relative overflow-hidden rounded-sm border border-white/[0.09] bg-card/40 p-2 transition-colors duration-300 group-hover:border-primary/40">
                      <PreviewMock variant={item.variant} />
                      <div className="flex items-start gap-3 px-1.5 pb-1 pt-3">
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border border-primary/25 bg-primary/[0.07] text-primary">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <h3 className="font-display text-[12px] font-semibold uppercase tracking-[0.1em]">{item.title}</h3>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{item.body}</p>
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mt-6 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Previews are rendered from the application's own design system, not marketing mockups of a different product.
        </p>
      </div>
    </section>
  );
}