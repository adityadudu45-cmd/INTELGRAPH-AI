import { useEffect, useMemo, useState } from 'react';
import { Clock, Plus, Search, CalendarClock, AlertTriangle } from 'lucide-react';
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
import { EVENT_CATEGORIES, TIMESTAMP_CONFIDENCE, toList, fmtDateTime } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function Timeline() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [compareId, setCompareId] = useState('');
  const [events, setEvents] = useState(null);
  const [compareEvents, setCompareEvents] = useState([]);
  const [category, setCategory] = useState('all');
  const [confidence, setConfidence] = useState('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', event_time: '', timestamp_confidence: 'Exact', event_category: 'Observation', description: '' });

  useEffect(() => {
    base44.entities.Investigation.list('-created_date', 100).then((r) => {
      const list = toList(r);
      setCases(list);
      if (list.length) setCaseId((prev) => prev || list[0].id);
    });
  }, []);

  const load = async () => {
    if (!caseId) return;
    setEvents(null);
    const page = await base44.entities.TimelineEvent.filter({ investigation_id: caseId }, { limit: 500 });
    setEvents(toList(page));
    if (compareId && compareId !== caseId) {
      const other = await base44.entities.TimelineEvent.filter({ investigation_id: compareId }, { limit: 500 });
      setCompareEvents(toList(other));
    } else {
      setCompareEvents([]);
    }
  };

  useEffect(() => { load(); }, [caseId, compareId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (events || [])
      .filter((e) => category === 'all' || e.event_category === category)
      .filter((e) => confidence === 'all' || e.timestamp_confidence === confidence)
      .filter((e) => !q || `${e.title} ${e.description || ''}`.toLowerCase().includes(q));
  }, [events, category, confidence, search]);

  const timed = filtered
    .filter((e) => e.event_time && e.timestamp_confidence !== 'Unknown')
    .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
  const untimed = filtered.filter((e) => !e.event_time || e.timestamp_confidence === 'Unknown');

  const grouped = timed.reduce((acc, event) => {
    const key = new Date(event.event_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(event);
    return acc;
  }, {});

  const save = async () => {
    if (!form.title.trim()) return;
    await base44.entities.TimelineEvent.create({
      investigation_id: caseId,
      title: form.title.trim(),
      event_time: form.event_time ? new Date(form.event_time).toISOString() : '',
      timestamp_confidence: form.timestamp_confidence,
      event_category: form.event_category,
      description: form.description.trim(),
      entity_ids: []
    });
    await logEvent({ event_type: 'case', action: 'Timeline event added', resource_type: 'TimelineEvent', resource_id: caseId, details: form.title });
    toast({ title: 'Timeline event recorded' });
    setDialogOpen(false);
    setForm({ title: '', event_time: '', timestamp_confidence: 'Exact', event_category: 'Observation', description: '' });
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 6 · timeline and evidence"
        title="Chronological timeline"
        description="Events are ordered strictly by their recorded timestamps. Anything without a timestamp stays visible below as uncertain rather than being placed at an assumed time."
        actions={<Button onClick={() => setDialogOpen(true)} disabled={!caseId}><Plus className="mr-1.5 h-4 w-4" />Add event</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-[190px]" aria-label="Filter by event category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={confidence} onValueChange={setConfidence}>
          <SelectTrigger className="w-[190px]" aria-label="Filter by timestamp confidence"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any timestamp confidence</SelectItem>
            {TIMESTAMP_CONFIDENCE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search events" className="pl-8" aria-label="Search timeline events" />
        </div>
        <Select value={compareId || 'none'} onValueChange={(v) => setCompareId(v === 'none' ? '' : v)}>
          <SelectTrigger className="w-[210px]" aria-label="Compare with another case"><SelectValue placeholder="Compare with…" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No comparison</SelectItem>
            {cases.filter((c) => c.id !== caseId).map((c) => <SelectItem key={c.id} value={c.id}>Compare: {c.case_code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!events && <div className="ig-panel"><Loading label="Loading timeline…" /></div>}

      {events && !filtered.length && (
        <div className="ig-panel"><EmptyState icon={CalendarClock} title="No events match" description="Adjust the filters or add an event to this demonstration case." /></div>
      )}

      <div className={compareId ? 'grid gap-3 lg:grid-cols-2' : ''}>
        {events && filtered.length > 0 && (
          <Panel title="Case timeline" subtitle={`${timed.length} timestamped · ${untimed.length} without a timestamp`}>
            <div className="space-y-4">
              {Object.entries(grouped).map(([date, items]) => (
                <div key={date}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="ig-label">{date}</span>
                    <span className="h-px flex-1 bg-border/60" />
                  </div>
                  <ol className="space-y-2.5 border-l border-border/60 pl-3">
                    {items.map((e) => (
                      <li key={e.id} className="relative">
                        <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-xs font-medium">{e.title}</p>
                          <StatusPill value={e.event_category} />
                          {e.timestamp_confidence !== 'Exact' && <StatusPill value={e.timestamp_confidence} />}
                        </div>
                        <p className="text-[10px] text-muted-foreground">{fmtDateTime(e.event_time)}</p>
                        {e.description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{e.description}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              {untimed.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="ig-label flex items-center gap-1 text-[hsl(44_92%_72%)]"><AlertTriangle className="h-3 w-3" />Timestamp unknown</span>
                    <span className="h-px flex-1 bg-border/60" />
                  </div>
                  <ul className="space-y-2">
                    {untimed.map((e) => (
                      <li key={e.id} className="rounded-sm border border-primary/25 bg-primary/[0.06] p-2">
                        <p className="text-xs">{e.title}</p>
                        <p className="text-[10px] text-muted-foreground">{e.description || 'Recorded without a timestamp in the source document.'}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Panel>
        )}

        {compareId && (
          <Panel title="Comparison case" subtitle="Sequence-only comparison — the two timelines are not merged">
            {!compareEvents.length && <EmptyState icon={Clock} title="No events in the comparison case" />}
            {compareEvents.length > 0 && (
              <ol className="space-y-2 border-l border-border/60 pl-3">
                {[...compareEvents].sort((a, b) => new Date(a.event_time || '9999') - new Date(b.event_time || '9999')).map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-accent" />
                    <p className="text-xs">{e.title}</p>
                    <p className="text-[10px] text-muted-foreground">{fmtDateTime(e.event_time)}</p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add timeline event</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="event-title">Title *</Label>
              <Input id="event-title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="event-time">Date and time</Label>
                <Input id="event-time" type="datetime-local" value={form.event_time} onChange={(e) => setForm((p) => ({ ...p, event_time: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label>Timestamp confidence</Label>
                <Select value={form.timestamp_confidence} onValueChange={(v) => setForm((p) => ({ ...p, timestamp_confidence: v }))}>
                  <SelectTrigger aria-label="Timestamp confidence"><SelectValue /></SelectTrigger>
                  <SelectContent>{TIMESTAMP_CONFIDENCE.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.event_category} onValueChange={(v) => setForm((p) => ({ ...p, event_category: v }))}>
                <SelectTrigger aria-label="Event category"><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="event-desc">Description</Label>
              <Textarea id="event-desc" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={!form.title.trim()}>Save event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}