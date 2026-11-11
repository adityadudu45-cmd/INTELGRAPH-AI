import { FileText, CheckCircle2, Sparkles } from 'lucide-react';

export function DocVisual() {
  return (
    <div className="ig-holo ig-clip rounded-sm p-4">
      <div className="flex items-center gap-2 border-b border-white/[0.07] pb-2.5">
        <FileText className="h-3.5 w-3.5 text-primary" />
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground">SYN-DOC-014.pdf</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
          <CheckCircle2 className="h-3 w-3 text-primary" /> Completed
        </span>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-1.5 w-full rounded-full bg-white/10" />
        <div className="h-1.5 w-11/12 rounded-full bg-white/[0.07]" />
        <div className="flex flex-wrap gap-1.5 py-1">
          {['Person · Maren Voss', 'Date · 12 Mar', 'Ref · SYN-PH-0192'].map((chip) => (
            <span key={chip} className="rounded-sm border border-primary/35 bg-primary/[0.09] px-1.5 py-0.5 font-mono text-[9px] text-primary/90">
              {chip}
            </span>
          ))}
        </div>
        <div className="h-1.5 w-10/12 rounded-full bg-white/[0.07]" />
        <div className="h-1.5 w-8/12 rounded-full bg-white/[0.05]" />
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-2.5 text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>Extraction suggested</span>
        <span className="text-primary">Awaiting review</span>
      </div>
    </div>
  );
}

export function GraphVisual() {
  const nodes = [
    { x: 30, y: 62, r: 6 },
    { x: 96, y: 28, r: 4.5 },
    { x: 120, y: 96, r: 5.5 },
    { x: 176, y: 54, r: 6.5 },
    { x: 210, y: 108, r: 4 },
    { x: 62, y: 116, r: 4 }
  ];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [2, 5], [0, 5]];
  return (
    <div className="ig-holo ig-clip relative overflow-hidden rounded-sm p-3">
      <div className="absolute inset-0 ig-grid-lines opacity-25" />
      <svg viewBox="0 0 240 140" className="relative h-[150px] w-full">
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x}
            y1={nodes[a].y}
            x2={nodes[b].x}
            y2={nodes[b].y}
            stroke="hsl(var(--neon))"
            strokeOpacity={i % 2 ? 0.28 : 0.6}
            strokeWidth="0.9"
            strokeDasharray={i % 3 === 0 ? '4 3' : undefined}
          />
        ))}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r + 6} fill="hsl(var(--neon))" opacity="0.12" />
            <circle
              cx={n.x}
              cy={n.y}
              r={n.r}
              fill={i === 3 ? 'hsl(0 0% 100%)' : 'hsl(var(--neon))'}
              opacity={i === 3 ? 0.95 : 0.8}
            />
          </g>
        ))}
      </svg>
      <div className="relative flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
        <span>8 nodes</span>
        <span>10 recorded edges</span>
      </div>
    </div>
  );
}

export function PatternVisual() {
  return (
    <div className="ig-holo ig-clip space-y-2.5 rounded-sm p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-[10px] uppercase tracking-[0.18em] text-foreground">Pattern observation</span>
        <span className="rounded-sm border border-primary/35 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-primary">High confidence</span>
      </div>
      <div className="rounded-sm border border-primary/25 bg-primary/[0.05] p-2.5">
        <p className="text-[11px] leading-relaxed text-foreground/90">
          The same synthetic identifier recurs across three stored records, two of them tied to one simulated event.
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-[84%] rounded-full bg-primary" />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['Entity · e-07', 'Relationship · r-04', 'Event · t-02'].map((chip) => (
            <span key={chip} className="rounded-sm border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">
              {chip}
            </span>
          ))}
        </div>
      </div>
      <p className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Limitations stated · supporting records linked</p>
    </div>
  );
}