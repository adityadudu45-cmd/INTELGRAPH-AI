import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Network, Search, RotateCcw, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import NetworkCanvas from '@/components/graph/NetworkCanvas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toList, ENTITY_CATEGORIES, RELATIONSHIP_TYPES, VERIFICATION_STATES, ENTITY_COLORS, RELATIONSHIP_STYLE } from '@/lib/constants';
import { computeMetrics } from '@/lib/graph';

export default function Graph() {
  const [params, setParams] = useSearchParams();
  const initialCase = params.get('case') || 'all';
  const [cases, setCases] = useState([]);
  const [raw, setRaw] = useState(null);
  const [caseId, setCaseId] = useState(initialCase);
  const [category, setCategory] = useState('all');
  const [relType, setRelType] = useState('all');
  const [verification, setVerification] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState(params.get('node') || '');
  const [selectedEdge, setSelectedEdge] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [depth, setDepth] = useState('1');

  const load = async () => {
    const query = caseId === 'all' ? {} : { investigation_id: caseId };
    const [entities, relationships] = await Promise.all([
      base44.entities.EntityRecord.filter(query, { limit: 600 }),
      base44.entities.RelationshipRecord.filter(query, { limit: 800 })
    ]);
    setRaw({ entities: toList(entities), relationships: toList(relationships) });
  };

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 100).then((r) => setCases(toList(r)));
  }, []);

  useEffect(() => {
    setRaw(null);
    load();
    if (caseId !== 'all') setParams({ case: caseId }, { replace: true });
    else setParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const { nodes, edges } = useMemo(() => {
    if (!raw) return { nodes: [], edges: [] };
    const q = search.trim().toLowerCase();
    const nodeList = raw.entities
      .filter((e) => (category === 'all' || e.category === category))
      .filter((e) => !q || `${e.display_label} ${e.identifier || ''}`.toLowerCase().includes(q))
      .map((e) => ({ id: e.id, label: e.display_label, category: e.category, identifier: e.identifier, record: e }));
    const nodeIds = new Set(nodeList.map((n) => n.id));
    const edgeList = raw.relationships
      .filter((r) => nodeIds.has(r.source_entity_id) && nodeIds.has(r.target_entity_id))
      .filter((r) => relType === 'all' || r.relationship_type === relType)
      .filter((r) => verification === 'all' || r.verification === verification)
      .map((r) => ({
        id: r.id, source: r.source_entity_id, target: r.target_entity_id,
        relationship_type: r.relationship_type, verification: r.verification, record: r
      }));
    return { nodes: nodeList, edges: edgeList };
  }, [raw, category, relType, verification, search]);

  const focused = useMemo(() => {
    if (!focusMode || !selectedNode || !nodes.some((n) => n.id === selectedNode)) return { nodes, edges };
    const allowed = new Set([selectedNode]);
    let frontier = [selectedNode];
    const maxDepth = depth === 'all' ? 6 : Number(depth);
    for (let d = 0; d < maxDepth; d += 1) {
      const next = [];
      edges.forEach((e) => {
        if (frontier.includes(e.source) && !allowed.has(e.target)) { allowed.add(e.target); next.push(e.target); }
        if (frontier.includes(e.target) && !allowed.has(e.source)) { allowed.add(e.source); next.push(e.source); }
      });
      frontier = next;
      if (!frontier.length) break;
    }
    return {
      nodes: nodes.filter((n) => allowed.has(n.id)),
      edges: edges.filter((e) => allowed.has(e.source) && allowed.has(e.target))
    };
  }, [focusMode, selectedNode, depth, nodes, edges]);

  const metrics = useMemo(() => computeMetrics(focused.nodes, focused.edges), [focused]);

  const rankedDegree = [...focused.nodes]
    .map((n) => ({ ...n, degree: metrics.degree.get(n.id) || 0, between: metrics.betweenness.get(n.id) || 0 }))
    .sort((a, b) => b.degree - a.degree);

  const node = focused.nodes.find((n) => n.id === selectedNode) || null;
  const edge = focused.edges.find((e) => e.id === selectedEdge) || null;
  const directLinks = useMemo(() => {
    if (!node) return [];
    return focused.edges
      .filter((e) => e.source === node.id || e.target === node.id)
      .map((e) => ({ ...e, other: focused.nodes.find((n) => n.id === (e.source === node.id ? e.target : e.source)) }))
      .filter((e) => e.other);
  }, [node, focused]);

  const resetFilters = () => {
    setCategory('all'); setRelType('all'); setVerification('all'); setSearch('');
    setSelectedNode(''); setSelectedEdge(''); setFocusMode(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 4 · network graph"
        title="Relationship graph"
        description="Every node and edge below comes from a stored record. Layout, centrality and community grouping are computed in the browser and described in plain language."
        actions={<Button variant="outline" size="sm" onClick={resetFilters}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reset view</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} />
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an entity in the graph" className="pl-8" aria-label="Search graph nodes" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by entity category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ENTITY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={relType} onValueChange={setRelType}>
          <SelectTrigger className="w-[210px]" aria-label="Filter by relationship type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All relationship types</SelectItem>
            {RELATIONSHIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={verification} onValueChange={setVerification}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by verification"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any verification</SelectItem>
            {VERIFICATION_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!raw && <div className="ig-panel"><Loading label="Loading graph records…" /></div>}

      {raw && !nodes.length && (
        <div className="ig-panel"><EmptyState icon={Network} title="Nothing to plot" description="No entity records match these filters. Import a sample or widen the filters." /></div>
      )}

      {raw && nodes.length > 0 && (
        <div className="grid gap-3 xl:grid-cols-4">
          <div className="xl:col-span-3">
            <Panel
              title="Interactive canvas"
              subtitle={`${focused.nodes.length} nodes · ${focused.edges.length} edges shown`}
              bodyClassName="p-3"
              action={
                <div className="flex items-center gap-2">
                  <Label htmlFor="focus-toggle" className="text-[11px] text-muted-foreground">Focus on selection</Label>
                  <Switch id="focus-toggle" checked={focusMode} onCheckedChange={setFocusMode} />
                  <Select value={depth} onValueChange={setDepth}>
                    <SelectTrigger className="h-8 w-[92px] text-[11px]" aria-label="Connection depth"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hop</SelectItem>
                      <SelectItem value="2">2 hops</SelectItem>
                      <SelectItem value="all">All hops</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              <NetworkCanvas
                nodes={focused.nodes}
                edges={focused.edges}
                selectedNodeId={selectedNode}
                selectedEdgeId={selectedEdge}
                onSelectNode={(n) => { setSelectedNode(n.id); setSelectedEdge(''); }}
                onSelectEdge={(e) => { setSelectedEdge(e.id); setSelectedNode(''); }}
                height={520}
              />
              <div className="mt-2 flex flex-wrap gap-3">
                {ENTITY_CATEGORIES.map((c) => (
                  <span key={c} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="h-2 w-2 rounded-sm" style={{ background: ENTITY_COLORS[c] }} />{c}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel title="Graph analytics" subtitle="Descriptive measures of the displayed synthetic graph" className="mt-3">
              <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <Metric label="Nodes" value={metrics.nodeCount} hint="Entity records in view" />
                <Metric label="Edges" value={metrics.edgeCount} hint="Relationship records in view" />
                <Metric label="Density" value={metrics.density.toFixed(3)} hint="Share of possible links present" />
                <Metric label="Avg degree" value={metrics.averageDegree.toFixed(2)} hint="Mean links per node" />
                <Metric label="Components" value={metrics.components.length} hint="Separate connected groups" />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div>
                  <div className="ig-label mb-1.5">Most connected nodes (degree centrality)</div>
                  <ul className="space-y-1.5">
                    {rankedDegree.slice(0, 5).map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <button onClick={() => setSelectedNode(n.id)} className="truncate text-left hover:text-primary">{n.label}</button>
                        <span className="ig-mono text-muted-foreground">{n.degree} links · {((metrics.degreeCentrality.get(n.id) || 0) * 100).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Centrality counts recorded links only. A highly connected node may simply be the best-documented record in the dataset.</p>
                </div>
                <div>
                  <div className="ig-label mb-1.5">Highest betweenness</div>
                  <ul className="space-y-1.5">
                    {[...rankedDegree].sort((a, b) => b.between - a.between).slice(0, 5).map((n) => (
                      <li key={n.id} className="flex items-center justify-between gap-2 text-[11px]">
                        <button onClick={() => setSelectedNode(n.id)} className="truncate text-left hover:text-primary">{n.label}</button>
                        <span className="ig-mono text-muted-foreground">{n.between.toFixed(3)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Betweenness shows how often a node sits on the shortest path between others. It is structural only and implies nothing about conduct.</p>
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-3">
            <Panel title="Selection">
              {!node && !edge && (
                <p className="text-[11px] leading-relaxed text-muted-foreground">Click a node to inspect its recorded links, or click a line to read the relationship record behind it.</p>
              )}
              {node && (
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{node.label}</p>
                      <p className="ig-mono text-[10px] text-muted-foreground">{node.identifier || 'no identifier'}</p>
                    </div>
                    <StatusPill value={node.category} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Info label="Direct links" value={directLinks.length} />
                    <Info label="Degree centrality" value={`${((metrics.degreeCentrality.get(node.id) || 0) * 100).toFixed(0)}%`} />
                    <Info label="Closeness" value={`${((metrics.closeness.get(node.id) || 0) * 100).toFixed(0)}%`} />
                    <Info label="Community" value={`#${metrics.communities.get(node.id) || 1}`} />
                  </div>
                  {node.record?.description && <p className="text-[11px] leading-relaxed text-muted-foreground">{node.record.description}</p>}
                  <div className="max-h-[200px] space-y-1 overflow-y-auto ig-scroll">
                    {directLinks.map((l) => (
                      <button key={l.id} onClick={() => { setSelectedNode(l.other.id); setSelectedEdge(''); }} className="flex w-full items-center justify-between gap-2 rounded border border-border/50 px-2 py-1.5 text-left text-[10px] hover:bg-muted/40">
                        <span className="truncate">{l.other.label}</span>
                        <span className="shrink-0" style={{ color: (RELATIONSHIP_STYLE[l.relationship_type] || {}).color }}>{l.verification}</span>
                      </button>
                    ))}
                  </div>
                  <Button asChild size="sm" variant="outline" className="w-full"><Link to={`/entities/${node.id}`}>Open entity profile<ArrowRight className="ml-1.5 h-3.5 w-3.5" /></Link></Button>
                </div>
              )}
              {edge && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{edge.record.source_label} → {edge.record.target_label}</p>
                  <StatusPill value={edge.relationship_type} />
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Info label="Verification" value={edge.verification} />
                    <Info label="Origin" value={edge.record.origin || 'Imported'} />
                    <Info label="Confidence" value={`${edge.record.confidence ?? 0}%`} />
                    <Info label="Review" value={edge.record.review_status || 'Unreviewed'} />
                  </div>
                  <div>
                    <div className="ig-label mb-1">Source reference</div>
                    <p className="text-[11px] text-muted-foreground">{edge.record.source_reference || '—'}</p>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{edge.record.description}</p>
                  <Button asChild size="sm" variant="outline" className="w-full"><Link to={`/relationships?case=${edge.record.investigation_id}`}>Open relationship workspace</Link></Button>
                </div>
              )}
            </Panel>

            <Panel title="Communities" subtitle="Grouped by label propagation">
              <ul className="space-y-1.5">
                {metrics.components.map((comp, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-muted-foreground">Group {i + 1}</span>
                    <span className="ig-mono">{comp.length} node(s)</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Groups are inferred from link structure alone, so they describe documentation patterns rather than real-world associations.</p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="ig-label text-[9px]">{label}</div>
      <div className="mt-0.5 font-heading text-lg tabular-nums">{value}</div>
      <p className="text-[9px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded border border-border/50 bg-background/40 px-2 py-1.5">
      <div className="ig-label text-[9px]">{label}</div>
      <div className="text-[11px]">{value}</div>
    </div>
  );
}