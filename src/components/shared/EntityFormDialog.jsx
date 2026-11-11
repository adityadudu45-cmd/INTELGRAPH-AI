import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { ENTITY_CATEGORIES, REVIEW_STATUSES } from '@/lib/constants';
import { logEvent } from '@/lib/audit';

const EMPTY = {
  display_label: '', category: 'Individual', identifier: '', description: '',
  source_reference: '', review_status: 'Unreviewed', confidence: 60
};

export default function EntityFormDialog({ open, onOpenChange, entity, investigationId, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(entity ? {
      display_label: entity.display_label || '',
      category: entity.category || 'Individual',
      identifier: entity.identifier || '',
      description: entity.description || '',
      source_reference: entity.source_reference || '',
      review_status: entity.review_status || 'Unreviewed',
      confidence: entity.confidence ?? 60
    } : EMPTY);
    setError('');
  }, [open, entity]);

  const submit = async () => {
    if (!form.display_label.trim()) {
      setError('A display label is required.');
      return;
    }
    if (!entity && !investigationId) {
      setError('Select a demonstration case first.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      display_label: form.display_label.trim(),
      category: form.category,
      identifier: form.identifier.trim(),
      description: form.description.trim(),
      source_reference: form.source_reference.trim() || 'Manual analyst entry',
      review_status: form.review_status,
      confidence: Number(form.confidence) || 0,
      ...(entity ? {} : { investigation_id: investigationId })
    };
    try {
      if (entity) {
        await base44.entities.EntityRecord.update(entity.id, payload);
        await logEvent({ event_type: 'entity', action: 'Entity updated', resource_type: 'EntityRecord', resource_id: entity.id, details: payload.display_label });
      } else {
        const created = await base44.entities.EntityRecord.create(payload);
        await logEvent({ event_type: 'entity', action: 'Entity created', resource_type: 'EntityRecord', resource_id: created.id, details: payload.display_label });
      }
      toast({ title: entity ? 'Entity updated' : 'Entity created' });
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err?.message || 'The entity could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entity ? 'Edit entity record' : 'Create entity record'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="entity-label">Display label *</Label>
            <Input id="entity-label" value={form.display_label} onChange={(e) => setForm((p) => ({ ...p, display_label: e.target.value }))} placeholder="Invented name or identifier" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ENTITY_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Review status</Label>
              <Select value={form.review_status} onValueChange={(v) => setForm((p) => ({ ...p, review_status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{REVIEW_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="entity-identifier">Synthetic identifier</Label>
              <Input id="entity-identifier" value={form.identifier} onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))} placeholder="SYN-ID-0000" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="entity-confidence">Confidence (0–100)</Label>
              <Input id="entity-confidence" type="number" min="0" max="100" value={form.confidence} onChange={(e) => setForm((p) => ({ ...p, confidence: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="entity-description">Description</Label>
            <Textarea id="entity-description" rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="entity-source">Source reference</Label>
            <Input id="entity-source" value={form.source_reference} onChange={(e) => setForm((p) => ({ ...p, source_reference: e.target.value }))} placeholder="e.g. Synth report INT-REP-014-1" />
          </div>
          {error && <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Save entity'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}