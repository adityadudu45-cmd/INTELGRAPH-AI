import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, GitBranch, Pencil, Network, FileText, Clock, Boxes, ShieldCheck,
  NotebookPen, Send, Archive
} from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatCard from '@/components/shared/StatCard';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFormDialog from '@/components/shared/CaseFormDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { toList, fmtDate, fmtDateTime, DISCLAIMER } from '@/lib/constants';
import { logEvent } from '@/lib/audit';

const TABS = ['Overview', 'Entities', 'Relationships', 'Timeline', 'Documents', 'Evidence', 'Reports', 'Notes'];

export default function CaseDetail() {
  const { caseId } = useParams();
  const { toast } = useToast();
  const [record, setRecord] = useState(null);
  const [related, setRelated] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [noteType, setNoteType] = useState('General note');
  const [savingNote, setSavingNote] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const cases = toList(await base44.entities.Investigation.filter({ id: caseId }));
      if (!cases.length) { setRecord(null); setRelated({ missing: true }); return; }
      setRecord(cases[0]);
      const [entities, relationships, events, documents, evidence, reports, notes] = await Promise.all([
        base44.entities.EntityRecord.filter({ investigation_id: caseId }, { sort: 'display_label', limit: 500 }),
        base44.entities.RelationshipRecord.filter({ investigation_id: caseId }, { limit: 500 }),
        base44.entities.TimelineEvent.filter({ investigation_id: caseId }, { sort: 'event_time', limit: 500 }),
        base44.entities.DocumentRecord.filter({ investigation_id: caseId }, { limit: 100 }),
        base44.entities.EvidenceRecord.filter({ investigation_id: caseId }, { limit: 200 }),
        base44.entities.AnalysisReport.filter({ investigation_id: caseId }, { sort: '-created_date', limit: 100 }),
        base44.entities.AnalystNote.filter({ investigation_id: caseId }, { sort: '-created_date', limit: 100 })
      ]);
      setRelated({
        entities: toList(entities), relationships: toList(relationships), events: toList(events),
        documents: toList(documents), evidence: toList(evidence), reports: toList(reports), notes: toList(notes)
      });
    } catch (err) {
      setError(err?.message || 'This case could not be loaded.');
    }
  };

  useEffect(() => { load(); }, [caseId]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await base44.entities.AnalystNote.create({ investigation_id: caseId, content: note.trim(), note_type: noteType, author_name: 'Analyst' });
      await logEvent({ event_type: 'case', action: 'Analyst note added', resource_type: 'Investigation', resource_id: caseId, details: noteType });
      setNote('');
      toast({ title: 'Note recorded' });
      load();
    } catch (err) {
      toast({ title: 'Note could not be saved', description: err?.message, variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  const archive = async () => {
    await base44.entities.Investigation.update(caseId, { status: 'Archived' });
    await logEvent({ event_type: 'case', action: 'Case archived', resource_type: 'Investigation', resource_id: caseId, details: record?.case_code });
    toast({ title: 'Case archived' });
    load();
  };

  if (related?.missing) {
    return (
      <div className="ig-panel">
        <EmptyState icon={Boxes} title="Case not found" description="This demonstration case does not exist or has been removed." action={<Button asChild variant="outline"><Link to="/cases">Back to cases</Link></Button>} />
      </div>
    );
  }

  if (!record || !related) return <div className="ig-panel"><Loading label="Loading case record…" /></div>;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground"><Link to="/cases"><ArrowLeft className="mr-1 h-3.5 w-3.5" />All cases</Link></Button>

      <PageHeader
        eyebrow={record.case_code}
        title={record.title}
        description={record.summary || 'No summary recorded for this demonstration case.'}
        actions={
          <>
            <StatusPill value={record.status} />
            <StatusPill value={record.priority || 'Low'} />
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit</Button>
            <Button asChild size="sm" variant="outline"><Link to={`/graph?case=${caseId}`}><Network className="mr-1.5 h-3.5 w-3.5" />Graph</Link></Button>
            {record.status !== 'Archived' && <Button size="sm" variant="ghost" onClick={archive}><Archive className="mr-1.5 h-3.5 w-3.5" />Archive</Button>}
          </>
        }
      />

      {error && <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entities" value={related.entities.length} icon={Boxes} tone="primary" />
        <StatCard label="Relationships" value={related.relationships.length} icon={GitBranch} tone="accent" />
        <StatCard label="Timeline events" value={related.events.length} icon={Clock} tone="amber" />
        <StatCard label="Documents" value={related.documents.length} icon={FileText} tone="violet" />
      </div>

      <div className="ig-scroll mt-4 flex gap-1 overflow-x-auto border-b border-border/60 pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-t-md px-3 py-2 text-xs transition-colors ${tab === t ? 'border-b-2 border-primary text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {tab === 'Overview' && (
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Case record" className="lg:col-span-2" bodyClassName="space-y-3">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Meta label="Case reference" value={record.case_code} mono />
                <Meta label="Opened" value={fmtDate(record.opened_date)} />
                <Meta label="Status" value={record.status} />
                <Meta label="Priority" value={record.priority || 'Low'} />
                <Meta label="Assigned analysts" value={(record.analyst_emails || []).join(', ') || 'None assigned'} />
                <Meta label="Tags" value={(record.tags || []).join(', ') || '—'} />
              </dl>
              <p className="rounded-md border border-border/60 bg-muted/30 p-3 text-[11px] leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
            </Panel>
            <Panel title="Workflow status" bodyClassName="space-y-2.5">
              <Row icon={Boxes} label="Entities recorded" value={related.entities.length} />
              <Row icon={GitBranch} label="Relationships recorded" value={related.relationships.length} />
              <Row icon={Clock} label="Events on timeline" value={related.events.length} />
              <Row icon={ShieldCheck} label="Evidence items" value={related.evidence.length} />
              <Row icon={FileText} label="Reports generated" value={related.reports.length} />
              <Row icon={NotebookPen} label="Analyst notes" value={related.notes.length} />
            </Panel>
          </div>
        )}

        {tab === 'Entities' && (
          <Panel title="Entities in this case" subtitle={`${related.entities.length} synthetic records`}>
            {related.entities.length ? (
              <ul className="divide-y divide-border/50">
                {related.entities.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link to={`/entities/${e.id}`} className="text-sm hover:text-primary">{e.display_label}</Link>
                      <p className="ig-mono text-[10px] text-muted-foreground">{e.identifier || 'no identifier'} · {e.category}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{e.confidence ?? 0}% conf.</span>
                      <StatusPill value={e.review_status} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={Boxes} title="No entities recorded" description="Import a synthetic sample or add entities manually." />}
          </Panel>
        )}

        {tab === 'Relationships' && (
          <Panel title="Recorded relationships" subtitle="Every link is a stored record with its own source reference">
            {related.relationships.length ? (
              <div className="ig-scroll -mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="pb-2 font-medium">Source</th>
                      <th className="pb-2 font-medium">Target</th>
                      <th className="pb-2 font-medium">Type</th>
                      <th className="pb-2 font-medium">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {related.relationships.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2 pr-3">{r.source_label}</td>
                        <td className="py-2 pr-3">{r.target_label}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{r.relationship_type}</td>
                        <td className="py-2"><StatusPill value={r.verification} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon={GitBranch} title="No relationships recorded" />}
          </Panel>
        )}

        {tab === 'Timeline' && (
          <Panel title="Chronological events" subtitle="Events without a timestamp are listed at the end as unknown">
            {related.events.length ? (
              <ol className="relative space-y-3 border-l border-border/70 pl-4">
                {[...related.events].sort((a, b) => new Date(a.event_time || '9999') - new Date(b.event_time || '9999')).map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                    <p className="text-xs font-medium">{e.title}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtDateTime(e.event_time)} · {e.event_category}</p>
                    {e.description && <p className="mt-0.5 text-[11px] text-muted-foreground">{e.description}</p>}
                  </li>
                ))}
              </ol>
            ) : <EmptyState icon={Clock} title="No timeline events" />}
          </Panel>
        )}

        {tab === 'Documents' && (
          <Panel title="Case documents" subtitle="Uploaded samples and their processing state" action={<Button asChild size="sm" variant="outline"><Link to="/documents">Open document intelligence</Link></Button>}>
            {related.documents.length ? (
              <ul className="divide-y divide-border/50">
                {related.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs">{d.title}</p>
                      <p className="text-[10px] text-muted-foreground">{d.category} · {d.page_count || 1} page(s)</p>
                    </div>
                    <StatusPill value={d.processing_status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={FileText} title="No documents linked" description="Upload a synthetic sample in Document Intelligence." />}
          </Panel>
        )}

        {tab === 'Evidence' && (
          <Panel title="Evidence register" action={<Button asChild size="sm" variant="outline"><Link to={`/evidence?case=${caseId}`}>Manage evidence</Link></Button>}>
            {related.evidence.length ? (
              <ul className="divide-y divide-border/50">
                {related.evidence.map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs">{e.title}</p>
                      <p className="ig-mono text-[10px] text-muted-foreground">{e.evidence_code || '—'}</p>
                    </div>
                    <StatusPill value={e.verification_status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={ShieldCheck} title="No evidence registered" />}
          </Panel>
        )}

        {tab === 'Reports' && (
          <Panel title="Reports for this case" action={<Button asChild size="sm" variant="outline"><Link to={`/reports?case=${caseId}`}>Open reports</Link></Button>}>
            {related.reports.length ? (
              <ul className="divide-y divide-border/50">
                {related.reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-xs">{r.title}</p>
                      <p className="text-[10px] text-muted-foreground">Version {r.version || 1} · {fmtDateTime(r.created_date)}</p>
                    </div>
                    <StatusPill value={r.status} />
                  </li>
                ))}
              </ul>
            ) : <EmptyState icon={FileText} title="No reports generated" />}
          </Panel>
        )}

        {tab === 'Notes' && (
          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Add analyst note" className="lg:col-span-1" bodyClassName="space-y-2">
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger aria-label="Note type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General note', 'Review decision', 'Conclusion'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Record a review decision or observation. Notes are attributed to your account." />
              <Button size="sm" onClick={addNote} disabled={savingNote || !note.trim()} className="w-full">
                <Send className="mr-1.5 h-3.5 w-3.5" />{savingNote ? 'Saving…' : 'Record note'}
              </Button>
            </Panel>
            <Panel title="Case notes" className="lg:col-span-2">
              {related.notes.length ? (
                <ul className="space-y-3">
                  {related.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill value={n.note_type} />
                        <span className="text-[10px] text-muted-foreground">{fmtDateTime(n.created_date)}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed">{n.content}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{n.author_name || n.created_by || 'Analyst'}</p>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon={NotebookPen} title="No notes yet" description="Document review decisions here so reasoning stays auditable." />}
            </Panel>
          </div>
        )}
      </div>

      <CaseFormDialog open={editing} onOpenChange={setEditing} caseRecord={record} onSaved={load} />
    </div>
  );
}

function Meta({ label, value, mono }) {
  return (
    <div>
      <dt className="ig-label">{label}</dt>
      <dd className={`mt-1 text-xs ${mono ? 'ig-mono' : ''}`}>{value}</dd>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5" />{label}</span>
      <span className="font-heading text-sm tabular-nums">{value}</span>
    </div>
  );
}