import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, GitBranch, Clock, ShieldCheck, Pencil, Send } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import EntityFormDialog from '@/components/shared/EntityFormDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { toList, fmtDateTime } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function EntityDetail() {
  const { entityId } = useParams();
  const { toast } = useToast();
  const [entity, setEntity] = useState(null);
  const [state, setState] = useState(null);
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const found = toList(await base44.entities.EntityRecord.filter({ id: entityId }));
    if (!found.length) { setEntity(null); setState({ missing: true }); return; }
    const record = found[0];
    setEntity(record);
    const [relationships, events, evidence, notes, cases] = await Promise.all([
      base44.entities.RelationshipRecord.filter({ investigation_id: record.investigation_id }, { limit: 500 }),
      base44.entities.TimelineEvent.filter({ investigation_id: record.investigation_id }, { sort: 'event_time', limit: 500 }),
      base44.entities.EvidenceRecord.filter({ investigation_id: record.investigation_id }, { limit: 200 }),
      base44.entities.AnalystNote.filter({ related_entity_id: entityId }, { sort: '-created_date', limit: 50 }),
      base44.entities.Investigation.filter({ id: record.investigation_id })
    ]);
    setState({
      relationships: toList(relationships).filter((r) => r.source_entity_id === entityId || r.target_entity_id === entityId),
      events: toList(events).filter((e) => (e.entity_ids || []).includes(entityId)),
      evidence: toList(evidence).filter((e) => (e.entity_ids || []).includes(entityId)),
      notes: toList(notes),
      caseRecord: toList(cases)[0] || null
    });
  };

  useEffect(() => { load(); }, [entityId]);

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await base44.entities.AnalystNote.create({
        investigation_id: entity.investigation_id,
        related_entity_id: entityId,
        content: note.trim(),
        note_type: 'General note',
        author_name: 'Analyst'
      });
      await logEvent({ event_type: 'entity', action: 'Entity note added', resource_type: 'EntityRecord', resource_id: entityId, details: entity.display_label });
      setNote('');
      toast({ title: 'Note attached to entity' });
      load();
    } catch (err) {
      toast({ title: 'Note could not be saved', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (state?.missing) {
    return (
      <div className="ig-panel">
        <EmptyState icon={Boxes} title="Entity not found" description="This record does not exist or has been removed." action={<Button asChild variant="outline"><Link to="/entities">Back to entities</Link></Button>} />
      </div>
    );
  }

  if (!entity || !state) return <div className="ig-panel"><Loading label="Loading entity profile…" /></div>;

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground">
        <Link to={`/entities${entity.investigation_id ? '' : ''}`}><ArrowLeft className="mr-1 h-3.5 w-3.5" />All entities</Link>
      </Button>

      <PageHeader
        eyebrow={state.caseRecord ? `${state.caseRecord.case_code} · ${entity.category}` : entity.category}
        title={entity.display_label}
        description={entity.description || 'No description recorded for this synthetic entity.'}
        actions={
          <>
            <StatusPill value={entity.review_status} />
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Edit record</Button>
            {state.caseRecord && <Button asChild size="sm" variant="outline"><Link to={`/graph?case=${entity.investigation_id}&node=${entity.id}`}>Show in graph</Link></Button>}
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Record details" bodyClassName="space-y-2.5">
          <Detail label="Category" value={entity.category} />
          <Detail label="Identifier" value={entity.identifier || '—'} mono />
          <Detail label="Confidence" value={`${entity.confidence ?? 0}%`} />
          <Detail label="Source reference" value={entity.source_reference || '—'} />
          <Detail label="Aliases" value={(entity.aliases || []).join(', ') || '—'} />
          <Detail label="Linked case" value={state.caseRecord ? `${state.caseRecord.case_code} · ${state.caseRecord.title}` : '—'} />
          <Detail label="Created" value={fmtDateTime(entity.created_date)} />
          <Detail label="Last updated" value={fmtDateTime(entity.updated_date)} />
        </Panel>

        <Panel title="Direct relationships" subtitle={`${state.relationships.length} recorded link(s)`} className="lg:col-span-2">
          {state.relationships.length ? (
            <ul className="divide-y divide-border/50">
              {state.relationships.map((r) => {
                const otherId = r.source_entity_id === entityId ? r.target_entity_id : r.source_entity_id;
                const otherLabel = r.source_entity_id === entityId ? r.target_label : r.source_label;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link to={`/entities/${otherId}`} className="text-xs hover:text-primary">{otherLabel}</Link>
                      <p className="text-[10px] text-muted-foreground">{r.relationship_type}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="ig-mono text-[10px] text-muted-foreground">{r.confidence ?? 0}%</span>
                      <StatusPill value={r.verification} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : <EmptyState icon={GitBranch} title="No relationships recorded" description="Link this entity to another record in the Relationships module." />}
        </Panel>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <Panel title="Timeline appearances" subtitle="Events naming this entity">
          {state.events.length ? (
            <ol className="space-y-2 border-l border-border/70 pl-3">
              {state.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                  <p className="text-[11px]">{e.title}</p>
                  <p className="text-[10px] text-muted-foreground">{fmtDateTime(e.event_time)}</p>
                </li>
              ))}
            </ol>
          ) : <EmptyState icon={Clock} title="No timeline events" />}
        </Panel>

        <Panel title="Supporting evidence" subtitle="Evidence items naming this entity">
          {state.evidence.length ? (
            <ul className="space-y-2">
              {state.evidence.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                  <span className="min-w-0 truncate text-[11px]">{e.title}</span>
                  <StatusPill value={e.verification_status} />
                </li>
              ))}
            </ul>
          ) : <EmptyState icon={ShieldCheck} title="No evidence linked" />}
        </Panel>

        <Panel title="Entity notes">
          <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a review note for this entity" />
          <Button size="sm" className="mt-2 w-full" onClick={addNote} disabled={saving || !note.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" />{saving ? 'Saving…' : 'Record note'}
          </Button>
          {state.notes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {state.notes.map((n) => (
                <li key={n.id} className="rounded-md border border-border/60 bg-muted/20 p-2 text-[11px]">
                  <p className="whitespace-pre-wrap leading-relaxed">{n.content}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(n.created_date)}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <EntityFormDialog open={editing} onOpenChange={setEditing} entity={entity} investigationId={entity.investigation_id} onSaved={load} />
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="ig-label pt-0.5">{label}</span>
      <span className={`max-w-[62%] break-words text-right text-[11px] ${mono ? 'ig-mono' : ''}`}>{value}</span>
    </div>
  );
}