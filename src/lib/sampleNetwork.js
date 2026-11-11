/**
 * Illustrative sample network for the public homepage demonstration.
 * Entirely fictional entities and relationships — no real people,
 * organisations, vehicles or locations are represented.
 */

export const SAMPLE_NODES = [
  { id: 'n1', label: 'Maren Voss', category: 'Individual', x: 360, y: 210 },
  { id: 'n2', label: 'Harbour Point Logistics', category: 'Organization', x: 540, y: 120 },
  { id: 'n3', label: 'SYN-VEH-4471', category: 'Vehicle', x: 190, y: 130 },
  { id: 'n4', label: 'Berth 12, Sample Port', category: 'Location', x: 620, y: 265 },
  { id: 'n5', label: 'SYN-PH-0192', category: 'Phone Identifier', x: 250, y: 305 },
  { id: 'n6', label: 'SYN-TX-77310', category: 'Transaction Identifier', x: 430, y: 355 },
  { id: 'n7', label: 'Dockside Handover', category: 'Event', x: 520, y: 215 },
  { id: 'n8', label: 'Kestrel Freight Co-op', category: 'Organization', x: 130, y: 235 }
];

export const SAMPLE_EDGES = [
  { id: 'e1', source: 'n1', target: 'n2', type: 'Organizational association', reference: 'SYN-DOC-014 · page 3' },
  { id: 'e2', source: 'n1', target: 'n3', type: 'Shared simulated location event', reference: 'SYN-DOC-021 · row 18' },
  { id: 'e3', source: 'n1', target: 'n5', type: 'Associated in a sample incident', reference: 'SYN-DOC-014 · page 5' },
  { id: 'e4', source: 'n2', target: 'n4', type: 'Shared fictional event', reference: 'SYN-DOC-019 · page 2' },
  { id: 'e5', source: 'n2', target: 'n7', type: 'Shared fictional event', reference: 'SYN-DOC-019 · page 4' },
  { id: 'e6', source: 'n6', target: 'n7', type: 'Recorded fictional transaction', reference: 'SYN-DOC-026 · row 7' },
  { id: 'e7', source: 'n5', target: 'n6', type: 'Recorded fictional transaction', reference: 'SYN-DOC-026 · row 12' },
  { id: 'e8', source: 'n3', target: 'n8', type: 'Organizational association', reference: 'SYN-DOC-021 · row 22' },
  { id: 'e9', source: 'n4', target: 'n7', type: 'Shared simulated location event', reference: 'SYN-DOC-019 · page 6' },
  { id: 'e10', source: 'n8', target: 'n5', type: 'Other analyst-reviewed relationship', reference: 'Analyst note · sample record' }
];

export const SAMPLE_CATEGORY_TONE = {
  Individual: 'hsl(var(--neon))',
  Organization: 'hsl(349 100% 74%)',
  Vehicle: 'hsl(347 100% 36%)',
  Location: 'hsl(344 100% 86%)',
  'Phone Identifier': 'hsl(0 0% 66%)',
  'Transaction Identifier': 'hsl(346 100% 62%)',
  Event: 'hsl(0 0% 88%)'
};