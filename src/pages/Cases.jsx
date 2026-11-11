import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, Plus, Search, Pencil, Archive, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFormDialog from '@/components/shared/CaseFormDialog';
import DeleteRecordButton from '@/components/shared/DeleteRecordButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { CASE_STATUSES, toList, fmtDate } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function Cases() {
  const { toast } = useToast();
  const [cases, setCases] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      setCases(toList(await base44.entities.Investigation.list('-created_date', 200)));
      setError('');
    } catch (err) {
      setError(err?.message || 'Cases could not be loaded.');
      setCases([]);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!cases) return [];
    return cases.filter((c) => {
      const q = search.trim().toLowerCase();
      const matchesText = !q || `${c.case_code} ${c.title} ${c.summary || ''}`.toLowerCase().includes(q);
      const matchesStatus = status === 'all' || c.status === status;
      const opened = c.opened_date ? new Date(c.opened_date) : null;
      const matchesFrom = !from || (opened && opened >= new Date(from));
      const matchesTo = !to || (opened && opened <= new Date(to));
      return matchesText && matchesStatus && matchesFrom && matchesTo;
    });
  }, [cases, search, status, from, to]);

  const archive = async (record) => {
    try {
      await base44.entities.Investigation.update(record.id, { status: 'Archived' });
      await logEvent({ event_type: 'case', action: 'Case archived', resource_type: 'Investigation', resource_id: record.id, details: record.case_code });
      toast({ title: 'Case archived', description: `${record.case_code} is now archived.` });
      load();
    } catch (err) {
      toast({ title: 'Could not archive case', description: err?.message, variant: 'destructive' });
    }
  };

  const remove = async (record) => {
    try {
      await base44.functions.invoke('deleteRecord', { type: 'case', id: record.id });
      toast({ title: 'Case removed', description: `${record.case_code} and its records were deleted.` });
      load();
    } catch (err) {
      toast({
        title: 'Could not remove case',
        description: err?.response?.data?.error || err?.message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Case workspace"
        title="Demonstration cases"
        description="Create, assign, review and archive synthetic cases. Each case groups its own entities, relationships, documents and reports."
        actions={<Button onClick={() => { setEditing(null); setDialogOpen(true); }}><Plus className="mr-1.5 h-4 w-4" />New case</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cases by reference, title or summary" className="pl-8" aria-label="Search cases" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[170px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" aria-label="Opened after" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" aria-label="Opened before" />
      </div>

      {error && <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {!cases && <div className="ig-panel"><Loading label="Loading cases…" /></div>}

      {cases && !filtered.length && (
        <div className="ig-panel">
          <EmptyState
            icon={FolderKanban}
            title={cases.length ? 'No cases match these filters' : 'No cases yet'}
            description={cases.length ? 'Adjust the search or date filters.' : 'Create your first demonstration case, or load the synthetic dataset from Settings.'}
            action={<Button onClick={() => { setEditing(null); setDialogOpen(true); }} variant="outline"><Plus className="mr-1.5 h-4 w-4" />New case</Button>}
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((c) => (
          <Panel key={c.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="ig-mono text-[11px] text-primary">{c.case_code}</p>
                <Link to={`/cases/${c.id}`} className="mt-0.5 block truncate text-sm font-semibold hover:text-primary">{c.title}</Link>
              </div>
              <StatusPill value={c.status} />
            </div>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{c.summary || 'No summary recorded.'}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
              <span>Opened {fmtDate(c.opened_date)}</span>
              <span>·</span>
              <span>{c.priority || 'Low'} priority</span>
              <span>·</span>
              <span>{(c.analyst_emails || []).length} assigned</span>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-2.5">
              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs"><Link to={`/cases/${c.id}`}>Open<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditing(c); setDialogOpen(true); }}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
              {c.status !== 'Archived' && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => archive(c)}><Archive className="mr-1 h-3 w-3" />Archive</Button>
              )}
              {(c.status === 'Completed' || c.status === 'Archived') && (
                <DeleteRecordButton
                  className="ml-auto"
                  label={`Remove case ${c.case_code}`}
                  title={`Remove ${c.case_code}?`}
                  description={`The case and every record filed under it — entities, relationships, timeline events, documents, evidence and reports — will be deleted. This cannot be undone.`}
                  onConfirm={() => remove(c)}
                />
              )}
            </div>
          </Panel>
        ))}
      </div>

      <CaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} caseRecord={editing} onSaved={load} />
    </div>
  );
}