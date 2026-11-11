import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/motion/Reveal';
import MagneticButton from '@/components/motion/MagneticButton';
import TiltCard from '@/components/motion/TiltCard';

const STEPS = [
  {
    index: '01',
    title: 'Create a case',
    body: 'Open a fictional demonstration workspace with a case code, priority and lifecycle status.',
    preview: 'Case · IG-2026-014 · Active'
  },
  {
    index: '02',
    title: 'Import data',
    body: 'Bring in CSV or JSON samples through validated column mapping — every failed row comes back with a reason.',
    preview: '4 supported record layouts'
  },
  {
    index: '03',
    title: 'Extract information',
    body: 'Open PDF and TXT samples, read the extracted text and approve the suggested entities and references.',
    preview: 'Review queue · human in the loop'
  },
  {
    index: '04',
    title: 'Explore connections',
    body: 'View recorded relationships in the interactive graph, with type, verification state and source reference.',
    preview: 'Graph · pan, zoom, filter'
  },
  {
    index: '05',
    title: 'Analyse patterns',
    body: 'Run graph statistics and review explainable pattern observations with confidence and limitations.',
    preview: 'Degree · centrality · density'
  },
  {
    index: '06',
    title: 'Ask NEXUS AI',
    body: 'Open the assistant and question the case. It reads only the stored records, cites them and says when the answer is not there.',
    preview: 'NEXUS AI · cited answers'
  },
  {
    index: '07',
    title: 'Review evidence',
    body: 'Confirm each sample item, record its verification state and attach the reviewer note that supports it.',
    preview: 'Evidence · verification states'
  },
  {
    index: '08',
    title: 'Generate a report',
    body: 'Build a versioned analytical report from the case records, then export it as a PDF.',
    preview: 'Export · PDF'
  }
];

export default function HowItWorks() {
  return (
    <section id="how" className="relative border-t border-white/[0.06] px-0 py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px ig-neon-rule" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <span className="ig-label">Workflow</span>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] sm:text-4xl lg:text-5xl">
            How Intelgraph AI<span className="text-primary"> works.</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Seven stages, exactly as they run inside the platform. Scroll the rail to follow the case from raw sample
            records to an exported analytical report.
          </p>
        </Reveal>
      </div>

      <Reveal className="mt-12">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-6 left-0 hidden w-full items-start lg:flex">
            <div className="mt-[62px] h-px w-full bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
          </div>

          <div className="ig-scroll flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 sm:px-8">
            {STEPS.map((step) => (
              <TiltCard key={step.index} className="w-[248px] shrink-0 snap-start sm:w-[268px]">
                <div className="group relative h-full overflow-hidden rounded-sm border border-white/[0.08] bg-card/50 p-5 transition-colors duration-300 hover:border-primary/45">
                  <div className="pointer-events-none absolute -right-6 -top-8 font-display text-[76px] font-bold leading-none text-primary/[0.07] transition-colors group-hover:text-primary/[0.14]">
                    {step.index}
                  </div>
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full border border-primary/45 bg-background font-display text-[11px] font-bold text-primary shadow-[0_0_22px_-8px_hsl(var(--neon)/0.95)]">
                    {step.index}
                  </div>
                  <h3 className="relative mt-5 font-display text-[13px] font-semibold uppercase tracking-[0.1em]">{step.title}</h3>
                  <p className="relative mt-2.5 min-h-[88px] text-[12px] leading-relaxed text-muted-foreground">{step.body}</p>
                  <div className="relative mt-3 border-t border-white/[0.07] pt-2.5 font-mono text-[9px] uppercase tracking-[0.1em] text-primary/80">
                    {step.preview}
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </Reveal>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-start gap-4 px-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">
          Instruction labels match the shipped application: every stage above maps to a working module, and every
          figure is counted from stored synthetic records.
        </p>
        <MagneticButton to="/dashboard" className="shrink-0">
          Start exploring <ArrowRight className="h-3.5 w-3.5" />
        </MagneticButton>
      </div>
    </section>
  );
}