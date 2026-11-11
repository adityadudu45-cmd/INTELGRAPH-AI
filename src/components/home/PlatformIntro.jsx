import Reveal from '@/components/motion/Reveal';
import TiltCard from '@/components/motion/TiltCard';
import { DocVisual, GraphVisual, PatternVisual } from './IntroVisuals';

const BLOCKS = [
  {
    index: '01',
    title: 'Data intelligence',
    body: 'Structured ingestion and extraction. CSV and JSON records are validated before they enter a case, while PDF and TXT samples are read for entities, dates and reference codes — every suggestion queued for human review.',
    visual: DocVisual,
    align: 'left'
  },
  {
    index: '02',
    title: 'Network visualisation',
    body: 'Interactive graphs built from stored relationships. Drag, pan, zoom and filter fictional entities, then read the recorded relationship type, verification state and source reference behind each edge.',
    visual: GraphVisual,
    align: 'right'
  },
  {
    index: '03',
    title: 'Explainable pattern analysis',
    body: 'Repeated identifiers, shared events and isolated nodes are surfaced from the stored graph, each with its confidence, supporting records and stated limitations — and every review decision is saved back to the case.',
    visual: PatternVisual,
    align: 'left'
  }
];

export default function PlatformIntro() {
  return (
    <section id="platform" className="relative overflow-hidden border-t border-white/[0.06] px-5 py-20 sm:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 ig-grid-lines opacity-[0.16]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[42rem] -translate-x-1/2 bg-[radial-gradient(50%_100%_at_50%_0%,hsl(var(--neon)/0.18),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal className="max-w-3xl">
          <span className="ig-label">The platform</span>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] tracking-[-0.01em] sm:text-4xl lg:text-5xl">
            Turn fragmented data into
            <span className="text-primary"> connected intelligence.</span>
          </h2>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            INTELGRAPH AI is a demonstration environment for AI-assisted network analysis. Every module reads from the
            same synthetic case records, so a document you extract is the same record the graph plots and the analyst cites.
          </p>
        </Reveal>

        <div className="mt-14 space-y-14 lg:space-y-20">
          {BLOCKS.map((block, i) => {
            const Visual = block.visual;
            const reverse = block.align === 'right';
            return (
              <Reveal key={block.index} delay={60}>
                <div className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-display text-4xl font-bold text-primary/25">{block.index}</span>
                      <span className="h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
                    </div>
                    <h3 className="mt-4 font-display text-2xl font-semibold uppercase tracking-[0.02em] sm:text-3xl">
                      {block.title}
                    </h3>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">{block.body}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      {(i === 0
                        ? ['Validated mapping', 'Rows rejected with reasons', 'Extraction review queue']
                        : i === 1
                          ? ['No decorative edges', 'Degree & centrality', 'Source references']
                          : ['Confidence rated', 'Limitations stated', 'Saved to the case file']
                      ).map((tag) => (
                        <span key={tag} className="rounded-sm border border-white/10 bg-white/[0.02] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <TiltCard className="relative">
                    <div className="pointer-events-none absolute -inset-6 bg-[radial-gradient(60%_60%_at_50%_50%,hsl(var(--neon)/0.14),transparent_75%)]" />
                    <div className="relative">
                      <Visual />
                    </div>
                  </TiltCard>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}