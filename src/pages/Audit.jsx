import { useEffect, useMemo, useState } from 'react';
import { Activity, Search, Download } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { AI_EVENT_TYPES, toList, fmtDateTime, downloadCsv } from '@/lib/constants';

const OUTCOMES = ['Success', 'Failure', 'Denied'];

export default function Audit() {
  const [logs, setLogs] = useState(null);
  const [eventType, setEventType] = useState('all');
  const [outcome, setOutcome] = useState('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    base44.entities.AuditLog.list('-created_date', 500).then((r) => setLogs(toList(r))).catch(() => setLogs([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (logs || [])
      .filter((l) => eventType === 'all' || l.event_type === eventType)
      .filter((l) => outcome === 'all' || l.outcome === outcome)
      .filter((l) => !q || `${l.action} ${l.details || ''} ${l.actor_email || ''} ${l.resource_type || ''}`.toLowerCase().includes(q))
      .filter((l) => {
        const when = l.created_date ? new Date(l.created_date) : null;
        if (!when) return true;
        if (from && when < new Date(from)) return false;
        if (to && when > new Date(`${to}T23:59:59`)) return false;
        return true;
      });
  }, [logs, eventType, outcome, search, from, to]);

  const exportCsv = () => {
    downloadCsv(`audit-log-${Date.now()}.csv`, [
      ['timestamp', 'event_type', 'action', 'resource_type', 'resource_id', 'outcome', 'actor', 'details'],
      ...filtered.map((l) => [l.created_date, l.event_type, l.action, l.resource_type, l.resource_id, l.outcome, l.actor_email, l.details])
    ]);
  };

  const counts = useMemo(() => ({
    total: (logs || []).length,
    failures: (logs || []).filter((l) => l.outcome === 'Failure').length,
    denied: (logs || []).filter((l) => l.outcome === 'Denied').length
  }), [logs]);

  return (
    <div>
      <PageHeader
        eyebrow="Stage 8 · audit and accountability"
        title="Audit trail"
        description="Case changes, imports, extractions, AI queries, report generations, evidence revisions and dataset resets are all written here with the acting account."
        actions={<Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}><Download className="mr-1.5 h-3.5 w-3.5" />Export log</Button>}
      />

      <div className="mb-3 grid grid-cols-3 gap-3">
        <div className="ig-panel p-3"><div className="ig-label">Recorded events</div><div className="mt-1 font-heading text-xl tabular-nums">{counts.total}</div></div>
        <div className="ig-panel p-3"><div className="ig-label">Failures</div><div className="mt-1 font-heading text-xl tabular-nums">{counts.failures}</div></div>
        <div className="ig-panel p-3"><div className="ig-label">Denied attempts</div><div className="mt-1 font-heading text-xl tabular-nums">{counts.denied}</div></div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search actions, details or accounts" className="pl-8" aria-label="Search audit log" />
        </div>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by event type"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {AI_EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={outcome} onValueChange={setOutcome}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by outcome"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any outcome</SelectItem>
            {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" aria-label="To date" />
      </div>

      <Panel title="Log entries" subtitle={`${filtered.length} of ${counts.total} shown`}>
        {!logs && <Loading label="Loading audit log…" />}
        {logs && !filtered.length && <EmptyState icon={Activity} title="No matching entries" description="Adjust the filters to widen the view." />}
        {filtered.length > 0 && (
          <div className="ig-scroll -mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[760px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Action</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Details</th>
                  <th className="pb-2 font-medium">Account</th>
                  <th className="pb-2 font-medium">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-muted/20">
                    <td className="whitespace-nowrap py-2 pr-3 text-[10px] text-muted-foreground">{fmtDateTime(l.created_date)}</td>
                    <td className="py-2 pr-3">{l.action}</td>
                    <td className="py-2 pr-3"><StatusPill value={l.event_type || 'ui'} tone="blue" /></td>
                    <td className="max-w-[260px] py-2 pr-3 text-[10px] text-muted-foreground">{l.details || '—'}</td>
                    <td className="py-2 pr-3 text-[10px] text-muted-foreground">{l.actor_email || 'system'}</td>
                    <td className="py-2"><StatusPill value={l.outcome} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}