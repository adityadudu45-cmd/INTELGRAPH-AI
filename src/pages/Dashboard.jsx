import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban, Boxes, GitBranch, FileText, Clock, ShieldCheck, Activity,
  UploadCloud, ArrowRight, Database, RefreshCw
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatCard from '@/components/shared/StatCard';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { toList, fmtDateTime, ENTITY_COLORS, DISCLAIMER } from '@/lib/constants';

const COLORS = ['#ff003c', '#ff6b8a', '#a3002a', '#ffc2ce', '#8a8a93', '#ff1744', '#d4d4d8'];
const tooltipStyle = { background: '#0a0a0d', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, fontSize: 12, color: '#ffffff' };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [
        cases, entities, relationships, documents, events,
        pendingPatterns, pendingExtractions, pendingRelationships, reports,
        entityCats, relCats, caseStatuses, activity, imports
      ] = await Promise.all([
        base44.entities.Investigation.count(),
        base44.entities.EntityRecord.count(),
        base44.entities.RelationshipRecord.count(),
        base44.entities.DocumentRecord.count(),
        base44.entities.TimelineEvent.count(),
        base44.entities.PatternObservation.count({ review_status: 'Unreviewed' }),
        base44.entities.ExtractionResult.count({ review_status: 'Suggested' }),
        base44.entities.RelationshipRecord.count({ review_status: 'Under Review' }),
        base44.entities.AnalysisReport.count(),
        base44.entities.EntityRecord.aggregate({ groupBy: 'category' }),
        base44.entities.RelationshipRecord.aggregate({ groupBy: 'relationship_type' }),
        base44.entities.Investigation.aggregate({ groupBy: 'status' }),
        base44.entities.AuditLog.list('-created_date', 200),
        base44.entities.DataImport.list('-created_date', 6)
      ]);

      const logs = toList(activity);
      const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return {
          day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
          events: logs.filter((l) => String(l.created_date || '').slice(0, 10) === key).length
        };
      });

      setData({
        cases, entities, relationships, documents, events,
        pending: pendingPatterns + pendingExtractions + pendingRelationships,
        reports,
        entityCats: toList(entityCats.rows).map((r) => ({ name: r.category || 'Unset', value: r.count })),
        relCats: toList(relCats.rows).map((r) => ({ name: r.relationship_type || 'Unset', value: r.count })),
        caseStatuses: toList(caseStatuses.rows).map((r) => ({ name: r.status || 'Unset', value: r.count })),
        recent: logs.slice(0, 7),
        imports: toList(imports),
        days
      });
    } catch (err) {
      setError(err?.message || 'Dashboard figures could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const empty = !loading && data && data.cases === 0;

  return (
    <div>
      <PageHeader
        eyebrow="Operations overview"
        title="Demonstration dashboard"
        description="Every figure below is counted from stored synthetic records — nothing on this page is hardcoded."
        actions={<Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className="mr-1.5 h-3.5 w-3.5" />Refresh</Button>}
      />

      {error && <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

      {loading && <div className="ig-panel"><Loading label="Counting stored records…" rows={2} /></div>}

      {empty && (
        <div className="ig-panel mb-4">
          <EmptyState
            icon={Database}
            title="No demonstration records yet"
            description="Create a demonstration case, then import CSV or JSON samples to build the synthetic records behind every module."
            action={<Button asChild><Link to="/cases">Open the case workspace</Link></Button>}
          />
        </div>
      )}

      {!loading && data && (
        <>
          <div className="mb-3 flex items-center gap-3">
            <span className="ig-label">Signal overview</span>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/45 to-transparent" />
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Stored records</span>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Demonstration cases" value={data.cases} icon={FolderKanban} tone="primary" />
            <StatCard label="Fictional entities" value={data.entities} icon={Boxes} tone="accent" />
            <StatCard label="Recorded relationships" value={data.relationships} icon={GitBranch} tone="violet" />
            <StatCard label="Uploaded documents" value={data.documents} icon={FileText} tone="green" />
            <StatCard label="Timeline events" value={data.events} icon={Clock} tone="amber" />
            <StatCard label="Pending analyst reviews" value={data.pending} icon={ShieldCheck} tone="primary" hint="Pattern observations, extraction suggestions, unverified relationships" />
            <StatCard label="Generated reports" value={data.reports} icon={Activity} tone="accent" />
            <StatCard label="Data imports logged" value={data.imports.length} icon={UploadCloud} tone="violet" />
          </div>

          <div className="mt-6 mb-3 flex items-center gap-3">
            <span className="ig-label">Live telemetry</span>
            <span className="h-px flex-1 bg-gradient-to-r from-primary/45 to-transparent" />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel title="Recorded activity" subtitle="Records logged in the audit trail over the last 7 days" className="lg:col-span-2">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.days} margin={{ left: -20, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="igDash" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff003c" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#ff003c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(216 30% 20%)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#8b98a9', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8b98a9', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="events" stroke="#ff003c" strokeWidth={2} fill="url(#igDash)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <Panel title="Entity categories" subtitle="Counted from entity records">
              {data.entityCats.length ? (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.entityCats} dataKey="value" nameKey="name" innerRadius={46} outerRadius={76} paddingAngle={2} cy="50%">
                        {data.entityCats.map((entry, i) => (
                          <Cell key={entry.name} fill={ENTITY_COLORS[entry.name] || COLORS[i % COLORS.length]} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState icon={Boxes} title="No entities recorded" />}
            </Panel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <Panel title="Case status" subtitle="All demonstration cases by lifecycle stage">
              {data.caseStatuses.length ? (
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.caseStatuses} margin={{ left: -22, right: 8 }}>
                      <CartesianGrid stroke="hsl(0 0% 16%)" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: '#8b98a9', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8b98a9', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#ff1744" radius={[2, 2, 0, 0]} barSize={30} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <EmptyState icon={FolderKanban} title="No cases yet" />}
            </Panel>

            <Panel title="Relationship categories" subtitle="Stored relationship records by type">
              <ul className="space-y-2.5">
                {data.relCats.map((row, i) => (
                  <li key={row.name}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate">{row.name}</span>
                      <span className="ig-mono text-muted-foreground">{row.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, (row.value / Math.max(...data.relCats.map((r) => r.value))) * 100)}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </li>
                ))}
                {!data.relCats.length && <li className="text-xs text-muted-foreground">No relationships recorded.</li>}
              </ul>
            </Panel>

            <Panel title="Data ingestion status" subtitle="Most recent import runs">
              {data.imports.length ? (
                <ul className="space-y-2">
                  {data.imports.slice(0, 4).map((imp) => (
                    <li key={imp.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs">{imp.file_name}</p>
                        <p className="text-[10px] text-muted-foreground">{imp.imported_records ?? 0} imported · {imp.failed_records ?? 0} failed</p>
                      </div>
                      <StatusPill value={imp.status} />
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon={UploadCloud} title="No imports yet" description="Upload a synthetic CSV or JSON sample to begin." />}
            </Panel>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Panel title="Recent activity" subtitle="Latest entries in the audit trail" action={<Button asChild variant="ghost" size="sm"><Link to="/audit">All logs<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
              {data.recent.length ? (
                <ul className="space-y-2.5">
                  {data.recent.map((log) => (
                    <li key={log.id} className="flex items-start gap-2 text-xs">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{log.action}</p>
                        <p className="text-[10px] text-muted-foreground">{fmtDateTime(log.created_date)} · {log.actor_email || 'system'}</p>
                      </div>
                      <StatusPill value={log.outcome} />
                    </li>
                  ))}
                </ul>
              ) : <EmptyState icon={Activity} title="No activity recorded" />}
            </Panel>

            <Panel title="Recent reports" subtitle="Generated analytical reports" action={<Button asChild variant="ghost" size="sm"><Link to="/reports">Open<ArrowRight className="ml-1 h-3 w-3" /></Link></Button>}>
              <RecentReports />
            </Panel>
          </div>

          <p className="mt-4 text-[11px] text-muted-foreground">{DISCLAIMER}</p>
        </>
      )}
    </div>
  );
}

function RecentReports() {
  const [reports, setReports] = useState(null);
  useEffect(() => {
    base44.entities.AnalysisReport.list('-created_date', 4).then((r) => setReports(toList(r))).catch(() => setReports([]));
  }, []);
  if (!reports) return <Loading label="Loading reports…" rows={2} />;
  if (!reports.length) return <EmptyState icon={FileText} title="No reports generated" description="Generate an analytical report from the Reports module." />;
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
          <div className="min-w-0">
            <Link to="/reports" className="truncate text-xs hover:text-primary">{r.title}</Link>
            <p className="text-[10px] text-muted-foreground">v{r.version || 1} · {fmtDateTime(r.created_date)}</p>
          </div>
          <StatusPill value={r.status} />
        </li>
      ))}
    </ul>
  );
}