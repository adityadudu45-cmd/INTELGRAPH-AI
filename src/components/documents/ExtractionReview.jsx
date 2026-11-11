import { useState } from 'react';
import { Check, X, PenLine, Boxes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import StatusPill from '@/components/shared/StatusPill';
import { logEvent } from '@/lib/audit';
import { useToast } from '@/components/ui/use-toast';

const TYPE_TO_CATEGORY = {
  Person: 'Individual',
  Organization: 'Organization',
  Vehicle: 'Vehicle',
  Location: 'Location',
  'Reference ID': 'Transaction Identifier',
  Text: null,
  Date: null,
  Relationship: null
};

export default function ExtractionReview({ extractions = [], onChanged, investigationId }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState('');

  const accept = async (item, finalValue) => {
    setBusy(item.id);
    try {
      let relatedId = item.related_entity_id || '';
      const category = TYPE_TO_CATEGORY[item.extraction_type];
      if (category && finalValue?.trim()) {
        const created = await base44.entities.EntityRecord.create({
          investigation_id: investigationId,
          display_label: finalValue.trim(),
          category,
          identifier: item.extraction_type === 'Reference ID' ? finalValue.trim() : '',
          description: `Confirmed from document extraction (source snippet retained).`,
          source_reference: `AI extraction · ${item.extraction_type}`,
          review_status: 'Under Review',
          confidence: Math.round((item.confidence || 0.6) * 100)
        });
        relatedId = created.id;
      }
      await base44.entities.ExtractionResult.update(item.id, {
        review_status: finalValue !== item.value ? 'Corrected' : 'Approved',
        corrected_value: finalValue !== item.value ? finalValue : '',
        related_entity_id: relatedId
      });
      await logEvent({
        event_type: 'document',
        action: finalValue !== item.value ? 'Extraction corrected' : 'Extraction approved',
        resource_type: 'ExtractionResult',
        resource_id: item.id,
        details: `${item.extraction_type}: ${finalValue}`
      });
      toast({ title: 'Extraction reviewed', description: category ? 'Entity record created for analyst review.' : 'Suggestion marked as reviewed.' });
      setEditing(null);
      onChanged?.();
    } catch (err) {
      toast({ title: 'Review could not be saved', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  const reject = async (item) => {
    setBusy(item.id);
    try {
      await base44.entities.ExtractionResult.update(item.id, { review_status: 'Rejected' });
      await logEvent({ event_type: 'document', action: 'Extraction rejected', resource_type: 'ExtractionResult', resource_id: item.id, details: item.value });
      onChanged?.();
    } catch (err) {
      toast({ title: 'Could not reject suggestion', description: err?.message, variant: 'destructive' });
    } finally {
      setBusy('');
    }
  };

  if (!extractions.length) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 p-4 text-center text-[11px] text-muted-foreground">
        No extraction suggestions for this document yet.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {extractions.map((item) => (
        <li key={item.id} className="rounded-lg border border-border/60 bg-muted/20 p-2.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <StatusPill value={item.extraction_type} />
                <StatusPill value={item.review_status} />
              </div>
              <p className="mt-1.5 text-xs font-medium">
                {item.corrected_value || item.value}
                {item.corrected_value && <span className="ml-1 text-[10px] text-muted-foreground line-through">{item.value}</span>}
              </p>
              {item.source_snippet && <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">“{item.source_snippet}”</p>}
            </div>
            <span className="ig-mono text-[10px] text-muted-foreground">{Math.round((item.confidence || 0) * 100)}%</span>
          </div>

          {item.review_status === 'Suggested' && (
            editing === item.id ? (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-7 flex-1 text-xs" aria-label="Corrected value" />
                <Button size="sm" className="h-7 px-2 text-[11px]" onClick={() => accept(item, value)} disabled={busy === item.id || !value.trim()}>Save correction</Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="secondary" className="h-7 px-2 text-[11px]" onClick={() => accept(item, item.value)} disabled={busy === item.id}>
                  <Check className="mr-1 h-3 w-3" />Approve
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => { setEditing(item.id); setValue(item.value); }}>
                  <PenLine className="mr-1 h-3 w-3" />Correct
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-muted-foreground" onClick={() => reject(item)} disabled={busy === item.id}>
                  <X className="mr-1 h-3 w-3" />Reject
                </Button>
              </div>
            )
          )}

          {item.related_entity_id && (
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"><Boxes className="h-3 w-3" />Linked entity record created</p>
          )}
        </li>
      ))}
    </ul>
  );
}