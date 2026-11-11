import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getActor, assertCanWrite, writeAudit, jsonError, toList } from '../../shared/access.ts';

const DISCLAIMER = 'Educational demonstration using synthetic data. Not an official investigative report.';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getActor(base44);

    const { allowed } = await assertCanWrite(base44, user);
    if (!allowed) return jsonError('This workspace profile is read-only.', 403);

    const body = await req.json().catch(() => ({}));
    const { investigation_id, title, include_ai } = body || {};
    if (!investigation_id) return jsonError('investigation_id is required', 400);

    const caseRecord = await base44.entities.Investigation.get(investigation_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!caseRecord) return jsonError('Case not found', 404);

    const scope = { investigation_id };
    const [entities, relationships, events, evidence, patterns, documents, notes, previous] = await Promise.all([
      base44.entities.EntityRecord.filter(scope, { limit: 200 }),
      base44.entities.RelationshipRecord.filter(scope, { limit: 250 }),
      base44.entities.TimelineEvent.filter(scope, { limit: 200 }),
      base44.entities.EvidenceRecord.filter(scope, { limit: 100 }),
      base44.entities.PatternObservation.filter(scope, { limit: 60 }),
      base44.entities.DocumentRecord.filter(scope, { limit: 50 }),
      base44.entities.AnalystNote.filter(scope, { limit: 60 }),
      base44.entities.AnalysisReport.filter(scope, { limit: 100 })
    ]);

    const ent = toList(entities);
    const rel = toList(relationships);
    const evt = toList(events);
    const evd = toList(evidence);
    const pat = toList(patterns);
    const doc = toList(documents);
    const nts = toList(notes);
    const prev = toList(previous);

    const stats = {
      entities: ent.length,
      relationships: rel.length,
      events: evt.length,
      documents: doc.length,
      evidence: evd.length,
      patterns: pat.length,
      notes: nts.length
    };

    let aiSummary = '';
    let limitations = [
      'All records in this case are fictional and generated for educational demonstration.',
      'No connection to real call-detail records, financial systems, surveillance feeds or government systems exists.',
      'Centrality, frequency and pattern results describe the synthetic graph only and carry no meaning about real people.'
    ];

    if (include_ai !== false) {
      const context = [
        `CASE ${caseRecord.case_code} — ${caseRecord.title}. Status ${caseRecord.status}. ${caseRecord.summary || ''}`,
        `Counts: ${JSON.stringify(stats)}`,
        'ENTITY LABELS: ' + ent.map((e) => `${e.display_label} (${e.category})`).join('; '),
        'RELATIONSHIPS: ' + rel.map((r) => `${r.source_label} → ${r.target_label} [${r.relationship_type}, ${r.verification}]`).join('; '),
        'EVENTS: ' + evt.map((t) => `${t.event_time || 'no timestamp'} ${t.title}`).join('; '),
        'PATTERNS: ' + pat.map((p) => `${p.title} (${p.confidence})`).join('; ')
      ].join('\n');

      const schema = {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Neutral analytical draft summary of the synthetic case, facts separated from interpretation' },
          limitations: { type: 'array', items: { type: 'string' } }
        },
        required: ['summary', 'limitations']
      };

      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Write a neutral draft analytical summary for an educational demonstration report about a SYNTHETIC case. Use only the records below. State facts as recorded, mark any interpretation as an interpretation, never accuse or assign guilt, never create a risk score for a person, and note where evidence is thin. Keep it under 320 words.\n\n${context}`,
        response_json_schema: schema
      });

      aiSummary = String(result?.summary || '').slice(0, 4000);
      const extra = Array.isArray(result?.limitations) ? result.limitations.map((l) => String(l).slice(0, 240)) : [];
      limitations = limitations.concat(extra).slice(0, 8);
    }

    const sections = {
      disclaimer: DISCLAIMER,
      case: {
        code: caseRecord.case_code,
        title: caseRecord.title,
        status: caseRecord.status,
        priority: caseRecord.priority,
        summary: caseRecord.summary,
        opened_date: caseRecord.opened_date,
        analysts: caseRecord.analyst_emails || []
      },
      stats,
      data_sources: doc.map((d) => ({ id: d.id, title: d.title, category: d.category, status: d.processing_status })),
      entities: ent.map((e) => ({ id: e.id, label: e.display_label, category: e.category, identifier: e.identifier, status: e.review_status })),
      relationships: rel.map((r) => ({ id: r.id, source: r.source_label, target: r.target_label, type: r.relationship_type, verification: r.verification, source_reference: r.source_reference })),
      timeline: evt.map((t) => ({ id: t.id, time: t.event_time, confidence: t.timestamp_confidence, title: t.title, category: t.event_category })),
      patterns: pat.map((p) => ({ id: p.id, title: p.title, method: p.detection_method, explanation: p.explanation, confidence: p.confidence, limitations: p.limitations, review_status: p.review_status })),
      evidence: evd.map((v) => ({ id: v.id, code: v.evidence_code, title: v.title, status: v.verification_status, source: v.source })),
      analyst_notes: nts.filter((n) => n.note_type !== 'AI conversation').map((n) => ({ id: n.id, type: n.note_type, content: n.content })),
      ai_summary: aiSummary,
      limitations,
      methodology: [
        'Records were uploaded or entered as synthetic samples, reviewed and stored in the application database.',
        'Relationships are only displayed when supported by a stored source reference.',
        'Graph metrics are computed from the stored relationship records for the selected case.',
        'Pattern observations list their detection method, supporting records and limitations.'
      ]
    };

    const version = prev.length + 1;
    const report = await base44.entities.AnalysisReport.create({
      investigation_id,
      title: title && String(title).trim() ? String(title).trim().slice(0, 180) : `${caseRecord.case_code} analytical summary v${version}`,
      status: 'Draft',
      sections_json: JSON.stringify(sections),
      ai_summary: aiSummary,
      version,
      generated_by_name: user.full_name || user.email
    });

    await writeAudit(base44, {
      event_type: 'report',
      action: 'Report generated',
      resource_type: 'AnalysisReport',
      resource_id: report.id,
      outcome: 'Success',
      details: `Version ${version} · ${stats.entities} entities · ${stats.relationships} relationships`,
      actor_email: user.email
    });

    return Response.json({ report_id: report.id, version, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}