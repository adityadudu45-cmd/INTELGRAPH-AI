import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { getSessionUser, writeAudit, jsonError } from '../../shared/access.ts';

const DEMO_ENTITIES = [
  'Investigation', 'EntityRecord', 'RelationshipRecord', 'DocumentRecord', 'EvidenceRecord',
  'TimelineEvent', 'AnalystNote', 'DataImport', 'ExtractionResult', 'PatternObservation',
  'AnalysisReport', 'AuditLog'
];

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await getSessionUser(base44);
    if (!user) return jsonError('Unauthorized', 401);
    if (user.role !== 'admin') {
      await writeAudit(base44, {
        event_type: 'dataset', action: 'Reset demonstration dataset', resource_type: 'DemoDataset',
        outcome: 'Denied', details: 'Requires administrator role', actor_email: user.email
      });
      return jsonError('Administrator access is required to reset the demonstration dataset.', 403);
    }

    for (const name of DEMO_ENTITIES) {
      await base44.asServiceRole.entities[name].deleteMany({});
    }

    const cases = await base44.asServiceRole.entities.Investigation.bulkCreate([
      {
        case_code: 'IG-2026-014',
        title: 'Harbour Point freight movement review',
        summary: 'Synthetic review of reported freight activity around Harbour Point Depot. All names, plates, numbers and events are invented for demonstration.',
        status: 'Active',
        priority: 'Medium',
        analyst_emails: [user.email],
        opened_date: '2026-04-08',
        tags: ['demo', 'freight', 'observations']
      },
      {
        case_code: 'IG-2026-019',
        title: 'Silverline simulated payment pattern',
        summary: 'Simulated transaction metadata used to demonstrate pattern detection and entity resolution on fictional records.',
        status: 'Under Review',
        priority: 'Low',
        analyst_emails: [user.email],
        opened_date: '2026-06-21',
        tags: ['demo', 'transactions']
      },
      {
        case_code: 'IG-2026-022',
        title: 'Northgate observation set',
        summary: 'Completed demonstration case built from fictional surveillance-style observation summaries at a made-up commercial site.',
        status: 'Completed',
        priority: 'Low',
        analyst_emails: [user.email],
        opened_date: '2026-02-14',
        tags: ['demo', 'observations', 'closed']
      }
    ]);

    const [c1, c2, c3] = cases;

    const entityRows = [
      ['Maren Voss', 'Individual', 'SYN-ID-4417', 'Fictional site supervisor referenced in the Harbour Point summaries.', 'Synth incident summary FIR-014-A'],
      ['Teodor Kral', 'Individual', 'SYN-ID-4418', 'Fictional logistics coordinator named in two invented observation notes.', 'Synth incident summary FIR-014-A'],
      ['Harbour Point Freight Ltd', 'Organization', 'SYN-ORG-2201', 'Made-up freight operator used throughout the demonstration dataset.', 'Synth report INT-REP-014-1'],
      ['Grey panel van (fictional)', 'Vehicle', 'SYN-88-KLM', 'Invented vehicle plate appearing in three simulated observation entries.', 'Synth observation OBS-014-3'],
      ['Harbour Point Depot, Pier 4', 'Location', 'SYN-LOC-77', 'Fabricated industrial location used for timeline and graph demonstrations.', 'Synth observation OBS-014-1'],
      ['SYN-PH-0192', 'Phone Identifier', 'SYN-PH-0192', 'Simulated interaction identifier appearing in fictional CDR-style metadata.', 'Synth CDR extract CDR-014-2'],
      ['Ilya Renner', 'Individual', 'SYN-ID-5521', 'Fictitious account holder referenced in simulated transaction records.', 'Synth transaction extract TXN-019-A'],
      ['Silverline Consulting', 'Organization', 'SYN-ORG-3310', 'Invented consultancy used to demonstrate organisational associations.', 'Synth transaction extract TXN-019-A'],
      ['SYN-TX-77310', 'Transaction Identifier', 'SYN-TX-77310', 'Synthetic transfer reference repeated across four simulated transactions.', 'Synth transaction extract TXN-019-C'],
      ['Eastbank Arcade kiosk', 'Location', 'SYN-LOC-91', 'Made-up retail kiosk location associated with simulated transactions.', 'Synth transaction extract TXN-019-B'],
      ['SYN-PH-0455', 'Phone Identifier', 'SYN-PH-0455', 'Fictional interaction identifier used in simulated communication metadata.', 'Synth CDR extract CDR-019-1'],
      ['Nadia Belov', 'Individual', 'SYN-ID-6610', 'Invented shift lead named in fiction surveillance-style notes.', 'Synth observation OBS-022-1'],
      ['Otto Fehr', 'Individual', 'SYN-ID-6611', 'Fictional contractor referenced in the same Northgate observation set.', 'Synth observation OBS-022-2'],
      ['White hatchback (fictional)', 'Vehicle', 'SYN-24-QRS', 'Made-up vehicle plate recorded twice in simulated observations.', 'Synth observation OBS-022-2'],
      ['Northgate night shift handover', 'Event', 'SYN-EVT-2205', 'Fictional recurring event used for timeline comparison.', 'Synth observation OBS-022-4']
    ];

    const entityPayload = entityRows.map(([display_label, category, identifier, description, source_reference], i) => ({
      investigation_id: i < 6 ? c1.id : i < 11 ? c2.id : c3.id,
      display_label,
      category,
      identifier,
      description,
      source_reference,
      aliases: [],
      review_status: i % 4 === 0 ? 'Under Review' : 'Verified Sample Record',
      confidence: 70 + ((i * 7) % 25)
    }));

    const entities = await base44.asServiceRole.entities.EntityRecord.bulkCreate(entityPayload);
    const E = Object.fromEntries(entities.map((e) => [e.display_label, e]));
    const id = (label) => E[label].id;

    const relationshipRows = [
      ['Maren Voss', 'Teodor Kral', 'Associated in a sample incident', 'Both fictional individuals appear in the same invented incident summary.', 'Synth incident summary FIR-014-A', 'Confirmed'],
      ['Maren Voss', 'Harbour Point Freight Ltd', 'Organizational association', 'Invented employment link recorded in the synthetic summary.', 'Synth report INT-REP-014-1', 'Confirmed'],
      ['Teodor Kral', 'Harbour Point Freight Ltd', 'Organizational association', 'Fictional coordinator listed against the demo organisation.', 'Synth report INT-REP-014-1', 'Confirmed'],
      ['Maren Voss', 'Grey panel van (fictional)', 'Shared simulated location event', 'Invented observation places both records at Pier 4.', 'Synth observation OBS-014-1', 'Confirmed'],
      ['Teodor Kral', 'SYN-PH-0192', 'Recorded fictional transaction', 'Simulated metadata links the invented identifier to the coordinator.', 'Synth CDR extract CDR-014-2', 'Confirmed'],
      ['SYN-PH-0192', 'Harbour Point Depot, Pier 4', 'Shared simulated location event', 'Synthetic cell-site style entry places the identifier near the fabricated depot.', 'Synth CDR extract CDR-014-2', 'Unverified'],
      ['Grey panel van (fictional)', 'Harbour Point Depot, Pier 4', 'Shared simulated location event', 'Made-up observation log records the vehicle at the depot gate.', 'Synth observation OBS-014-3', 'Confirmed'],
      ['Maren Voss', 'SYN-PH-0192', 'Recorded fictional transaction', 'Simulated call metadata associates the invented number with the supervisor.', 'Synth CDR extract CDR-014-2', 'Unverified'],
      ['Ilya Renner', 'Silverline Consulting', 'Organizational association', 'Fictional record lists the individual as a listed contact of the invented consultancy.', 'Synth transaction extract TXN-019-A', 'Confirmed'],
      ['Ilya Renner', 'SYN-TX-77310', 'Recorded fictional transaction', 'Simulated transfer reference appears against the invented account holder.', 'Synth transaction extract TXN-019-C', 'Confirmed'],
      ['Silverline Consulting', 'SYN-TX-77310', 'Recorded fictional transaction', 'The same synthetic reference is recorded against the made-up organisation.', 'Synth transaction extract TXN-019-C', 'Confirmed'],
      ['Ilya Renner', 'Eastbank Arcade kiosk', 'Shared simulated location event', 'Fabricated kiosk appears in the simulated transaction location field.', 'Synth transaction extract TXN-019-B', 'Unverified'],
      ['Silverline Consulting', 'Eastbank Arcade kiosk', 'Shared simulated location event', 'Made-up organisation is recorded at the same synthetic kiosk location.', 'Synth transaction extract TXN-019-B', 'Unverified'],
      ['Ilya Renner', 'SYN-PH-0455', 'Recorded fictional transaction', 'Simulated interaction metadata associates the invented identifier.', 'Synth CDR extract CDR-019-1', 'Confirmed'],
      ['SYN-PH-0455', 'SYN-TX-77310', 'Shared fictional event', 'Both invented identifiers appear in the same simulated event window.', 'Synth CDR extract CDR-019-1', 'Suggested'],
      ['Nadia Belov', 'Otto Fehr', 'Associated in a sample incident', 'Fictional shift note records both invented individuals at handover.', 'Synth observation OBS-022-1', 'Confirmed'],
      ['Nadia Belov', 'Northgate night shift handover', 'Shared fictional event', 'Made-up event log names the invented shift lead.', 'Synth observation OBS-022-4', 'Confirmed'],
      ['Otto Fehr', 'White hatchback (fictional)', 'Shared simulated location event', 'Fabricated observation records the plate during the same shift.', 'Synth observation OBS-022-2', 'Confirmed'],
      ['White hatchback (fictional)', 'Northgate night shift handover', 'Shared fictional event', 'Simulated observation places the vehicle at the handover window.', 'Synth observation OBS-022-3', 'Unverified'],
      ['Otto Fehr', 'Eastbank Arcade kiosk', 'Other analyst-reviewed relationship', 'Analyst-authored demo link created while exploring the fictional graph.', 'Manual analyst entry', 'Unverified']
    ];

    await base44.asServiceRole.entities.RelationshipRecord.bulkCreate(
      relationshipRows.map(([a, b, type, description, source_reference, verification]) => ({
        investigation_id: E[a].investigation_id,
        source_entity_id: id(a),
        target_entity_id: id(b),
        source_label: a,
        target_label: b,
        relationship_type: type,
        description,
        source_reference,
        verification,
        origin: 'Imported',
        review_status: verification === 'Confirmed' ? 'Verified Sample Record' : 'Under Review',
        confidence: verification === 'Confirmed' ? 88 : verification === 'Suggested' ? 55 : 64
      }))
    );

    const docs = await base44.asServiceRole.entities.DocumentRecord.bulkCreate([
      {
        investigation_id: c1.id,
        title: 'Synthetic incident summary FIR-014-A',
        file_name: 'fir-014-a-demo.txt',
        file_type: 'text/plain',
        category: 'FIR-style incident summary',
        processing_status: 'Completed',
        extracted_text: 'SYNTHETIC DEMONSTRATION RECORD. On 2026-04-02 at 21:40 a grey panel van (plate SYN-88-KLM) was recorded at Harbour Point Depot, Pier 4. Site supervisor Maren Voss (SYN-ID-4417) logged the arrival. Logistics coordinator Teodor Kral (SYN-ID-4418) signed the delivery note for Harbour Point Freight Ltd. No enforcement action is implied; all details are invented.',
        extraction_summary: 'Demo incident narrative with two invented individuals, one made-up organisation, one fabricated vehicle and one location.',
        page_count: 1
      },
      {
        investigation_id: c1.id,
        title: 'Synthetic CDR-style metadata extract CDR-014-2',
        file_name: 'cdr-014-2-demo.csv',
        file_type: 'text/csv',
        category: 'CDR-style interaction metadata',
        processing_status: 'Completed',
        extracted_text: 'SYNTHETIC DEMONSTRATION RECORD. identifier,contact,date,duration_s,cellsite\nSYN-PH-0192,SYN-PH-0455,2026-04-02T21:12,48,SYN-LOC-77\nSYN-PH-0192,SYN-PH-0501,2026-04-03T09:02,15,SYN-LOC-77\nThese rows are generated for demonstration and contain no real communications data.',
        extraction_summary: 'Simulated interaction metadata rows referencing invented identifiers.',
        page_count: 1
      },
      {
        investigation_id: c1.id,
        title: 'Synthetic intelligence report INT-REP-014-1',
        file_name: 'int-rep-014-1-demo.pdf',
        file_type: 'application/pdf',
        category: 'Intelligence report',
        processing_status: 'Needs Review',
        extracted_text: 'SYNTHETIC DEMONSTRATION RECORD. Draft demonstration report describing invented freight movements. Records mention Maren Voss, Teodor Kral and Harbour Point Freight Ltd. Analyst note: contains no verified information and must not be treated as an official report.',
        extraction_summary: 'Fictional report draft listing two invented individuals and one made-up organisation.',
        page_count: 3
      },
      {
        investigation_id: c2.id,
        title: 'Synthetic transaction extract TXN-019',
        file_name: 'txn-019-demo.csv',
        file_type: 'text/csv',
        category: 'Simulated financial transactions',
        processing_status: 'Completed',
        extracted_text: 'SYNTHETIC DEMONSTRATION RECORD. reference,amount,date,location\nSYN-TX-77310,1250.00,2026-06-11,Eastbank Arcade kiosk\nSYN-TX-77310,340.50,2026-06-11,Eastbank Arcade kiosk\nSYN-TX-77310,980.00,2026-06-12,Eastbank Arcade kiosk\nAll amounts and references are invented for pattern-demo purposes.',
        extraction_summary: 'Simulated transaction rows repeating one invented reference code.',
        page_count: 1
      },
      {
        investigation_id: c3.id,
        title: 'Synthetic observation set OBS-022',
        file_name: 'obs-022-demo.txt',
        file_type: 'text/plain',
        category: 'Simulated surveillance observation',
        processing_status: 'Completed',
        extracted_text: 'SYNTHETIC DEMONSTRATION RECORD. 2026-02-10 22:05 shift lead Nadia Belov (SYN-ID-6610) opened the Northgate handover. 2026-02-10 22:40 contractor Otto Fehr (SYN-ID-6611) arrived in a white hatchback (SYN-24-QRS). The event is fictional and included only to demonstrate timeline tooling.',
        extraction_summary: 'Fictional observation narrative with two invented individuals and one made-up vehicle.',
        page_count: 2
      }
    ]);

    const ev = (doc, title, description, entity_ids, status, code) => ({
      investigation_id: doc.investigation_id,
      evidence_code: code,
      title,
      description,
      source: 'Synthetic demonstration dataset',
      document_id: doc.id,
      entity_ids,
      verification_status: status,
      analyst_notes: 'Invented sample record. Not real evidence.',
      version: 1,
      collected_date: '2026-04-02'
    });

    await base44.asServiceRole.entities.EvidenceRecord.bulkCreate([
      ev(docs[0], 'Demo incident summary extract', 'Fictional narrative placing the made-up van at the invented depot.', [id('Maren Voss'), id('Grey panel van (fictional)')], 'Verified Sample Record', 'EVD-014-01'),
      ev(docs[1], 'Simulated interaction metadata rows', 'Invented CDR-style rows associating two synthetic identifiers.', [id('SYN-PH-0192'), id('SYN-PH-0455')], 'Under Review', 'EVD-014-02'),
      ev(docs[2], 'Draft fictional report extract', 'Made-up report draft, retained for review workflow demonstration.', [id('Harbour Point Freight Ltd')], 'Unreviewed', 'EVD-014-03'),
      ev(docs[3], 'Simulated repeated transfer reference', 'Invented reference code repeated in three fabricated transactions.', [id('SYN-TX-77310'), id('Ilya Renner')], 'Verified Sample Record', 'EVD-019-01'),
      ev(docs[4], 'Fictional observation narrative', 'Made-up shift narrative used for the timeline demonstration.', [id('Nadia Belov'), id('Otto Fehr')], 'Under Review', 'EVD-022-01')
    ]);

    const T = (title, time, conf, cat, desc, docIdx, ents) => ({
      investigation_id: docs[docIdx].investigation_id,
      title,
      event_time: time,
      timestamp_confidence: conf,
      event_category: cat,
      description: desc,
      document_id: docs[docIdx].id,
      entity_ids: ents
    });

    await base44.asServiceRole.entities.TimelineEvent.bulkCreate([
      T('Van recorded at depot gate', '2026-04-02T21:40:00', 'Exact', 'Observation', 'Fabricated observation entry for the invented grey panel van.', 0, [id('Grey panel van (fictional)'), id('Harbour Point Depot, Pier 4')]),
      T('Delivery note signed', '2026-04-02T21:52:00', 'Exact', 'Incident', 'Synthetic delivery note signature by the fictional coordinator.', 0, [id('Teodor Kral'), id('Harbour Point Freight Ltd')]),
      T('Simulated interaction SYN-PH-0192', '2026-04-02T21:12:00', 'Exact', 'Communication metadata', 'Invented CDR-style row with a 48 second duration.', 1, [id('SYN-PH-0192'), id('SYN-PH-0455')]),
      T('Simulated interaction at depot cell site', '2026-04-03T09:02:00', 'Approximate', 'Communication metadata', 'Made-up cell site reference for demonstration only.', 1, [id('SYN-PH-0192')]),
      T('Fictional report drafted', '2026-04-05T10:15:00', 'Exact', 'Document', 'Demo report draft produced for the review workflow.', 2, [id('Harbour Point Freight Ltd')]),
      T('Repeated simulated transfer', '2026-06-11T13:20:00', 'Exact', 'Transaction', 'Invented transfer using a repeated synthetic reference.', 3, [id('SYN-TX-77310'), id('Ilya Renner')]),
      T('Second simulated transfer', '2026-06-11T18:44:00', 'Exact', 'Transaction', 'Second invented transfer at the same fictional kiosk.', 3, [id('SYN-TX-77310'), id('Eastbank Arcade kiosk')]),
      T('Third simulated transfer', '2026-06-12T11:05:00', 'Approximate', 'Transaction', 'Third fabricated transfer, timestamped approximately.', 3, [id('SYN-TX-77310')]),
      T('Northgate handover opened', '2026-02-10T22:05:00', 'Exact', 'Observation', 'Invented shift handover entry naming the fictional shift lead.', 4, [id('Nadia Belov')]),
      T('Contractor arrival (time not recorded)', '', 'Unknown', 'Observation', 'Fictional arrival noted without a timestamp in the source.', 4, [id('Otto Fehr'), id('White hatchback (fictional)')])
    ]);

    await base44.asServiceRole.entities.DataImport.bulkCreate([
      { investigation_id: c1.id, file_name: 'fir-014-a-demo.csv', category: 'FIR-style incident summary', status: 'Imported', total_records: 12, imported_records: 12, failed_records: 0, duplicate_records: 0, mapping_json: '{"label":"subject","identifier":"ref"}', errors_json: '[]' },
      { investigation_id: c2.id, file_name: 'txn-019-demo.csv', category: 'Simulated financial transactions', status: 'Imported', total_records: 24, imported_records: 21, failed_records: 2, duplicate_records: 1, mapping_json: '{"label":"reference","identifier":"reference"}', errors_json: '[{"row":7,"reason":"Missing reference"},{"row":9,"reason":"Invalid amount"}]' }
    ]);

    await base44.asServiceRole.entities.AnalystNote.bulkCreate([
      { investigation_id: c1.id, content: 'Demonstration note: the synthetic narrative places the invented van at the depot twice. No conclusion is drawn about any person.', note_type: 'General note', author_name: user.full_name || 'Analyst' },
      { investigation_id: c2.id, content: 'Review decision: the repeated synthetic reference is retained as a demonstration of pattern detection, not as evidence of wrongdoing.', note_type: 'Review decision', author_name: user.full_name || 'Analyst' },
      { investigation_id: c3.id, content: 'Case completed for demonstration. One event has no recorded timestamp and is flagged as uncertain in the timeline.', note_type: 'Conclusion', author_name: user.full_name || 'Analyst' }
    ]);

    await base44.asServiceRole.entities.PatternObservation.bulkCreate([
      {
        investigation_id: c2.id,
        title: 'Repeated synthetic transaction reference',
        dataset: 'Simulated financial transactions',
        detection_method: 'Frequency count of the reference field across imported simulated transactions',
        explanation: 'The invented reference SYN-TX-77310 appears in three fabricated transactions within a 22 hour window at the same fictional location. Repetition of a reference code is common in synthetic data and may reflect how the sample was generated.',
        confidence: 'Medium',
        confidence_note: 'Based on three synthetic rows only.',
        limitations: 'Sample data is invented; no conclusion about any person or organisation is supported.',
        supporting_record_ids: [docs[3].id],
        review_status: 'Unreviewed',
        generated_by: 'Rule-based demonstration scan'
      },
      {
        investigation_id: c1.id,
        title: 'Repeated simulated location event',
        dataset: 'CDR-style simulated interaction metadata',
        detection_method: 'Count of distinct synthetic identifiers per fictional location',
        explanation: 'Two invented identifiers share the fabricated depot cell site reference SYN-LOC-77 across two simulated days.',
        confidence: 'Low',
        confidence_note: 'Two rows, one location, no triangulation possible in the sample.',
        limitations: 'Cell site references in this dataset are invented and coarse.',
        supporting_record_ids: [docs[1].id],
        review_status: 'Acknowledged',
        generated_by: 'Rule-based demonstration scan'
      },
      {
        investigation_id: c3.id,
        title: 'Event without a recorded timestamp',
        dataset: 'Simulated surveillance observation',
        detection_method: 'Null/blank timestamp check across timeline events',
        explanation: 'One fictional observation entry has no timestamp. The timeline shows it as uncertain rather than inventing a time.',
        confidence: 'High',
        confidence_note: 'Directly verifiable against the stored source text.',
        limitations: 'Absence of a timestamp is a data-quality observation, not an inference about events.',
        supporting_record_ids: [docs[4].id],
        review_status: 'Unreviewed',
        generated_by: 'Rule-based demonstration scan'
      },
      {
        investigation_id: c1.id,
        title: 'Structurally central node in the fictional graph',
        dataset: 'Recorded relationships',
        detection_method: 'Degree centrality comparison across the demonstration graph',
        explanation: 'One invented entity has more recorded relationships than any other in the demo graph, which is a structural observation only.',
        confidence: 'Medium',
        confidence_note: 'Depends entirely on which synthetic edges were supplied.',
        limitations: 'Centrality does not indicate influence, guilt or risk.',
        supporting_record_ids: [],
        review_status: 'Unreviewed',
        generated_by: 'Rule-based demonstration scan'
      }
    ]);

    await writeAudit(base44, {
      event_type: 'dataset', action: 'Reset demonstration dataset', resource_type: 'DemoDataset',
      resource_id: '', outcome: 'Success',
      details: '3 cases, 15 entities, 20 relationships, 10 events, 5 documents created',
      actor_email: user.email
    });

    return Response.json({
      success: true,
      counts: {
        cases: cases.length,
        entities: entities.length,
        relationships: relationshipRows.length,
        events: 10,
        documents: docs.length
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}