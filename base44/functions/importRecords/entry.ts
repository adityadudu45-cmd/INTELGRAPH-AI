import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getActor, assertCanWrite, writeAudit, jsonError, toList } from '../../shared/access.ts';

const CATEGORY_MAP = {
  'FIR-style incident summary': 'Individual',
  'CDR-style interaction metadata': 'Phone Identifier',
  'Simulated financial transactions': 'Transaction Identifier',
  'Simulated surveillance observation': 'Location',
  'Intelligence report': 'Organization'
};

function asEventCategory(category) {
  if (category === 'Simulated financial transactions') return 'Transaction';
  if (category === 'CDR-style interaction metadata') return 'Communication metadata';
  if (category === 'Simulated surveillance observation') return 'Observation';
  if (category === 'FIR-style incident summary') return 'Incident';
  return 'Document';
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getActor(base44);

    const { allowed, role } = await assertCanWrite(base44, user);
    if (!allowed) return jsonError('This workspace profile is read-only.', 403);

    const body = await req.json().catch(() => ({}));
    const { investigation_id, category, file_name, rows, mapping } = body || {};
    if (!investigation_id || !category) return jsonError('investigation_id and category are required', 400);
    if (!Array.isArray(rows) || rows.length === 0) return jsonError('No parsed rows were supplied', 400);
    if (rows.length > 500) return jsonError('Import is limited to 500 rows per batch', 400);

    const cases = toList(await base44.entities.Investigation.filter({ id: investigation_id }));
    if (!cases.length) return jsonError('Case not found', 404);

    const existing = toList(await base44.entities.EntityRecord.filter({ investigation_id }));
    const existingKeys = new Set();
    existing.forEach((e) => {
      if (e.identifier) existingKeys.add(`id:${String(e.identifier).toLowerCase()}`);
      if (e.display_label) existingKeys.add(`label:${String(e.display_label).toLowerCase()}`);
    });

    const entityPayload = [];
    const eventPayload = [];
    const errors = [];
    let duplicates = 0;

    rows.forEach((raw, index) => {
      const label = String(raw.label ?? '').trim();
      const identifier = String(raw.identifier ?? '').trim();
      const description = String(raw.description ?? '').trim();
      const dateValue = String(raw.date ?? '').trim();
      const rowCategory = raw.category && raw.category.trim() ? raw.category.trim() : CATEGORY_MAP[category] || 'Individual';

      if (!label) {
        errors.push({ row: index + 1, reason: 'Missing required display label' });
        return;
      }
      if (label.length > 160) {
        errors.push({ row: index + 1, reason: 'Display label exceeds 160 characters' });
        return;
      }
      if (identifier && existingKeys.has(`id:${identifier.toLowerCase()}`)) {
        duplicates += 1;
        return;
      }
      if (existingKeys.has(`label:${label.toLowerCase()}`)) {
        duplicates += 1;
        return;
      }
      if (dateValue && Number.isNaN(Date.parse(dateValue))) {
        errors.push({ row: index + 1, reason: `Unparseable date: ${dateValue}` });
        return;
      }

      existingKeys.add(`label:${label.toLowerCase()}`);
      if (identifier) existingKeys.add(`id:${identifier.toLowerCase()}`);

      entityPayload.push({
        investigation_id,
        display_label: label,
        category: rowCategory,
        identifier,
        description,
        source_reference: `Imported from ${file_name || 'upload'}`,
        aliases: [],
        review_status: 'Unreviewed',
        confidence: 60
      });

      if (dateValue) {
        eventPayload.push({
          investigation_id,
          title: label,
          event_time: new Date(dateValue).toISOString(),
          timestamp_confidence: 'Exact',
          event_category: asEventCategory(category),
          description: description || `Imported ${category} record`,
          entity_ids: []
        });
      }
    });

    let createdEntities = [];
    if (entityPayload.length) {
      createdEntities = await base44.entities.EntityRecord.bulkCreate(entityPayload);
    }

    if (eventPayload.length) {
      const byLabel = new Map(createdEntities.map((e) => [e.display_label.toLowerCase(), e.id]));
      await base44.entities.TimelineEvent.bulkCreate(
        eventPayload.map((ev) => ({ ...ev, entity_ids: byLabel.has(ev.title.toLowerCase()) ? [byLabel.get(ev.title.toLowerCase())] : [] }))
      );
    }

    const importRecord = await base44.entities.DataImport.create({
      investigation_id,
      file_name: file_name || 'upload',
      category,
      status: errors.length && !entityPayload.length ? 'Validation failed' : 'Imported',
      total_records: rows.length,
      imported_records: entityPayload.length,
      failed_records: errors.length,
      duplicate_records: duplicates,
      mapping_json: JSON.stringify(mapping || {}),
      errors_json: JSON.stringify(errors)
    });

    await writeAudit(base44, {
      event_type: 'import',
      action: `Data import (${category})`,
      resource_type: 'DataImport',
      resource_id: importRecord.id,
      outcome: errors.length && !entityPayload.length ? 'Failure' : 'Success',
      details: `${entityPayload.length} imported · ${duplicates} duplicates · ${errors.length} failed as ${role}`,
      actor_email: user.email
    });

    return Response.json({
      import_id: importRecord.id,
      imported: entityPayload.length,
      events_created: eventPayload.length,
      duplicates,
      failed: errors.length,
      errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}