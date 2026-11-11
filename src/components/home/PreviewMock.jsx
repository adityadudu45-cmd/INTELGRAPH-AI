const VARIANT_LABEL = {
  dashboard: 'Dashboard',
  graph: 'Network graph',
  documents: 'Document intelligence',
  evidence: 'Evidence library',
  patterns: 'Pattern analysis',
  timeline: 'Timeline analysis'
};

function Chrome({ variant, children }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-sm border border-white/[0.09] bg-[hsl(0_0%_2%)]">
      <div className="flex h-6 items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.02] px-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-white/10" />
        <span className="ml-2 truncate font-mono text-[8px] uppercase tracking-[0.14em] text-muted-foreground">intelgraph · {VARIANT_LABEL[variant] || 'workspace'}</span>
      </div>
      <div className="h-[calc(100%-1.5rem)] p-2.5">{children}</div>
    </div>
  );
}

function DashboardMock() {
  return (
    <div className="flex h-full gap-2">
      <div className="hidden w-[34px] shrink-0 flex-col gap-1.5 rounded-sm border border-white/[0.06] bg-white/[0.015] p-1.5 sm:flex">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={`h-1.5 rounded-sm ${i === 0 ? 'bg-primary/70' : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="grid grid-cols-4 gap-1.5">
          {['Cases', 'Entities', 'Links', 'Reports'].map((label, i) => (
            <div key={label} className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-1.5">
              <div className="font-display text-[11px] leading-none text-foreground">{[3, 15, 20, 2][i]}</div>
              <div className="mt-1 truncate text-[7px] uppercase tracking-[0.1em] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 rounded-sm border border-white/[0.07] bg-white/[0.015] p-2">
          <svg viewBox="0 0 200 70" className="h-full w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mockArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--neon))" stopOpacity="0.45" />
                <stop offset="100%" stopColor="hsl(var(--neon))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 58 L28 42 L56 48 L84 26 L112 34 L140 14 L168 22 L200 8 L200 70 L0 70 Z" fill="url(#mockArea)" />
            <path d="M0 58 L28 42 L56 48 L84 26 L112 34 L140 14 L168 22 L200 8" fill="none" stroke="hsl(var(--neon))" strokeWidth="1.4" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function GraphMock() {
  const nodes = [[38, 62], [96, 30], [120, 88], [168, 52], [186, 100], [70, 104], [148, 24]];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [2, 5], [1, 6], [6, 3]];
  return (
    <div className="relative h-full overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.012]">
      <div className="absolute inset-0 ig-grid-lines opacity-20" />
      <svg viewBox="0 0 220 124" className="relative h-full w-full">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke="hsl(var(--neon))" strokeOpacity={i % 2 ? 0.35 : 0.6} strokeWidth="0.8" strokeDasharray={i === 4 ? '3 3' : undefined} />
        ))}
        {nodes.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={i === 3 ? 8 : 6} fill="hsl(var(--neon))" opacity="0.12" />
            <circle cx={x} cy={y} r={i === 3 ? 4.2 : 3} fill={i === 3 ? '#fff' : 'hsl(var(--neon))'} opacity="0.9" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function DocumentsMock() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      {[
        ['SYN-DOC-014 · incident summary', 'Completed'],
        ['SYN-DOC-019 · observation log', 'Needs Review'],
        ['SYN-DOC-026 · transaction sample', 'Completed']
      ].map(([name, status]) => (
        <div key={name} className="flex items-center gap-2 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-2">
          <span className="h-6 w-5 shrink-0 rounded-sm border border-primary/30 bg-primary/10" />
          <span className="min-w-0 flex-1 truncate text-[9px] text-foreground/85">{name}</span>
          <span className={`shrink-0 rounded-sm border px-1 py-0.5 text-[7px] uppercase tracking-[0.08em] ${status === 'Completed' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/15 bg-white/[0.04] text-muted-foreground'}`}>
            {status}
          </span>
        </div>
      ))}
      <div className="mt-auto flex items-center justify-between rounded-sm border border-white/[0.07] bg-white/[0.015] px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
        <span>Extraction review</span>
        <span className="text-primary">3 suggested</span>
      </div>
    </div>
  );
}

function EvidenceMock() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      {[
        ['EV-014 · observation log', 'Verified Sample Record'],
        ['EV-012 · payment sample', 'Under Review'],
        ['EV-009 · incident summary', 'Unreviewed']
      ].map(([name, status]) => (
        <div key={name} className="flex items-center gap-2 rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-2">
          <span className="min-w-0 flex-1 truncate text-[9px] text-foreground/85">{name}</span>
          <span className={`shrink-0 rounded-sm border px-1 py-0.5 text-[7px] uppercase tracking-[0.08em] ${status === 'Verified Sample Record' ? 'border-primary/30 bg-primary/10 text-primary' : 'border-white/15 bg-white/[0.04] text-muted-foreground'}`}>
            {status}
          </span>
        </div>
      ))}
      <div className="mt-auto flex items-center justify-between rounded-sm border border-white/[0.07] bg-white/[0.015] px-2 py-1.5 font-mono text-[8px] uppercase tracking-[0.1em] text-muted-foreground">
        <span>Evidence register</span>
        <span className="text-primary">3 of 5 verified</span>
      </div>
    </div>
  );
}

function PatternsMock() {
  return (
    <div className="flex h-full flex-col gap-1.5">
      {[
        ['Repeated identifier across documents', 84],
        ['Shared event with three participants', 67],
        ['Isolated node — limited evidence', 31]
      ].map(([title, score]) => (
        <div key={title} className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[9px] text-foreground/85">{title}</span>
            <span className="font-mono text-[7px] text-muted-foreground">{score}%</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-primary" style={{ width: `${score}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineMock() {
  return (
    <div className="relative h-full pl-4">
      <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary/60 via-primary/25 to-transparent" />
      {[
        ['12 Mar · 21:40', 'Simulated handover event'],
        ['13 Mar · 06:12', 'Transaction reference recorded'],
        ['15 Mar · approx.', 'Observation log entry']
      ].map(([time, label]) => (
        <div key={time} className="relative mb-2.5 last:mb-0">
          <span className="absolute -left-4 top-1 h-2 w-2 rounded-full border border-primary/60 bg-background" />
          <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
            <div className="font-mono text-[7px] uppercase tracking-[0.1em] text-primary/80">{time}</div>
            <div className="mt-0.5 truncate text-[9px] text-foreground/80">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

const MOCKS = {
  dashboard: DashboardMock,
  graph: GraphMock,
  documents: DocumentsMock,
  evidence: EvidenceMock,
  patterns: PatternsMock,
  timeline: TimelineMock
};

export default function PreviewMock({ variant }) {
  const Mock = MOCKS[variant] || DashboardMock;
  return (
    <Chrome variant={variant}>
      <Mock />
    </Chrome>
  );
}