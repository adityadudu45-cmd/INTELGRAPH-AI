import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Plus, Search, Pencil } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import CaseFilter from '@/components/shared/CaseFilter';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { EVIDENCE_STATUSES, toList, fmtDate, fmtDateTime } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

const EMPTY = { evidence_code: '', title: '', description: '', source: '', verification_status: 'Unreviewed', analyst_notes: '', collected_date: '', entity_ids: [] };

export default function Evidence() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [records, setRecords] = useState(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [entities, setEntities] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
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
    setRecords(null);
    const query = { investigation_id: caseId };
    if (status !== 'all') query.verification_status = status;
    const [page, entityPage] = await Promise.all([
      base44.entities.EvidenceRecord.filter(query, { sort: '-created_date', limit: 200 }),
      base44.entities.EntityRecord.filter({ investigation_id: caseId }, { sort: 'display_label', limit: 400 })
    ]);
    setRecords(toList(page));
    setEntities(toList(entityPage));
  };

  useEffect(() => { load(); }, [caseId, status]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, evidence_code: `EVD-${String(Math.floor(Math.random() * 9000) + 1000)}` });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    setForm({
      evidence_code: record.evidence_code || '',
      title: record.title || '',
      description: record.description || '',
      source: record.source || '',
      verification_status: record.verification_status || 'Unreviewed',
      analyst_notes: record.analyst_notes || '',
      collected_date: record.collected_date || '',
      entity_ids: record.entity_ids || []
    });
    setError('');
    setDialogOpen(true);
  };

  const toggleEntity = (id) => {
    setForm((prev) => ({
      ...prev,
      entity_ids: prev.entity_ids.includes(id) ? prev.entity_ids.filter((e) => e !== id) : [...prev.entity_ids, id]
    }));
  };

  const save = async () => {
    if (!form.title.trim()) { setError('A title is required.'); return; }
    const payload = {
      investigation_id: caseId,
      evidence_code: form.evidence_code.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      source: form.source.trim() || 'Synthetic demonstration dataset',
      verification_status: form.verification_status,
      analyst_notes: form.analyst_notes.trim(),
      collected_date: form.collected_date || null,
      entity_ids: form.entity_ids,
      version: editing ? (editing.version || 1) + 1 : 1
    };
    try {
      if (editing) {
        await base44.entities.EvidenceRecord.update(editing.id, payload);
        await logEvent({ event_type: 'evidence', action: 'Evidence updated', resource_type: 'EvidenceRecord', resource_id: editing.id, details: `${payload.evidence_code} · v${payload.version}` });
      } else {
        const created = await base44.entities.EvidenceRecord.create(payload);
        await logEvent({ event_type: 'evidence', action: 'Evidence registered', resource_type: 'EvidenceRecord', resource_id: created.id, details: payload.evidence_code });
      }
      toast({ title: editing ? 'Evidence updated' : 'Evidence registered', description: editing ? `Version ${payload.version} stored.` : 'The item is now in the evidence register.' });
      setDialogOpen(false);
      load();
    } catch (err) {
      setError(err?.message || 'The evidence record could not be saved.');
    }
  };

  const filtered = (records || []).filter((r) => {
    const q = search.trim().toLowerCase();
    return !q || `${r.title} ${r.evidence_code || ''} ${r.description || ''}`.toLowerCase().includes(q);
  });

  const entityMap = Object.fromEntries(entities.map((e) => [e.id, e]));

  return (
    <div>
      <PageHeader
        eyebrow="Stage 6 · evidence management"
        title="Evidence register"
        description="Every evidence item carries a source, a verification state, the entities it names and a version that increments whenever an analyst revises it."
        actions={<Button onClick={openNew} disabled={!caseId}><Plus className="mr-1.5 h-4 w-4" />Register evidence</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" />
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search evidence" className="pl-8" aria-label="Search evidence" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]" aria-label="Filter by verification status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All verification states</SelectItem>
            {EVIDENCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!records && <div className="ig-panel"><Loading label="Loading evidence register…" /></div>}
      {records && !filtered.length && (
        <div className="ig-panel"><EmptyState icon={ShieldCheck} title="No evidence registered" description="Register an evidence item to attach source references and verification state." action={<Button onClick={openNew} variant="outline" disabled={!caseId}><Plus className="mr-1.5 h-4 w-4" />Register evidence</Button>} /></div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {filtered.map((r) => (
          <Panel
            key={r.id}
            title={r.title}
            subtitle={`${r.evidence_code || 'No code'} · v${r.version || 1}`}
            action={<StatusPill value={r.verification_status} />}
          >
            <p className="text-[11px] leading-relaxed">{r.description || 'No description recorded.'}</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
              <div><span className="ig-label text-[9px]">Source</span><p>{r.source || '—'}</p></div>
              <div><span className="ig-label text-[9px]">Collected</span><p>{fmtDate(r.collected_date)}</p></div>
            </div>
            {(r.entity_ids || []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {(r.entity_ids || []).map((id) => (
                  <Link key={id} to={`/entities/${id}`} className="rounded border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-primary">
                    {entityMap[id]?.display_label || 'linked record'}
                  </Link>
                ))}
              </div>
            )}
            {r.analyst_notes && <p className="mt-2 rounded-md border border-border/50 bg-muted/20 p-2 text-[10px] leading-relaxed text-muted-foreground">{r.analyst_notes}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Updated {fmtDateTime(r.updated_date || r.created_date)}</span>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={() => openEdit(r)}><Pencil className="mr-1 h-3 w-3" />Revise</Button>
            </div>
          </Panel>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{editing ? `Revise evidence (v${(editing.version || 1) + 1})` : 'Register evidence'}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ev-code">Evidence code</Label>
                <Input id="ev-code" value={form.evidence_code} onChange={(e) => setForm((p) => ({ ...p, evidence_code: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ev-date">Collected date</Label>
                <Input id="ev-date" type="date" value={form.collected_date} onChange={(e) => setForm((p) => ({ ...p, collected_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-title">Title *</Label>
              <Input id="ev-title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-desc">Description</Label>
              <Textarea id="ev-desc" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ev-source">Source</Label>
                <Input id="ev-source" value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} placeholder="Synthetic demonstration dataset" />
              </div>
              <div className="grid gap-1.5">
                <Label>Verification status</Label>
                <Select value={form.verification_status} onValueChange={(v) => setForm((p) => ({ ...p, verification_status: v }))}>
                  <SelectTrigger aria-label="Verification status"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVIDENCE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Linked entities</Label>
              <div className="ig-scroll max-h-[140px] space-y-1 overflow-y-auto rounded-md border border-border/60 p-2">
                {!entities.length && <p className="text-[11px] text-muted-foreground">No entities in this case yet.</p>}
                {entities.map((e) => (
                  <label key={e.id} className="flex cursor-pointer items-center gap-2 text-[11px]">
                    <Checkbox checked={form.entity_ids.includes(e.id)} onCheckedChange={() => toggleEntity(e.id)} />
                    <span className="truncate">{e.display_label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ev-notes">Analyst notes</Label>
              <Textarea id="ev-notes" rows={2} value={form.analyst_notes} onChange={(e) => setForm((p) => ({ ...p, analyst_notes: e.target.value }))} />
            </div>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save new version' : 'Register evidence'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}