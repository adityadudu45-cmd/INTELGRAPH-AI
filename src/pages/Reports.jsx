import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Plus, CheckCircle2, Layers } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { toList, fmtDateTime, DISCLAIMER } from '@/lib/constants';
import { exportReportPdf } from '@/lib/reportPdf';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function Reports() {
  const { toast } = useToast();
  const [cases, setCases] = useState([]);
  const [caseId, setCaseId] = useState('');
  const [reports, setReports] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [includeAi, setIncludeAi] = useState(true);
  const [generating, setGenerating] = useState(false);
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
    setReports(null);
    const page = await base44.entities.AnalysisReport.filter({ investigation_id: caseId }, { sort: '-created_date', limit: 100 });
    const list = toList(page);
    setReports(list);
    if (list.length && !list.some((r) => r.id === selectedId)) setSelectedId(list[0].id);
    if (!list.length) setSelectedId('');
  };

  useEffect(() => { load(); }, [caseId]);

  const selected = (reports || []).find((r) => r.id === selectedId) || null;
  const sections = useMemo(() => {
    if (!selected) return null;
    try { return JSON.parse(selected.sections_json || '{}'); } catch (_) { return null; }
  }, [selected]);

  const currentCase = cases.find((c) => c.id === caseId);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const response = await base44.functions.invoke('generateReport', {
        investigation_id: caseId,
        title: title.trim() || `${currentCase?.case_code || 'Case'} analytical report`,
        include_ai: includeAi
      });
      await logEvent({ event_type: 'report', action: 'Report generated', resource_type: 'AnalysisReport', resource_id: response.data?.report_id, details: `v${response.data?.version}` });
      toast({ title: 'Report generated', description: `Version ${response.data?.version} is stored as a draft.` });
      setDialogOpen(false);
      setTitle('');
      await load();
      if (response.data?.report_id) setSelectedId(response.data.report_id);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The report could not be generated.');
    } finally {
      setGenerating(false);
    }
  };

  const markFinal = async () => {
    if (!selected) return;
    await base44.entities.AnalysisReport.update(selected.id, { status: 'Final' });
    await logEvent({ event_type: 'report', action: 'Report marked final', resource_type: 'AnalysisReport', resource_id: selected.id, details: selected.title });
    toast({ title: 'Report marked final' });
    load();
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 8 · reporting"
        title="Analytical reports"
        description="Generate a versioned report from stored records. Each version keeps the records it was built from, the methodology, and a plain statement of its limitations."
        actions={<Button onClick={() => { setTitle(`${currentCase?.case_code || ''} analytical report`); setDialogOpen(true); }} disabled={!caseId}><Plus className="mr-1.5 h-4 w-4" />Generate report</Button>}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" />
        {reports && <span className="text-[11px] text-muted-foreground">{reports.length} version(s) stored for this case</span>}
      </div>

      {!reports && <div className="ig-panel"><Loading label="Loading reports…" /></div>}

      {reports && !reports.length && (
        <div className="ig-panel">
          <EmptyState
            icon={FileText}
            title="No reports for this case"
            description="Generate the first version. Reports are drafts until an analyst marks them final."
            action={<Button variant="outline" onClick={() => setDialogOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Generate report</Button>}
          />
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-4">
          <Panel title="Versions" bodyClassName="space-y-1.5" className="lg:col-span-1">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`w-full rounded-md border px-2.5 py-2 text-left text-[11px] transition-colors ${selectedId === r.id ? 'border-primary/60 bg-primary/10' : 'border-border/60 hover:bg-muted/40'}`}
              >
                <span className="block truncate font-medium">{r.title}</span>
                <span className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground">v{r.version || 1} · {fmtDateTime(r.created_date)}</span>
                  <StatusPill value={r.status} />
                </span>
              </button>
            ))}
          </Panel>

          <div className="space-y-3 lg:col-span-3">
            {selected && sections ? (
              <>
                <Panel
                  title={selected.title}
                  subtitle={`Version ${selected.version || 1} · ${selected.status} · ${fmtDateTime(selected.created_date)}`}
                  action={
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => exportReportPdf(selected, sections)}><Download className="mr-1.5 h-3.5 w-3.5" />Export PDF</Button>
                      {selected.status !== 'Final' && <Button size="sm" onClick={markFinal}><CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />Mark final</Button>}
                    </div>
                  }
                >
                  <p className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-[11px] text-primary">{sections.disclaimer || DISCLAIMER}</p>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    {Object.entries(sections.stats || {}).map(([key, value]) => (
                      <div key={key} className="rounded-md border border-border/60 bg-muted/20 p-2">
                        <div className="ig-label text-[9px]">{key.replace(/_/g, ' ')}</div>
                        <div className="font-heading text-base tabular-nums">{value}</div>
                      </div>
                    ))}
                  </div>

                  {sections.ai_summary && (
                    <div className="mt-3">
                      <div className="ig-label mb-1">Draft analytical summary</div>
                      <p className="whitespace-pre-wrap text-[11px] leading-relaxed">{sections.ai_summary}</p>
                    </div>
                  )}

                  <div className="mt-3">
                    <div className="ig-label mb-1">Case record</div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {sections.case?.code} — {sections.case?.title} · status {sections.case?.status} · priority {sections.case?.priority || 'Low'} · opened {sections.case?.opened_date || '—'}
                      {sections.case?.analysts?.length ? ` · analysts ${sections.case.analysts.join(', ')}` : ''}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <SectionList title="Entities included" items={(sections.entities || []).map((e) => `${e.label} · ${e.category}`)} />
                    <SectionList title="Relationships included" items={(sections.relationships || []).map((r) => `${r.source} → ${r.target} · ${r.verification}`)} />
                    <SectionList title="Timeline" items={(sections.timeline || []).map((t) => `${t.time ? new Date(t.time).toLocaleDateString('en-GB') : 'unknown time'} · ${t.title}`)} />
                    <SectionList title="Pattern observations" items={(sections.patterns || []).map((p) => `${p.title} · ${p.confidence}`)} />
                  </div>

                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <SectionList title="Methodology" items={sections.methodology || []} />
                    <SectionList title="Limitations" items={sections.limitations || []} />
                  </div>

                  {sections.analyst_notes?.length > 0 && (
                    <div className="mt-3">
                      <div className="ig-label mb-1">Analyst notes included</div>
                      <ul className="space-y-1">
                        {sections.analyst_notes.map((n) => (
                          <li key={n.id} className="text-[11px] leading-relaxed text-muted-foreground">[{n.type}] {n.content}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Panel>

                <Panel title="Version history" subtitle="Earlier versions stay stored with the records they were built from">
                  <ul className="space-y-1.5">
                    {[...reports].reverse().map((r) => (
                      <li key={r.id} className="flex items-center justify-between gap-2 border-b border-border/50 pb-1.5 text-[11px] last:border-0 last:pb-0">
                        <span className="flex items-center gap-1.5"><Layers className="h-3 w-3 text-muted-foreground" />v{r.version || 1} · {r.title}</span>
                        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">{fmtDateTime(r.created_date)}<StatusPill value={r.status} /></span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </>
            ) : (
              <div className="ig-panel"><EmptyState icon={FileText} title="Select a report version" /></div>
            )}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Generate analytical report</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Case</Label>
              <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" className="w-full" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-title">Report title</Label>
              <Input id="report-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              <div>
                <p className="text-[11px] font-medium">Include draft AI summary</p>
                <p className="text-[10px] text-muted-foreground">A neutral draft written only from the stored records.</p>
              </div>
              <Switch checked={includeAi} onCheckedChange={setIncludeAi} aria-label="Include AI summary" />
            </div>
            {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={generating || !caseId}>{generating ? 'Generating…' : 'Generate report'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionList({ title, items }) {
  return (
    <div>
      <div className="ig-label mb-1">{title}</div>
      {items?.length ? (
        <ul className="ig-scroll max-h-[150px] space-y-1 overflow-y-auto pr-1">
          {items.map((item, i) => <li key={i} className="text-[11px] leading-relaxed text-muted-foreground">· {item}</li>)}
        </ul>
      ) : <p className="text-[11px] text-muted-foreground">None recorded.</p>}
    </div>
  );
}