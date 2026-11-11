import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GitBranch, ArrowRight, Plus, Search, Route } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { RELATIONSHIP_TYPES, VERIFICATION_STATES, REVIEW_STATUSES, toList, fmtDateTime } from '@/lib/constants';
import { findPath } from '@/lib/graph';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function Relationships() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [entities, setEntities] = useState([]);
  const [rels, setRels] = useState(null);
  const [search, setSearch] = useState('');
  const [verification, setVerification] = useState('all');
  const [startId, setStartId] = useState('');
  const [endId, setEndId] = useState('');
  const [maxDepth, setMaxDepth] = useState('3');
  const [pathResult, setPathResult] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ source: '', target: '', type: RELATIONSHIP_TYPES[0], description: '', reference: '', confidence: 60 });
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 100).then((r) => {
      const list = toList(r);
      setCases(list);
      if (list.length) setCaseId((prev) => prev || list[0].id);
    });
  }, []);

  const load = async () => {
    if (!caseId) return;
    setRels(null);
    const [entityPage, relPage] = await Promise.all([
      base44.entities.EntityRecord.filter({ investigation_id: caseId }, { sort: 'display_label', limit: 500 }),
      base44.entities.RelationshipRecord.filter({ investigation_id: caseId }, { limit: 800 })
    ]);
    setEntities(toList(entityPage));
    setRels(toList(relPage));
    setPathResult(null);
  };

  useEffect(() => { load(); }, [caseId]);

  const entityMap = useMemo(() => Object.fromEntries(entities.map((e) => [e.id, e])), [entities]);

  const filtered = (rels || []).filter((r) => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || `${r.source_label} ${r.target_label} ${r.relationship_type} ${r.source_reference || ''}`.toLowerCase().includes(q);
    const matchesVerification = verification === 'all' || r.verification === verification;
    return matchesText && matchesVerification;
  });

  const runPath = () => {
    if (!startId || !endId) { setError('Choose both a start and an end entity.'); return; }
    setError('');
    const edges = (rels || []).map((r) => ({ id: r.id, source: r.source_entity_id, target: r.target_entity_id, record: r }));
    const found = findPath(edges, startId, endId, Number(maxDepth));
    setPathResult(found || { empty: true });
  };

  const saveRelationship = async () => {
    if (!form.source || !form.target) { setError('Choose both entities.'); return; }
    if (form.source === form.target) { setError('A relationship needs two different entities.'); return; }
    try {
      await base44.entities.RelationshipRecord.create({
        investigation_id: caseId,
        source_entity_id: form.source,
        target_entity_id: form.target,
        source_label: entityMap[form.source]?.display_label || '',
        target_label: entityMap[form.target]?.display_label || '',
        relationship_type: form.type,
        description: form.description.trim(),
        source_reference: form.reference.trim() || 'Manual analyst entry',
        verification: 'Unverified',
        origin: 'Manual',
        review_status: 'Unreviewed',
        confidence: Number(form.confidence) || 0
      });
      await logEvent({
        event_type: 'relationship', action: 'Relationship created', resource_type: 'RelationshipRecord',
        details: `${entityMap[form.source]?.display_label} → ${entityMap[form.target]?.display_label}`
      });
      toast({ title: 'Relationship recorded', description: 'Saved as unverified until an analyst reviews it.' });
      setDialogOpen(false);
      setForm({ source: '', target: '', type: RELATIONSHIP_TYPES[0], description: '', reference: '', confidence: 60 });
      load();
    } catch (err) {
      setError(err?.message || 'The relationship could not be saved.');
    }
  };

  const review = async (record, status) => {
    await base44.entities.RelationshipRecord.update(record.id, { review_status: status, verification: status === 'Verified Sample Record' ? 'Confirmed' : record.verification });
    await base44.entities.AnalystNote.create({
      investigation_id: caseId,
      content: `Review decision for ${record.source_label} → ${record.target_label}: ${status}.`,
      note_type: 'Review decision',
      author_name: 'Analyst'
    });
    await logEvent({ event_type: 'relationship', action: `Relationship marked ${status}`, resource_type: 'RelationshipRecord', resource_id: record.id });
    toast({ title: 'Review recorded', description: status });
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 5 · relationship analysis"
        title="Relationship workspace"
        description="Inspect how two entities are connected, follow the recorded path between them, and separate confirmed links from unverified or suggested ones."
        actions={<Button onClick={() => setDialogOpen(true)} disabled={!caseId}><Plus className="mr-1.5 h-4 w-4" />Add relationship</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" />
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search relationships by entity, type or source" className="pl-8" aria-label="Search relationships" />
        </div>
        <Select value={verification} onValueChange={setVerification}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by verification"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any verification</SelectItem>
            {VERIFICATION_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Connection path finder" subtitle="Shortest chain of recorded links" bodyClassName="space-y-2.5">
          <div className="grid gap-1.5">
            <Label>Start entity</Label>
            <Select value={startId} onValueChange={setStartId}>
              <SelectTrigger aria-label="Start entity"><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>End entity</Label>
            <Select value={endId} onValueChange={setEndId}>
              <SelectTrigger aria-label="End entity"><SelectValue placeholder="Select entity" /></SelectTrigger>
              <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Maximum hops</Label>
            <Select value={maxDepth} onValueChange={setMaxDepth}>
              <SelectTrigger aria-label="Maximum hops"><SelectValue /></SelectTrigger>
              <SelectContent>{['2', '3', '4', '5'].map((d) => <SelectItem key={d} value={d}>{d} hops</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={runPath}><Route className="mr-1.5 h-4 w-4" />Find recorded path</Button>

          {pathResult?.empty && <p className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-2 text-[11px] text-muted-foreground">No chain of recorded links connects these entities within {maxDepth} hops. Absence of a path does not mean absence of a relationship.</p>}
          {pathResult && !pathResult.empty && (
            <div className="space-y-1.5 rounded-md border border-border/60 bg-muted/20 p-2.5">
              <p className="ig-label">{pathResult.nodeIds.length - 1} hop(s) recorded</p>
              <ol className="space-y-1">
                {pathResult.nodeIds.map((id, i) => (
                  <li key={id} className="flex items-center gap-1.5 text-[11px]">
                    <span className="ig-mono text-[9px] text-muted-foreground">{i + 1}</span>
                    <span className="truncate">{entityMap[id]?.display_label || id}</span>
                    {i < pathResult.nodeIds.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  </li>
                ))}
              </ol>
              <ul className="mt-1 space-y-1 border-t border-border/50 pt-1.5">
                {pathResult.edges.map((e) => (
                  <li key={e.id} className="text-[10px] text-muted-foreground">
                    {e.record.source_label} → {e.record.target_label} · {e.record.relationship_type} ({e.record.verification}) · {e.record.source_reference}
                  </li>
                ))}
              </ul>
              {pathResult.edges.some((e) => e.record.verification !== 'Confirmed') && (
                <p className="text-[10px] text-[hsl(44_92%_72%)]">This chain includes unverified or suggested links — treat it as a research lead, not an established connection.</p>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Relationship records" subtitle={`${filtered.length} shown of ${rels?.length || 0}`} className="lg:col-span-2">
          {!rels && <Loading label="Loading relationships…" />}
          {rels && !filtered.length && <EmptyState icon={GitBranch} title="No relationships match" description="Adjust the filters or add a relationship manually." />}
          {filtered.length > 0 && (
            <div className="ig-scroll -mx-4 overflow-x-auto px-4">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    <th className="pb-2 font-medium">Link</th>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Source reference</th>
                    <th className="pb-2 font-medium">Verification</th>
                    <th className="pb-2 font-medium">Review</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/20">
                      <td className="py-2 pr-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <Link to={`/entities/${r.source_entity_id}`} className="hover:text-primary">{r.source_label}</Link>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <Link to={`/entities/${r.target_entity_id}`} className="hover:text-primary">{r.target_label}</Link>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{r.origin || 'Imported'} · {r.confidence ?? 0}% confidence</p>
                      </td>
                      <td className="py-2 pr-3 text-[11px] text-muted-foreground">{r.relationship_type}</td>
                      <td className="max-w-[160px] py-2 pr-3 text-[10px] text-muted-foreground">{r.source_reference || '—'}</td>
                      <td className="py-2 pr-3"><StatusPill value={r.verification} /></td>
                      <td className="py-2 pr-3">
                        <Select value={r.review_status || 'Unreviewed'} onValueChange={(v) => review(r, v)}>
                          <SelectTrigger className="h-7 w-[150px] text-[10px]" aria-label={`Review ${r.source_label} to ${r.target_label}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 text-right text-[10px] text-muted-foreground">{fmtDateTime(r.updated_date || r.created_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Add a relationship record</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Source entity</Label>
                <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                  <SelectTrigger aria-label="Source entity"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Target entity</Label>
                <Select value={form.target} onValueChange={(v) => setForm((p) => ({ ...p, target: v }))}>
                  <SelectTrigger aria-label="Target entity"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{entities.map((e) => <SelectItem key={e.id} value={e.id}>{e.display_label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Relationship type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger aria-label="Relationship type"><SelectValue /></SelectTrigger>
                <SelectContent>{RELATIONSHIP_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rel-description">Description</Label>
              <Textarea id="rel-description" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What the synthetic record shows" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="rel-ref">Source reference</Label>
                <Input id="rel-ref" value={form.reference} onChange={(e) => setForm((p) => ({ ...p, reference: e.target.value }))} placeholder="Manual analyst entry" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rel-confidence">Confidence (0–100)</Label>
                <Input id="rel-confidence" type="number" min="0" max="100" value={form.confidence} onChange={(e) => setForm((p) => ({ ...p, confidence: e.target.value }))} />
              </div>
            </div>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveRelationship}>Save relationship</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}