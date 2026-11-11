import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { CASE_PRIORITIES, CASE_STATUSES } from '@/lib/constants';
import { logEvent } from '@/lib/audit';

const EMPTY = {
  case_code: '', title: '', summary: '', status: 'Draft', priority: 'Low',
  opened_date: new Date().toISOString().slice(0, 10), analyst_emails: ''
};

export default function CaseFormDialog({ open, onOpenChange, caseRecord, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    if (caseRecord) {
      setForm({
        case_code: caseRecord.case_code || '',
        title: caseRecord.title || '',
        summary: caseRecord.summary || '',
        status: caseRecord.status || 'Draft',
        priority: caseRecord.priority || 'Low',
        opened_date: caseRecord.opened_date || '',
        analyst_emails: (caseRecord.analyst_emails || []).join(', ')
      });
    } else {
      setForm({ ...EMPTY, case_code: `IG-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}` });
    }
    setError('');
  }, [open, caseRecord]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async () => {
    if (!form.case_code.trim() || !form.title.trim()) {
      setError('A case reference and title are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      case_code: form.case_code.trim(),
      title: form.title.trim(),
      summary: form.summary.trim(),
      status: form.status,
      priority: form.priority,
      opened_date: form.opened_date || null,
      analyst_emails: form.analyst_emails.split(',').map((e) => e.trim()).filter(Boolean)
    };
    try {
      if (caseRecord) {
        await base44.entities.Investigation.update(caseRecord.id, payload);
        await logEvent({ event_type: 'case', action: 'Case updated', resource_type: 'Investigation', resource_id: caseRecord.id, details: payload.case_code });
      } else {
        const created = await base44.entities.Investigation.create(payload);
        await logEvent({ event_type: 'case', action: 'Case created', resource_type: 'Investigation', resource_id: created.id, details: payload.case_code });
      }
      toast({ title: caseRecord ? 'Case updated' : 'Case created', description: `${payload.case_code} saved.` });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'The case could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{caseRecord ? 'Edit demonstration case' : 'New demonstration case'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="case-code">Case reference *</Label>
            <Input id="case-code" value={form.case_code} onChange={set('case_code')} placeholder="IG-2026-031" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="case-title">Title *</Label>
            <Input id="case-title" value={form.title} onChange={set('title')} placeholder="Short description of the demonstration case" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="case-summary">Summary</Label>
            <Textarea id="case-summary" value={form.summary} onChange={set('summary')} rows={3} placeholder="What this synthetic case demonstrates" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CASE_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CASE_PRIORITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="case-opened">Opened date</Label>
            <Input id="case-opened" type="date" value={form.opened_date} onChange={set('opened_date')} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="case-analysts">Assigned analysts (comma-separated emails)</Label>
            <Input id="case-analysts" value={form.analyst_emails} onChange={set('analyst_emails')} placeholder="analyst@example.com" />
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save case'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}