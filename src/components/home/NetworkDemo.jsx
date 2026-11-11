import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, Maximize2, Crosshair } from 'lucide-react';
import { SAMPLE_NODES, SAMPLE_EDGES, SAMPLE_CATEGORY_TONE } from '@/lib/sampleNetwork';
import { cn } from '@/lib/utils';

const W = 720;
const H = 420;

const EDGE_TONES = [
  'hsl(346 100% 50%)',
  'hsl(349 100% 68%)',
  'hsl(347 100% 40%)',
  'hsl(344 100% 84%)',
  'hsl(0 0% 72%)',
  'hsl(346 80% 58%)'
];

function degreeOf(id) {
  return SAMPLE_EDGES.filter((e) => e.source === id || e.target === id).length;
}

export default function NetworkDemo() {
  const [selectedId, setSelectedId] = useState('n1');
  const [hoverId, setHoverId] = useState(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const svgRef = useRef(null);
  const panRef = useRef(null);

  const nodeById = useMemo(() => new Map(SAMPLE_NODES.map((n) => [n.id, n])), []);
  const focusId = hoverId || selectedId;

  const neighbours = useMemo(() => {
    const set = new Set();
    if (!focusId) return set;
    set.add(focusId);
    SAMPLE_EDGES.forEach((e) => {
      if (e.source === focusId) set.add(e.target);
      if (e.target === focusId) set.add(e.source);
    });
    return set;
  }, [focusId]);

  const connections = useMemo(
    () =>
      SAMPLE_EDGES.filter((e) => e.source === selectedId || e.target === selectedId).map((e) => {
        const otherId = e.source === selectedId ? e.target : e.source;
        return { ...e, other: nodeById.get(otherId) };
      }),
    [selectedId, nodeById]
  );

  useEffect(() => {
    const move = (event) => {
      if (!panRef.current) return;
      setView((prev) => ({ ...prev, x: prev.x + (event.clientX - panRef.current.x), y: prev.y + (event.clientY - panRef.current.y) }));
      panRef.current = { x: event.clientX, y: event.clientY };
    };
    const up = () => { panRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const selected = nodeById.get(selectedId);

  return (
    <section id="explore" className="relative border-t border-white/[0.06] px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="ig-label">Explore</span>
            <h2 className="mt-4 font-display text-3xl font-bold uppercase leading-[1.05] sm:text-4xl lg:text-5xl">
              Read the network<span className="text-primary">, node by node.</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Hover to isolate a node, click to open its record, and zoom or pan the canvas. Every edge below is a
              recorded relationship with a stated type and source reference.
            </p>
          </div>
          <span className="rounded-sm border border-white/10 bg-white/[0.02] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            Illustrative sample network · fictional entities
          </span>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[1.65fr_1fr]">
          <div className="relative overflow-hidden rounded-sm border border-white/[0.08] bg-[hsl(0_0%_3%)]">
            <div className="pointer-events-none absolute inset-0 ig-grid-lines opacity-25" />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="relative h-[320px] w-full touch-pan-y select-none sm:h-[420px]"
              role="application"
              aria-label="Interactive sample relationship network"
              onPointerDown={(e) => { panRef.current = { x: e.clientX, y: e.clientY }; }}
            >
              <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
                {SAMPLE_EDGES.map((edge, i) => {
                  const a = nodeById.get(edge.source);
                  const b = nodeById.get(edge.target);
                  if (!a || !b) return null;
                  const dim = !neighbours.has(edge.source) || !neighbours.has(edge.target);
                  return (
                    <line
                      key={edge.id}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={EDGE_TONES[i % EDGE_TONES.length]}
                      strokeWidth="1.1"
                      strokeDasharray={i % 3 === 0 ? '5 4' : undefined}
                      strokeOpacity={dim ? 0.1 : 0.55}
                      style={{ transition: 'stroke-opacity 0.3s ease' }}
                    />
                  );
                })}

                {SAMPLE_NODES.map((node) => {
                  const dim = !neighbours.has(node.id);
                  const active = selectedId === node.id;
                  const radius = 6 + degreeOf(node.id) * 1.6;
                  const tone = SAMPLE_CATEGORY_TONE[node.category] || 'hsl(var(--neon))';
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x},${node.y})`}
                      className="cursor-pointer"
                      opacity={dim ? 0.28 : 1}
                      style={{ transition: 'opacity 0.3s ease' }}
                      onPointerEnter={() => setHoverId(node.id)}
                      onPointerLeave={() => setHoverId(null)}
                      onClick={() => setSelectedId(node.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(node.id); }}
                      aria-label={`${node.label} (${node.category})`}
                    >
                      <circle r={radius + 12} fill={tone} opacity={active ? 0.16 : 0.07} />
                      {active && <circle r={radius + 7} fill="none" stroke="hsl(var(--neon))" strokeWidth="0.9" strokeDasharray="3 3" />}
                      <circle r={radius} fill={active ? '#ffffff' : tone} opacity={active ? 0.95 : 0.85} />
                      <text
                        y={radius + 15}
                        textAnchor="middle"
                        fontSize="9"
                        fill={active ? '#ffffff' : 'hsl(240 5% 68%)'}
                        className="pointer-events-none"
                      >
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            <div className="absolute right-2 top-2 flex flex-col gap-1">
              <button type="button" onClick={() => setView((v) => ({ ...v, k: Math.min(2.2, v.k * 1.2) }))} aria-label="Zoom in" className="flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 bg-background/80 text-foreground hover:border-primary/50">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setView((v) => ({ ...v, k: Math.max(0.55, v.k * 0.85) }))} aria-label="Zoom out" className="flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 bg-background/80 text-foreground hover:border-primary/50">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Reset view" className="flex h-7 w-7 items-center justify-center rounded-sm border border-white/10 bg-background/80 text-foreground hover:border-primary/50">
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="pointer-events-none absolute bottom-2 left-2 rounded-sm border border-white/10 bg-background/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              Drag to pan · use + / − to zoom
            </div>
          </div>

          <div className="rounded-sm border border-white/[0.08] bg-card/50 p-4">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Selected record</span>
                    <h3 className="mt-1.5 font-display text-lg font-semibold uppercase leading-tight">{selected.label}</h3>
                  </div>
                  <span className="rounded-sm border border-primary/35 bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-primary">
                    {selected.category}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-2.5">
                    <div className="font-display text-lg text-foreground">{connections.length}</div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Recorded links</div>
                  </div>
                  <div className="rounded-sm border border-white/[0.07] bg-white/[0.02] p-2.5">
                    <div className="font-display text-lg text-foreground">{degreeOf(selected.id)}</div>
                    <div className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Graph degree</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-3 w-3 text-primary" />
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">Connected records</span>
                  </div>
                  <ul className="ig-scroll mt-2 max-h-[188px] space-y-2 overflow-y-auto pr-1">
                    {connections.map((conn) => (
                      <li key={conn.id} className="rounded-sm border border-white/[0.07] bg-white/[0.015] p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn('text-[11px] font-medium text-foreground')}>{conn.other?.label}</span>
                          <span className="font-mono text-[9px] text-muted-foreground">{conn.other?.category}</span>
                        </div>
                        <p className="mt-1 text-[10px] leading-relaxed text-primary/85">{conn.type}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-muted-foreground">{conn.reference}</p>
                      </li>
                    ))}
                    {!connections.length && <li className="text-[11px] text-muted-foreground">No recorded links.</li>}
                  </ul>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Select a node to inspect its record.</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(SAMPLE_CATEGORY_TONE).map(([category, tone]) => (
            <span key={category} className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.07] px-2 py-1 text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
              {category}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}