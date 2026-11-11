import { useEffect, useMemo, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, Download, X } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { IMPORT_CATEGORIES, toList, fmtDateTime, downloadCsv } from '@/lib/constants';

const TARGETS = [
  { key: 'label', label: 'Display label', required: true },
  { key: 'identifier', label: 'Identifier' },
  { key: 'description', label: 'Description' },
  { key: 'date', label: 'Date / time' },
  { key: 'category', label: 'Entity category' }
];

const GUESS = {
  label: ['label', 'name', 'title', 'subject', 'entity', 'person'],
  identifier: ['identifier', 'id', 'ref', 'reference', 'plate', 'number', 'code'],
  description: ['description', 'desc', 'note', 'summary', 'detail', 'text'],
  date: ['date', 'time', 'timestamp', 'datetime', 'when'],
  category: ['category', 'type', 'kind', 'class']
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 1; } else { quoted = false; }
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch === '\r') { /* ignore */ } else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}

function parseDelimited(text) {
  const table = parseCsv(text);
  if (table.length < 2) return { headers: [], rows: [] };
  const headers = table[0].map((h, i) => String(h).trim() || `column_${i + 1}`);
  const rows = table.slice(1).map((cells) => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
  return { headers, rows };
}

function parseAny(text, fileName = '') {
  const isJson = fileName.toLowerCase().endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{');
  if (isJson) {
    const parsed = JSON.parse(text);
    const rows = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.records) ? parsed.records : [parsed];
    const clean = rows.filter((r) => r && typeof r === 'object');
    const headers = [...new Set(clean.flatMap((r) => Object.keys(r)))];
    return { headers, rows: clean };
  }
  return parseDelimited(text);
}

export default function Ingestion() {
  const fileRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [imports, setImports] = useState(null);
  const [caseId, setCaseId] = useState('');
  const [category, setCategory] = useState(IMPORT_CATEGORIES[0]);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [paste, setPaste] = useState('');
  const [parseError, setParseError] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    const [casePage, importPage] = await Promise.all([
      base44.entities.Investigation.list('-created_date', 100),
      base44.entities.DataImport.list('-created_date', 25)
    ]);
    const list = toList(casePage);
    setCases(list);
    setImports(toList(importPage));
    if (!caseId && list.length) setCaseId(list[0].id);
  };

  useEffect(() => { load(); }, []);

  const applyData = (text, name) => {
    setParseError('');
    setResult(null);
    try {
      const { headers: h, rows: r } = parseAny(text, name);
      if (!h.length || !r.length) {
        setParseError('No tabular records were found. Provide a delimited header row plus at least one record.');
        setHeaders([]); setRows([]);
        return;
      }
      setHeaders(h);
      setRows(r);
      setFileName(name);
      const guessed = {};
      TARGETS.forEach((t) => {
        const found = h.find((header) => GUESS[t.key].some((g) => header.toLowerCase().replace(/[\s_-]/g, '').includes(g)));
        guessed[t.key] = found || '';
      });
      setMapping(guessed);
    } catch (err) {
      setParseError(err?.message || 'This file could not be parsed.');
      setHeaders([]); setRows([]);
    }
  };

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.name.toLowerCase().endsWith('.pdf')) {
      setParseError('PDF samples belong in Document Intelligence, where the extracted text is reviewed. Export the rows to CSV to import structured records here.');
      return;
    }
    const text = await file.text();
    applyData(text, file.name);
  };

  const normalized = useMemo(() => rows.map((raw) => {
    const out = {};
    TARGETS.forEach((t) => {
      const source = mapping[t.key];
      out[t.key] = source ? String(raw[source] ?? '').trim() : '';
    });
    return out;
  }), [rows, mapping]);

  const missingLabels = normalized.filter((r) => !r.label).length;

  const runImport = async () => {
    if (!caseId) { setParseError('Select the demonstration case this import belongs to.'); return; }
    if (missingLabels === normalized.length) { setParseError('No row has a value mapped to the display label field.'); return; }
    setRunning(true);
    setParseError('');
    try {
      const response = await base44.functions.invoke('importRecords', {
        investigation_id: caseId,
        category,
        file_name: fileName || 'pasted-sample.csv',
        rows: normalized,
        mapping
      });
      setResult(response.data);
      setRows([]); setHeaders([]); setMapping({}); setPaste(''); setFileName('');
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      setParseError(err?.response?.data?.error || err?.message || 'The import could not be completed.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 2 · data ingestion"
        title="Structured sample ingestion"
        description="Load synthetic CSV or JSON records, map the columns, review validation and duplicates before anything is written. Row-level errors are reported per record."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="1 · Source file" className="lg:col-span-1" bodyClassName="space-y-3">
          <div className="grid gap-1.5">
            <Label>Demonstration case *</Label>
            <CaseFilter cases={cases} value={caseId} onChange={setCaseId} allLabel="Select a case" className="w-full" />
          </div>
          <div className="grid gap-1.5">
            <Label>Sample category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger aria-label="Sample category"><SelectValue /></SelectTrigger>
              <SelectContent>{IMPORT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ingest-file">Upload CSV or JSON</Label>
            <Input id="ingest-file" ref={fileRef} type="file" accept=".csv,.json,.txt" onChange={onFile} />
            <p className="text-[10px] text-muted-foreground">Maximum 500 records per batch. Nothing is stored until you confirm.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ingest-paste">…or paste delimited text</Label>
            <Textarea id="ingest-paste" rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder={'label,identifier,description,date\nSample row,SYN-001,Demonstration record,2026-04-02'} />
            <Button size="sm" variant="outline" onClick={() => applyData(paste, 'pasted-sample.csv')} disabled={!paste.trim()}>Parse pasted text</Button>
          </div>
        </Panel>

        <Panel title="2 · Column mapping" className="lg:col-span-2">
          {!headers.length && <EmptyState icon={FileSpreadsheet} title="No file parsed yet" description="Upload a sample or paste delimited text to see its columns here." />}
          {headers.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <StatusPill value={`${rows.length} rows`} tone="blue" />
                <StatusPill value={`${headers.length} columns`} tone="gray" />
                {missingLabels > 0 && <StatusPill value={`${missingLabels} without label`} tone="amber" />}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {TARGETS.map((t) => (
                  <div key={t.key} className="grid gap-1">
                    <Label className="text-[11px]">{t.label}{t.required ? ' *' : ''}</Label>
                    <Select value={mapping[t.key] || 'none'} onValueChange={(v) => setMapping((p) => ({ ...p, [t.key]: v === 'none' ? '' : v }))}>
                      <SelectTrigger aria-label={`Map ${t.label}`}><SelectValue placeholder="Not mapped" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not mapped</SelectItem>
                        {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="ig-scroll -mx-4 overflow-x-auto px-4">
                <table className="w-full min-w-[520px] text-[11px]">
                  <thead>
                    <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                      <th className="pb-2 font-medium">Label</th>
                      <th className="pb-2 font-medium">Identifier</th>
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {normalized.slice(0, 6).map((r, i) => (
                      <tr key={i}>
                        <td className={`py-1.5 pr-3 ${r.label ? '' : 'text-destructive'}`}>{r.label || 'missing'}</td>
                        <td className="py-1.5 pr-3 ig-mono text-muted-foreground">{r.identifier || '—'}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{r.date || '—'}</td>
                        <td className="max-w-[220px] truncate py-1.5 text-muted-foreground">{r.description || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {normalized.length > 6 && <p className="pt-1 text-[10px] text-muted-foreground">Previewing 6 of {normalized.length} rows.</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={runImport} disabled={running}>
                  <UploadCloud className="mr-1.5 h-4 w-4" />{running ? 'Validating and importing…' : 'Validate and import'}
                </Button>
                <Button variant="ghost" onClick={() => { setHeaders([]); setRows([]); setMapping({}); setResult(null); }}>
                  <X className="mr-1.5 h-4 w-4" />Clear
                </Button>
              </div>
            </div>
          )}

          {parseError && <p className="mt-3 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{parseError}</p>}

          {result && (
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <p className="flex items-center gap-2 text-xs text-primary"><CheckCircle2 className="h-4 w-4" />Import recorded</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                <ResultStat label="Imported" value={result.imported} />
                <ResultStat label="Timeline events" value={result.events_created} />
                <ResultStat label="Duplicates skipped" value={result.duplicates} />
                <ResultStat label="Failed rows" value={result.failed} />
              </div>
              {Boolean(result.errors?.length) && (
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => downloadCsv(`import-errors-${Date.now()}.csv`, [['row', 'reason'], ...result.errors.map((e) => [e.row, e.reason])])}>
                    <Download className="mr-1.5 h-3.5 w-3.5" />Download error report
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Import history" subtitle="Every batch keeps its counts, mapping and row-level errors" className="mt-3">
        {!imports && <Loading label="Loading import history…" />}
        {imports && !imports.length && <EmptyState icon={UploadCloud} title="No imports recorded" />}
        {imports && imports.length > 0 && (
          <div className="ig-scroll -mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="pb-2 font-medium">File</th>
                  <th className="pb-2 font-medium">Category</th>
                  <th className="pb-2 font-medium">Imported</th>
                  <th className="pb-2 font-medium">Failed</th>
                  <th className="pb-2 font-medium">Duplicates</th>
                  <th className="pb-2 font-medium">When</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {imports.map((imp) => {
                  let errors = [];
                  try { errors = JSON.parse(imp.errors_json || '[]'); } catch (_) { errors = []; }
                  return (
                    <tr key={imp.id}>
                      <td className="py-2 pr-3 ig-mono text-[11px]">{imp.file_name}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{imp.category}</td>
                      <td className="py-2 pr-3 tabular-nums">{imp.imported_records ?? 0}/{imp.total_records ?? 0}</td>
                      <td className="py-2 pr-3 tabular-nums">{imp.failed_records ?? 0}</td>
                      <td className="py-2 pr-3 tabular-nums">{imp.duplicate_records ?? 0}</td>
                      <td className="py-2 pr-3 text-[10px] text-muted-foreground">{fmtDateTime(imp.created_date)}</td>
                      <td className="py-2"><StatusPill value={imp.status} /></td>
                      <td className="py-2 text-right">
                        {errors.length > 0 && (
                          <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => downloadCsv(`import-errors-${imp.id}.csv`, [['row', 'reason'], ...errors.map((e) => [e.row, e.reason])])} aria-label="Download error report">
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 px-2 py-1.5">
      <div className="ig-label text-[9px]">{label}</div>
      <div className="font-heading text-sm tabular-nums">{value ?? 0}</div>
    </div>
  );
}