import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Boxes, Plus, Search, Download, Pencil } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import EntityFormDialog from '@/components/shared/EntityFormDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { ENTITY_CATEGORIES, REVIEW_STATUSES, toList, downloadCsv } from '@/lib/constants';

export default function Entities() {
  const [cases, setCases] = useState([]);
  const [records, setRecords] = useState(null);
  const [caseId, setCaseId] = useState('all');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const query = caseId === 'all' ? {} : { investigation_id: caseId };
      if (category !== 'all') query.category = category;
      if (status !== 'all') query.review_status = status;
      const list = toList(await base44.entities.EntityRecord.filter(query, { sort: 'display_label', limit: 500 }));
      setRecords(list);
      setError('');
    } catch (err) {
      setError(err?.message || 'Entity records could not be loaded.');
      setRecords([]);
    }
  };

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 100).then((r) => setCases(toList(r)));
  }, []);

  useEffect(() => { load(); }, [caseId, category, status]);

  const caseMap = useMemo(() => Object.fromEntries(cases.map((c) => [c.id, c])), [cases]);
  const filtered = (records || []).filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || `${r.display_label} ${r.identifier || ''} ${r.description || ''}`.toLowerCase().includes(q);
  });

  const exportCsv = () => {
    downloadCsv(`entities-${Date.now()}.csv`, [
      ['label', 'category', 'identifier', 'case', 'review_status', 'confidence'],
      ...filtered.map((r) => [r.display_label, r.category, r.identifier || '', caseMap[r.investigation_id]?.case_code || '', r.review_status, r.confidence ?? ''])
    ]);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 2 · entity management"
        title="Entity records"
        description="People, organisations, vehicles, locations and identifiers recorded in each synthetic case. Confidence and review status are tracked per record."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-1.5 h-3.5 w-3.5" />Export CSV</Button>
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} disabled={caseId === 'all'}><Plus className="mr-1.5 h-4 w-4" />New entity</Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by label, identifier or description" className="pl-8" aria-label="Search entities" />
        </div>
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {ENTITY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by review status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All review states</SelectItem>
            {REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {caseId === 'all' && <p className="mb-2 text-[11px] text-muted-foreground">Select a specific case to add new entities.</p>}
      {error && <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <Panel title="Entity register" subtitle={`${filtered.length} record(s) shown`}>
        {!records && <Loading label="Loading entity records…" />}
        {records && !filtered.length && <EmptyState icon={Boxes} title="No entities match" description="Adjust the filters, or import a synthetic sample." />}
        {filtered.length > 0 && (
          <div className="ig-scroll -mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[720px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-2 font-medium">Label</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Identifier</th>
                  <th className="pb-2 font-medium">Case</th>
                  <th className="pb-2 font-medium">Confidence</th>
                  <th className="pb-2 font-medium">Review</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/20">
                    <td className="py-2 pr-3"><Link to={`/entities/${r.id}`} className="hover:text-primary">{r.display_label}</Link></td>
                    <td className="py-2 pr-3"><StatusPill value={r.category} /></td>
                    <td className="py-2 pr-3 ig-mono text-[10px] text-muted-foreground">{r.identifier || '—'}</td>
                    <td className="py-2 pr-3">
                      {caseMap[r.investigation_id] ? (
                        <Link to={`/cases/${r.investigation_id}`} className="ig-mono text-[10px] text-accent hover:underline">{caseMap[r.investigation_id].case_code}</Link>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-muted-foreground">{r.confidence ?? 0}%</td>
                    <td className="py-2 pr-3"><StatusPill value={r.review_status} /></td>
                    <td className="py-2 text-right">
                      <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => { setEditing(r); setDialogOpen(true); }} aria-label={`Edit ${r.display_label}`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <EntityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={editing}
        investigationId={caseId === 'all' ? editing?.investigation_id : caseId}
        onSaved={load}
      />
    </div>
  );
}