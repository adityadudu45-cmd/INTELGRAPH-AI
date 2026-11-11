import { ShieldCheck, Users, ScanEye, ScrollText, UserCheck, FlaskConical, Bot } from 'lucide-react';
import Reveal from '@/components/motion/Reveal';

const POINTS = [
  { icon: Users, title: 'Open demonstration access', body: 'No account is required to explore the workspace. Dataset resets and account management are not exposed to visitors.' },
  { icon: ScanEye, title: 'Evidence traceability', body: 'Sample evidence keeps its source, verification state and version history — never a bare claim.' },
  { icon: ScrollText, title: 'Audit logging', body: 'Case, import, document and report actions are recorded with actor label, outcome and timestamp.' },
  { icon: UserCheck, title: 'Human verification', body: 'Extracted entities and suggestions stay unreviewed until a person accepts them.' },
  { icon: FlaskConical, title: 'Synthetic demonstration data', body: 'Every case, entity and document is invented for demonstration and labelled as such.' },
  { icon: Bot, title: 'Bounded AI use', body: 'Language-model extraction and summaries run only on synthetic samples, return labelled suggestions, and never stand in for a finding.' }
];

export default function SecuritySection() {
  return (
    <section id="about" className="relative overflow-hidden border-t border-white/[0.06] px-5 py-20 sm:px-8 lg:py-28">
      <div className="pointer-events-none absolute inset-0 ig-grid-fine opacity-30" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1fr_0.85fr]">
        <Reveal>
          <span className="ig-label">Security &amp; transparency</span>
          <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] sm:text-4xl lg:text-5xl">
            Built for scrutiny<span className="text-primary">, not spectacle.</span>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            An intelligence surface is only useful if you can see where its claims come from. Access control,
            traceability and explicit limitations are part of the interface — not footnotes.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.06] sm:grid-cols-2">
            {POINTS.map((point) => {
              const Icon = point.icon;
              return (
                <div key={point.title} className="bg-background/85 p-4 transition-colors hover:bg-card/80">
                  <Icon className="h-4 w-4 text-primary" />
                  <h3 className="mt-2.5 font-display text-[11px] font-semibold uppercase tracking-[0.1em]">{point.title}</h3>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{point.body}</p>
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={120} className="relative mx-auto w-full max-w-sm">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_50%,hsl(var(--neon)/0.2),transparent_72%)]" />
          <svg viewBox="0 0 320 320" className="relative mx-auto w-full" aria-hidden="true">
            <defs>
              <radialGradient id="shieldCore" cx="50%" cy="45%" r="55%">
                <stop offset="0%" stopColor="hsl(0 0% 100%)" stopOpacity="0.85" />
                <stop offset="35%" stopColor="hsl(var(--neon))" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(var(--neon))" stopOpacity="0" />
              </radialGradient>
            </defs>
            {[138, 112, 86, 60].map((r, i) => (
              <circle
                key={r}
                cx="160"
                cy="160"
                r={r}
                fill="none"
                stroke="hsl(var(--neon))"
                strokeOpacity={0.14 + i * 0.06}
                strokeWidth="0.9"
                strokeDasharray={i % 2 ? '4 6' : undefined}
              />
            ))}
            <circle cx="160" cy="160" r="86" fill="url(#shieldCore)" opacity="0.55" />
            {[0, 72, 144, 216, 288].map((angle) => {
              const rad = (angle * Math.PI) / 180;
              return (
                <circle
                  key={angle}
                  cx={160 + Math.cos(rad) * 112}
                  cy={160 + Math.sin(rad) * 112}
                  r="3"
                  fill="hsl(var(--neon))"
                  opacity="0.9"
                />
              );
            })}
            <path
              d="M160 84 L214 106 V158 C214 194 188 220 160 232 C132 220 106 194 106 158 V106 Z"
              fill="hsl(0 0% 3% / 0.6)"
              stroke="hsl(var(--neon))"
              strokeWidth="1.4"
              strokeOpacity="0.85"
            />
            <path d="M140 158 L154 172 L184 140" fill="none" stroke="hsl(var(--neon))" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="relative mt-4 flex items-center justify-center gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 text-primary" />
            Public demonstration · fully audited
          </div>
        </Reveal>
      </div>
    </section>
  );
}