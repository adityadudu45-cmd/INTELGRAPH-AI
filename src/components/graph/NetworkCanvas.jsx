import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeLayout, buildAdjacency } from '@/lib/graph';
import { ENTITY_COLORS, RELATIONSHIP_STYLE, ENTITY_ICON_SHAPE } from '@/lib/constants';
import { cn } from '@/lib/utils';

const W = 760;
const H = 520;

function NodeShape({ shape, color, selected }) {
  const stroke = selected ? '#ffffff' : color;
  const strokeWidth = selected ? 2.4 : 1.4;
  if (shape === 'square') return <rect x="-9" y="-9" width="18" height="18" rx="3" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
  if (shape === 'triangle') return <polygon points="0,-11 10,8 -10,8" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
  if (shape === 'diamond') return <polygon points="0,-11 10,0 0,11 -10,0" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
  if (shape === 'hex') return <polygon points="0,-10 8.5,-5 8.5,5 0,10 -8.5,5 -8.5,-5" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
  if (shape === 'star') return <polygon points="0,-11 3,-3 11,-3 5,2 7,10 0,5 -7,10 -5,2 -11,-3 -3,-3" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
  return <circle r="9" fill={color} fillOpacity="0.9" stroke={stroke} strokeWidth={strokeWidth} />;
}

export default function NetworkCanvas({
  nodes = [], edges = [], selectedNodeId, selectedEdgeId,
  onSelectNode, onSelectEdge, height = 520, className, layoutSeed = 7
}) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [seed, setSeed] = useState(layoutSeed);
  const [positions, setPositions] = useState(new Map());
  const [hovered, setHovered] = useState('');
  const dragRef = useRef(null);
  const panRef = useRef(null);
  const svgRef = useRef(null);

  const nodeKey = useMemo(() => nodes.map((n) => n.id).sort().join('|'), [nodes]);

  useEffect(() => {
    setPositions(computeLayout(nodes, edges, seed, W, H));
  }, [nodeKey, seed]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusId = selectedNodeId || hovered;

  const neighbours = useMemo(() => {
    if (!focusId) return null;
    const adj = buildAdjacency(edges);
    const set = new Set(adj.get(focusId) || []);
    set.add(focusId);
    return set;
  }, [edges, focusId]);

  const toLocal = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * W;
    const y = ((event.clientY - rect.top) / rect.height) * H;
    return { x: (x - view.x) / view.k, y: (y - view.y) / view.k };
  };

  useEffect(() => {
    const move = (event) => {
      if (dragRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * W;
        const y = ((event.clientY - rect.top) / rect.height) * H;
        const localX = (x - view.x) / view.k;
        const localY = (y - view.y) / view.k;
        setPositions((prev) => {
          const next = new Map(prev);
          next.set(dragRef.current, { x: localX, y: localY });
          return next;
        });
      } else if (panRef.current) {
        setView((prev) => ({ ...prev, x: prev.x + (event.clientX - panRef.current.x), y: prev.y + (event.clientY - panRef.current.y) }));
        panRef.current = { x: event.clientX, y: event.clientY };
      }
    };
    const up = () => { dragRef.current = null; panRef.current = null; };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [view]);

  const zoom = (factor) => setView((prev) => ({ ...prev, k: Math.max(0.4, Math.min(2.6, prev.k * factor)) }));

  useEffect(() => {
    const element = svgRef.current;
    if (!element) return undefined;
    const onWheel = (event) => {
      event.preventDefault();
      setView((prev) => ({ ...prev, k: Math.max(0.4, Math.min(2.6, prev.k * (event.deltaY < 0 ? 1.12 : 0.9))) }));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  const reset = () => {
    setView({ x: 0, y: 0, k: 1 });
    setSeed((s) => s + 13);
  };

  return (
    <div className={cn('relative overflow-hidden rounded-md border border-border/70 bg-[hsl(0_0%_2%)] ig-grid-lines', className)}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{ height, width: '100%' }}
        className="touch-pan-y select-none"
        onPointerDown={(e) => { panRef.current = { x: e.clientX, y: e.clientY }; }}
        role="application"
        aria-label="Interactive relationship graph"
      >
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {edges.map((edge) => {
            const a = positions.get(edge.source);
            const b = positions.get(edge.target);
            if (!a || !b) return null;
            const style = RELATIONSHIP_STYLE[edge.relationship_type] || { dash: '', color: '#64748b' };
            const dim = neighbours && !(neighbours.has(edge.source) && neighbours.has(edge.target));
            const isSelected = selectedEdgeId === edge.id;
            return (
              <g key={edge.id} opacity={dim ? 0.14 : 1}>
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={style.color} strokeWidth={isSelected ? 7 : 4} strokeOpacity={isSelected ? 0.18 : 0} strokeLinecap="round" />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={style.color} strokeWidth={isSelected ? 2.6 : 1.2} strokeDasharray={style.dash || undefined} strokeOpacity={isSelected ? 1 : 0.62} />
                {isSelected && (
                  <circle r="3.2" fill="#ffffff">
                    <animateMotion dur="1.8s" repeatCount="indefinite" path={`M${a.x},${a.y} L${b.x},${b.y}`} />
                  </circle>
                )}
                <line
                  x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="transparent" strokeWidth="12" className="cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => onSelectEdge?.(edge)}
                />
              </g>
            );
          })}

          {nodes.map((node) => {
            const p = positions.get(node.id);
            if (!p) return null;
            const dim = neighbours && !neighbours.has(node.id);
            const selected = selectedNodeId === node.id;
            return (
              <g
                key={node.id}
                transform={`translate(${p.x},${p.y})`}
                opacity={dim ? 0.22 : 1}
                className="cursor-grab"
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered((prev) => (prev === node.id ? '' : prev))}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  dragRef.current = node.id;
                  onSelectNode?.(node);
                }}
                onClick={() => onSelectNode?.(node)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectNode?.(node); }}
                aria-label={`${node.label} (${node.category})`}
              >
                {selected && <circle r="19" fill="none" stroke="hsl(var(--neon))" strokeWidth="1" strokeDasharray="3 3" className="animate-spin-slower" style={{ transformOrigin: 'center' }} />}
                {hovered === node.id && !selected && <circle r="17" fill="none" stroke="hsl(var(--neon) / 0.55)" strokeWidth="1" />}
                <circle r="14" fill={ENTITY_COLORS[node.category] || '#8a8a93'} opacity={selected ? 0.22 : hovered === node.id ? 0.16 : 0.1} />
                <NodeShape shape={ENTITY_ICON_SHAPE[node.category] || 'circle'} color={ENTITY_COLORS[node.category] || '#8a8a93'} selected={selected} />
                <text y="24" textAnchor="middle" fontSize="9" fill={selected ? '#ffffff' : 'hsl(240 5% 76%)'} className="pointer-events-none">
                  {node.label.length > 24 ? `${node.label.slice(0, 22)}…` : node.label}
                </text>
                {hovered === node.id && (
                  <text y="-24" textAnchor="middle" fontSize="8" letterSpacing="0.6" fill="hsl(var(--neon))" className="pointer-events-none uppercase">
                    {node.category}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute right-2 top-2 flex flex-col gap-1">
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => zoom(0.85)} aria-label="Zoom out"><Minus className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setView({ x: 0, y: 0, k: 1 })} aria-label="Fit graph"><Maximize2 className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="secondary" className="h-7 w-7" onClick={reset} aria-label="Reset layout"><RotateCcw className="h-3.5 w-3.5" /></Button>
      </div>

      {!nodes.length && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          No nodes match the current filters.
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">
        Drag nodes · drag canvas to pan · scroll or use the controls to zoom
      </div>
    </div>
  );
}