import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getActor, jsonError, writeAudit } from '../../shared/access.ts';

// Records that only exist inside a case and are removed with it.
const CASE_DEPENDENTS = [
  'ExtractionResult',
  'DocumentRecord',
  'RelationshipRecord',
  'EntityRecord',
  'TimelineEvent',
  'EvidenceRecord',
  'PatternObservation',
  'AnalysisReport',
  'AnalystNote',
  'DataImport'
];

const REMOVABLE_CASE_STATUSES = ['Completed', 'Archived'];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const actor = await getActor(base44);

    const body = await req.json().catch(() => ({}));
    const { type, id } = body || {};
    if (!id || (type !== 'case' && type !== 'document')) {
      return jsonError('type ("case" or "document") and id are required', 400);
    }

    const entities = base44.asServiceRole.entities;

    if (type === 'document') {
      const doc = await entities.DocumentRecord.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!doc) return jsonError('Document not found', 404);

      await entities.ExtractionResult.deleteMany({ document_id: id });
      await entities.DocumentRecord.delete(id);

      const entry = {
        event_type: 'document',
        action: 'Document removed',
        resource_type: 'DocumentRecord',
        resource_id: id,
        outcome: 'Success',
        details: doc.title || '',
        actor_email: actor.email
      };
      await writeAudit(base44, entry);

      return Response.json({ removed: 'document', id, title: doc.title || '' });
    }

    const caseRecord = await entities.Investigation.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!caseRecord) return jsonError('Case not found', 404);
    if (!REMOVABLE_CASE_STATUSES.includes(caseRecord.status)) {
      return jsonError('Only completed or archived cases can be removed.', 400);
    }

    for (const name of CASE_DEPENDENTS) {
      await entities[name].deleteMany({ investigation_id: id });
    }
    await entities.Investigation.delete(id);

    const entry = {
      event_type: 'case',
      action: 'Case removed',
      resource_type: 'Investigation',
      resource_id: id,
      outcome: 'Success',
      details: `${caseRecord.case_code} · ${caseRecord.title}`,
      actor_email: actor.email
    };
    await writeAudit(base44, entry);

    return Response.json({ removed: 'case', id, case_code: caseRecord.case_code });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}