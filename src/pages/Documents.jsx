import { useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, ScanText, RefreshCw, Search } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import Panel from '@/components/shared/Panel';
import StatusPill from '@/components/shared/StatusPill';
import EmptyState from '@/components/shared/EmptyState';
import Loading from '@/components/shared/Loading';
import CaseFilter from '@/components/shared/CaseFilter';
import ExtractionReview from '@/components/documents/ExtractionReview';
import DeleteRecordButton from '@/components/shared/DeleteRecordButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { DOC_CATEGORIES, DOC_STATUSES, toList, fmtDateTime } from '@/lib/constants';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

export default function Documents() {
  const { toast } = useToast();
  const fileRef = useRef(null);
  const [cases, setCases] = useState([]);
  const [docs, setDocs] = useState(null);
  const [caseFilter, setCaseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [extractions, setExtractions] = useState([]);
  const [busy, setBusy] = useState('');
  const [uploadCase, setUploadCase] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState(DOC_CATEGORIES[0]);
  const [error, setError] = useState('');

  const loadCases = async () => {
    const list = toList(await base44.entities.Investigation.list('-created_date', 100));
    setCases(list);
    if (!uploadCase && list.length) setUploadCase(list[0].id);
  };

  const loadDocs = async () => {
    const query = caseFilter === 'all' ? {} : { investigation_id: caseFilter };
    if (statusFilter !== 'all') query.processing_status = statusFilter;
    const list = toList(await base44.entities.DocumentRecord.filter(query, { sort: '-created_date', limit: 200 }));
    setDocs(list);
    if (list.length && !list.some((d) => d.id === selectedId)) setSelectedId(list[0].id);
    if (!list.length) setSelectedId('');
  };

  const loadExtractions = async (documentId) => {
    if (!documentId) { setExtractions([]); return; }
    setExtractions(toList(await base44.entities.ExtractionResult.filter({ document_id: documentId }, { sort: '-created_date', limit: 200 })));
  };

  useEffect(() => { loadCases(); }, []);
  useEffect(() => { loadDocs(); }, [caseFilter, statusFilter]);
  useEffect(() => { loadExtractions(selectedId); }, [selectedId]);

  const selected = (docs || []).find((d) => d.id === selectedId) || null;

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !uploadCase) {
      setError('Choose a case and a file before uploading.');
      return;
    }
    setBusy('upload');
    setError('');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const doc = await base44.entities.DocumentRecord.create({
        investigation_id: uploadCase,
        title: uploadTitle.trim() || file.name,
        file_name: file.name,
        file_uri,
        file_type: file.type || 'application/octet-stream',
        category: uploadCategory,
        processing_status: 'Uploaded'
      });
      let text = '';
      if (/text|json|csv/.test(file.type) || /\.(txt|csv|json|md)$/i.test(file.name)) {
        text = (await file.text()).slice(0, 12000);
      }
      setBusy('extract');
      const response = await base44.functions.invoke('processDocument', { document_id: doc.id, text });
      await logEvent({
        event_type: 'document', action: 'Document processed', resource_type: 'DocumentRecord', resource_id: doc.id,
        details: `${doc.title} · ${response.data?.suggestions ?? 0} suggestions`
      });
      toast({ title: 'Document processed', description: `${response.data?.suggestions ?? 0} suggestions are ready for review.` });
      setUploadTitle('');
      if (fileRef.current) fileRef.current.value = '';
      await loadDocs();
      setSelectedId(doc.id);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The document could not be processed.');
    } finally {
      setBusy('');
    }
  };

  const reprocess = async () => {
    if (!selected) return;
    setBusy('extract');
    try {
      const response = await base44.functions.invoke('processDocument', { document_id: selected.id });
      toast({ title: 'Extraction re-run', description: `${response.data?.suggestions ?? 0} suggestions generated.` });
      await loadDocs();
      await loadExtractions(selected.id);
    } catch (err) {
      toast({ title: 'Extraction failed', description: err?.response?.data?.error || err?.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const removeDocument = async (doc) => {
    try {
      await base44.functions.invoke('deleteRecord', { type: 'document', id: doc.id });
      toast({ title: 'Document removed', description: `${doc.title} and its extraction suggestions were deleted.` });
      if (doc.id === selectedId) setSelectedId('');
      await loadDocs();
    } catch (err) {
      toast({
        title: 'Could not remove document',
        description: err?.response?.data?.error || err?.message,
        variant: 'destructive'
      });
    }
  };

  const refreshAfterReview = async () => {
    await loadDocs();
    await loadExtractions(selectedId);
  };

  const filtered = (docs || []).filter((d) => {
    const q = search.trim().toLowerCase();
    return !q || `${d.title} ${d.document_id || ''} ${d.category}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <PageHeader
        eyebrow="Stage 3 · document intelligence"
        title="Document upload and extraction"
        description="Upload synthetic samples, extract candidate entities and relationships, then approve, correct or reject every suggestion before it enters the case record."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Upload a document" bodyClassName="space-y-2.5">
          <div className="grid gap-1.5">
            <Label>Case *</Label>
            <CaseFilter cases={cases} value={uploadCase} onChange={setUploadCase} allLabel="Select a case" className="w-full" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder="Defaults to the file name" />
          </div>
          <div className="grid gap-1.5">
            <Label>Category</Label>
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger aria-label="Document category"><SelectValue /></SelectTrigger>
              <SelectContent>{DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="doc-file">File</Label>
            <Input id="doc-file" ref={fileRef} type="file" accept=".txt,.csv,.json,.pdf,.md" />
            <p className="text-[10px] text-muted-foreground">Stored privately; opened only through signed links.</p>
          </div>
          <Button className="w-full" onClick={upload} disabled={busy === 'upload' || busy === 'extract'}>
            <UploadCloud className="mr-1.5 h-4 w-4" />
            {busy === 'upload' ? 'Uploading…' : busy === 'extract' ? 'Extracting…' : 'Upload and extract'}
          </Button>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-[11px] text-destructive">{error}</p>}
        </Panel>

        <Panel title="Documents" className="lg:col-span-1" bodyClassName="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents" className="h-8 pl-7 text-xs" aria-label="Search documents" />
          </div>
          <CaseFilter cases={cases} value={caseFilter} onChange={setCaseFilter} className="w-full" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full" aria-label="Filter by processing status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All processing states</SelectItem>
              {DOC_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {!docs && <Loading label="Loading documents…" rows={2} />}
          {docs && !filtered.length && <EmptyState icon={FileText} title="No documents" description="Upload a synthetic sample to begin." />}
          <ul className="max-h-[420px] space-y-1.5 overflow-y-auto ig-scroll">
            {filtered.map((d) => (
              <li
                key={d.id}
                className={`flex items-center gap-1 rounded-md border px-1 transition-colors ${selectedId === d.id ? 'border-primary/60 bg-primary/10' : 'border-border/60 hover:bg-muted/40'}`}
              >
                <button
                  onClick={() => setSelectedId(d.id)}
                  className="min-w-0 flex-1 px-1.5 py-2 text-left text-[11px]"
                >
                  <span className="block truncate font-medium">{d.title}</span>
                  <span className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] text-muted-foreground">{d.category}</span>
                    <StatusPill value={d.processing_status} />
                  </span>
                </button>
                <DeleteRecordButton
                  label={`Remove document ${d.title}`}
                  title={`Remove ${d.title}?`}
                  description="The document and its extracted suggestions will be deleted. This cannot be undone."
                  onConfirm={() => removeDocument(d)}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title={selected ? selected.title : 'Extraction review'}
          subtitle={selected ? `${selected.category} · ${fmtDateTime(selected.created_date)}` : 'Select a document to review its extracted suggestions'}
          action={selected ? <Button size="sm" variant="outline" onClick={reprocess} disabled={busy === 'extract'}><RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy === 'extract' ? 'animate-spin' : ''}`} />Re-run</Button> : null}
        >
          {!selected && <EmptyState icon={ScanText} title="Nothing selected" description="Pick a document from the list to see its extracted text and suggestions." />}
          {selected && (
            <div className="space-y-3">
              <div>
                <div className="ig-label mb-1">Extracted source text</div>
                <pre className="ig-scroll max-h-[180px] overflow-auto whitespace-pre-wrap rounded-md border border-border/60 bg-background/50 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
{selected.extracted_text || 'No text stored for this document yet. Run extraction to generate a summary and suggestions.'}
                </pre>
              </div>
              <div>
                <div className="ig-label mb-1">Extraction summary</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{selected.extraction_summary || '—'}</p>
              </div>
              <div>
                <div className="ig-label mb-1.5">Suggestions awaiting review</div>
                <ExtractionReview extractions={extractions} onChanged={refreshAfterReview} investigationId={selected.investigation_id} />
              </div>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}