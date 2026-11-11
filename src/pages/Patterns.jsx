import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ScanLine, ShieldQuestion } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { toList, fmtDateTime } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

const REVIEW = ['Unreviewed', 'Acknowledged', 'Dismissed'];

export default function Patterns() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [observations, setObservations] = useState(null);
  const [reviewFilter, setReviewFilter] = useState('all');
  const [source, setSource] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 100).then((r) => {
      const list = toList(r);
      setCases(list);
      if (list.length) setCaseId((prev) => prev || list[0].id);
    });
  }, []);

  const load = async () => {
    if (!caseId) return;
    setObservations(null);
    const [patterns, entityPage, relPage, eventPage, docPage] = await Promise.all([
      base44.entities.PatternObservation.filter({ investigation_id: caseId }, { sort: '-created_date', limit: 200 }),
      base44.entities.EntityRecord.filter({ investigation_id: caseId }, { limit: 500 }),
      base44.entities.RelationshipRecord.filter({ investigation_id: caseId }, { limit: 800 }),
      base44.entities.TimelineEvent.filter({ investigation_id: caseId }, { limit: 500 }),
      base44.entities.DocumentRecord.filter({ investigation_id: caseId }, { limit: 100 })
    ]);
    setObservations(toList(patterns));
    setSource({ entities: toList(entityPage), relationships: toList(relPage), events: toList(eventPage), documents: toList(docPage) });
  };

  useEffect(() => { load(); }, [caseId]);

  const candidates = useMemo(() => {
    if (!source) return [];
    const { entities, relationships, events, documents } = source;
    const out = [];

    // Detector 1 — identifiers referenced in multiple events
    entities
      .filter((e) => ['Transaction Identifier', 'Phone Identifier'].includes(e.category))
      .forEach((entity) => {
        const linked = events.filter((e) => (e.entity_ids || []).includes(entity.id));
        if (linked.length >= 2) {
          out.push({
            title: `Repeated references to ${entity.display_label}`,
            dataset: 'Simulated timeline events',
            detection_method: 'Frequency count of identifier appearances across stored timeline events',
            explanation: `${entity.display_label} appears in ${linked.length} recorded events. Repetition of an identifier is a common feature of synthetic datasets and may simply reflect how the sample was generated.`,
            confidence: linked.length >= 3 ? 'Medium' : 'Low',
            confidence_note: `Based on ${linked.length} synthetic events.`,
            limitations: 'Counts only what is stored; no meaning, intent or guilt is implied.',
            supporting_record_ids: linked.map((e) => e.id)
          });
        }
      });

    // Detector 2 — entity pairs co-occurring in more than one event
    const pairCounts = new Map();
    events.forEach((event) => {
      const ids = [...new Set(event.entity_ids || [])].sort();
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = i + 1; j < ids.length; j += 1) {
          const key = `${ids[i]}|${ids[j]}`;
          if (!pairCounts.has(key)) pairCounts.set(key, []);
          pairCounts.get(key).push(event.id);
        }
      }
    });
    pairCounts.forEach((eventIds, key) => {
      if (eventIds.length < 2) return;
      const [a, b] = key.split('|');
      const labelA = entities.find((e) => e.id === a)?.display_label || a;
      const labelB = entities.find((e) => e.id === b)?.display_label || b;
      out.push({
        title: `Recurring co-occurrence: ${labelA} and ${labelB}`,
        dataset: 'Simulated timeline events',
        detection_method: 'Pairwise co-occurrence across stored events with shared entity references',
        explanation: `${labelA} and ${labelB} are named in the same ${eventIds.length} recorded events. Co-occurrence records documentation overlap, not association or communication.`,
        confidence: 'Low',
        confidence_note: `${eventIds.length} shared events in a synthetic sample.`,
        limitations: 'Small samples produce coincidental co-occurrence; verify against the source documents before drawing any conclusion.',
        supporting_record_ids: eventIds
      });
    });

    // Detector 3 — events with no recorded timestamp
    const untimed = events.filter((e) => !e.event_time);
    if (untimed.length) {
      out.push({
        title: 'Events recorded without a timestamp',
        dataset: 'Simulated timeline events',
        detection_method: 'Null/blank timestamp check across stored events',
        explanation: `${untimed.length} recorded event(s) have no timestamp. The timeline shows them as uncertain rather than inventing a time.`,
        confidence: 'High',
        confidence_note: 'Directly verifiable against the stored records.',
        limitations: 'A data-quality observation only — it says nothing about the underlying event.',
        supporting_record_ids: untimed.map((e) => e.id)
      });
    }

    // Detector 4 — structurally dominant node
    if (entities.length > 2 && relationships.length) {
      const degree = new Map(entities.map((e) => [e.id, 0]));
      relationships.forEach((r) => {
        degree.set(r.source_entity_id, (degree.get(r.source_entity_id) || 0) + 1);
        degree.set(r.target_entity_id, (degree.get(r.target_entity_id) || 0) + 1);
      });
      const values = [...degree.values()];
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      const sd = Math.sqrt(variance);
      const top = [...degree.entries()].sort((a, b) => b[1] - a[1])[0];
      if (top && sd > 0 && top[1] > mean + sd) {
        const entity = entities.find((e) => e.id === top[0]);
        out.push({
          title: `Structurally dominant node: ${entity?.display_label || top[0]}`,
          dataset: 'Recorded relationships',
          detection_method: 'Degree compared against the sample mean plus one standard deviation',
          explanation: `${entity?.display_label || top[0]} has ${top[1]} recorded links, above the sample mean of ${mean.toFixed(1)}. This reflects how thoroughly the record was documented, not behaviour.`,
          confidence: 'Medium',
          confidence_note: 'Entirely dependent on which synthetic links were supplied.',
          limitations: 'Centrality does not indicate influence, risk or involvement of any kind.',
          supporting_record_ids: relationships.filter((r) => r.source_entity_id === top[0] || r.target_entity_id === top[0]).map((r) => r.id)
        });
      }
    }

    // Detector 5 — concentration of unverified links
    entities.forEach((entity) => {
      const unverified = relationships.filter((r) => (r.source_entity_id === entity.id || r.target_entity_id === entity.id) && r.verification !== 'Confirmed');
      if (unverified.length >= 2) {
        out.push({
          title: `Unverified link concentration around ${entity.display_label}`,
          dataset: 'Recorded relationships',
          detection_method: 'Count of non-confirmed relationships per entity',
          explanation: `${unverified.length} relationships involving ${entity.display_label} remain unconfirmed. This is a review priority flag for the analyst queue.`,
          confidence: 'High',
          confidence_note: 'Counted directly from stored relationship records.',
          limitations: 'Flags missing verification work, not suspicious activity.',
          supporting_record_ids: unverified.map((r) => r.id)
        });
      }
    });

    // Detector 6 — documents awaiting review
    const needsReview = documents.filter((d) => d.processing_status === 'Needs Review');
    if (needsReview.length) {
      out.push({
        title: 'Documents awaiting analyst review',
        dataset: 'Uploaded documents',
        detection_method: 'Processing status scan across stored documents',
        explanation: `${needsReview.length} uploaded document(s) are marked as needing review before their content is relied on.`,
        confidence: 'High',
        confidence_note: 'Directly readable from document records.',
        limitations: 'Workflow status only.',
        supporting_record_ids: needsReview.map((d) => d.id)
      });
    }

    return out;
  }, [source]);

  const runScan = async () => {
    if (!candidates.length) {
      toast({ title: 'No new patterns detected', description: 'The current records produced no rule matches.' });
      return;
    }
    setRunning(true);
    try {
      const existingTitles = new Set((observations || []).map((o) => o.title));
      const fresh = candidates.filter((c) => !existingTitles.has(c.title));
      if (!fresh.length) {
        toast({ title: 'Register already up to date', description: 'Every detected pattern is already recorded.' });
        return;
      }
      await base44.entities.PatternObservation.bulkCreate(fresh.map((c) => ({
        investigation_id: caseId,
        ...c,
        review_status: 'Unreviewed',
        generated_by: 'Rule-based demonstration scan'
      })));
      await logEvent({ event_type: 'ai', action: 'Pattern scan completed', resource_type: 'PatternObservation', resource_id: caseId, details: `${fresh.length} observation(s) stored` });
      toast({ title: 'Scan complete', description: `${fresh.length} observation(s) added to the register.` });
      load();
    } catch (err) {
      toast({ title: 'Scan failed', description: err?.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  const setReview = async (record, status) => {
    await base44.entities.PatternObservation.update(record.id, { review_status: status });
    await logEvent({ event_type: 'ai', action: `Pattern marked ${status}`, resource_type: 'PatternObservation', resource_id: record.id, details: record.title });
    load();
  };

  const filtered = (observations || []).filter((o) => reviewFilter === 'all' || o.review_status === reviewFilter);

  return (
    <div>
      <PageHeader
        eyebrow="Stage 5 · pattern analysis"
        title="Pattern observations"
        description="Rule-based detectors describe what the synthetic records contain. Each observation states its method, confidence, limitations and the exact records behind it."
        actions={<Button onClick={runScan} disabled={!caseId || running || !source}><ScanLine className="mr-1.5 h-4 w-4" />{running ? 'Scanning…' : 'Run detection scan'}</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" />
        <Select value={reviewFilter} onValueChange={setReviewFilter}>
          <SelectTrigger className="w-[180px]" aria-label="Filter by review status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All review states</SelectItem>
            {REVIEW.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        {source && (
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />{candidates.length} pattern(s) detectable in the current records
          </span>
        )}
      </div>

      {!observations && <div className="ig-panel"><Loading label="Loading pattern register…" /></div>}

      {observations && !filtered.length && (
        <div className="ig-panel"><EmptyState icon={ShieldQuestion} title="No pattern observations" description="Run the detection scan to record what the stored records show, with method and limitations attached." action={<Button onClick={runScan} disabled={running}><ScanLine className="mr-1.5 h-4 w-4" />Run detection scan</Button>} /></div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {filtered.map((o) => (
          <Panel
            key={o.id}
            title={o.title}
            subtitle={`${o.detection_method}`}
            action={<StatusPill value={o.confidence || 'Low'} />}
          >
            <p className="text-xs leading-relaxed">{o.explanation}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border/50 bg-muted/20 p-2">
                <div className="ig-label text-[9px]">Confidence note</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{o.confidence_note || '—'}</p>
              </div>
              <div className="rounded-md border border-border/50 bg-muted/20 p-2">
                <div className="ig-label text-[9px]">Limitations</div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{o.limitations || '—'}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] text-muted-foreground">
                {o.dataset} · {(o.supporting_record_ids || []).length} supporting record(s) · {fmtDateTime(o.created_date)}
              </div>
              <div className="flex items-center gap-1.5">
                <StatusPill value={o.review_status} />
                <Select value={o.review_status || 'Unreviewed'} onValueChange={(v) => setReview(o, v)}>
                  <SelectTrigger className="h-7 w-[140px] text-[10px]" aria-label={`Review ${o.title}`}><SelectValue /></SelectTrigger>
                  <SelectContent>{REVIEW.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}