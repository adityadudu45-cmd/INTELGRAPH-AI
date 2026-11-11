import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getActor, assertCanWrite, writeAudit, jsonError, toList } from '../../shared/access.ts';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getActor(base44);

    const { allowed, role } = await assertCanWrite(base44, user);
    if (!allowed) return jsonError('This workspace profile is read-only.', 403);

    const body = await req.json().catch(() => ({}));
    const { document_id, text } = body || {};
    if (!document_id) return jsonError('document_id is required', 400);

    const doc = await base44.entities.DocumentRecord.get(document_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!doc) return jsonError('Document not found', 404);

    await base44.entities.DocumentRecord.update(document_id, { processing_status: 'Processing' });

    let fileUrls = [];
    const suppliedText = typeof text === 'string' ? text.trim() : '';
    if (!suppliedText && doc.file_uri) {
      if (doc.file_uri.startsWith('http')) {
        fileUrls = [doc.file_uri];
      } else {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: doc.file_uri, expires_in: 600 });
        if (signed?.signed_url) fileUrls = [signed.signed_url];
      }
    }

    if (!suppliedText && !fileUrls.length) {
      await base44.entities.DocumentRecord.update(document_id, { processing_status: 'Needs Review' });
      return Response.json({
        error: 'No readable text was supplied for this file. Paste the document text to run extraction.',
        needsText: true
      }, { status: 422 });
    }

    const schema = {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Readable text found in the document' },
        summary: { type: 'string', description: 'One paragraph neutral summary of the document' },
        entities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['Person', 'Organization', 'Vehicle', 'Location', 'Date', 'Reference ID'] },
              value: { type: 'string' },
              snippet: { type: 'string', description: 'Exact quoted text from the source supporting this value' },
              confidence: { type: 'number' }
            },
            required: ['type', 'value', 'snippet']
          }
        },
        relationships: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              to: { type: 'string' },
              type: { type: 'string' },
              snippet: { type: 'string' }
            },
            required: ['from', 'to', 'type', 'snippet']
          }
        }
      },
      required: ['text', 'summary', 'entities']
    };

    const prompt = `You are a careful document-analysis assistant working on a SYNTHETIC demonstration dataset of fictional records.
Extract only information that literally appears in the source. Never invent names, identifiers, dates or relationships. Never speculate about guilt, intent or criminality.
Return every person, organisation, vehicle, location, date and reference identifier you can read, and quote the exact source snippet that supports each value.
Only propose a relationship when the source text explicitly states an association between two extracted values; otherwise return an empty list.
If the document cannot be read, return an empty entity list and say so in the summary.
Document title: ${doc.title || doc.file_name || 'untitled'}
${suppliedText ? `Document text:\n${suppliedText.slice(0, 12000)}` : 'Read the attached document.'}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      ...(fileUrls.length ? { file_urls: fileUrls } : {})
    });

    const entities = Array.isArray(result?.entities) ? result.entities.slice(0, 60) : [];
    const relationships = Array.isArray(result?.relationships) ? result.relationships.slice(0, 20) : [];
    const extractedText = suppliedText || String(result?.text || '').slice(0, 20000);

    const payload = entities
      .filter((e) => e && e.value)
      .map((e) => ({
        document_id,
        investigation_id: doc.investigation_id,
        extraction_type: e.type || 'Text',
        value: String(e.value).slice(0, 240),
        source_snippet: String(e.snippet || '').slice(0, 400),
        confidence: typeof e.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(e.confidence))) : 65,
        review_status: 'Suggested'
      }));

    relationships.forEach((r) => {
      if (!r?.from || !r?.to) return;
      payload.push({
        document_id,
        investigation_id: doc.investigation_id,
        extraction_type: 'Relationship',
        value: `${r.from} → ${r.to} (${r.type})`,
        source_snippet: String(r.snippet || '').slice(0, 400),
        confidence: 60,
        review_status: 'Suggested'
      });
    });

    if (payload.length) {
      await base44.entities.ExtractionResult.bulkCreate(payload);
    }

    await base44.entities.DocumentRecord.update(document_id, {
      extracted_text: extractedText,
      extraction_summary: String(result?.summary || '').slice(0, 2000),
      processing_status: 'Needs Review'
    });

    await writeAudit(base44, {
      event_type: 'document',
      action: 'Document intelligence extraction',
      resource_type: 'DocumentRecord',
      resource_id: document_id,
      outcome: 'Success',
      details: `${payload.length} suggestions produced as ${role}`,
      actor_email: user.email
    });

    return Response.json({ suggestions: payload.length, summary: result?.summary || '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}