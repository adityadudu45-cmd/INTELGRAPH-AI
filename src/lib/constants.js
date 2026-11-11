export const DISCLAIMER = 'Educational demonstration using synthetic data. Not an official investigative report.';

export const CASE_STATUSES = ['Draft', 'Active', 'Under Review', 'Completed', 'Archived'];
export const CASE_PRIORITIES = ['Low', 'Medium', 'High'];
export const REVIEW_STATUSES = ['Unreviewed', 'Under Review', 'Verified Sample Record', 'Rejected', 'Needs Correction'];
export const ENTITY_CATEGORIES = [
  'Individual', 'Organization', 'Vehicle', 'Location',
  'Phone Identifier', 'Transaction Identifier', 'Event'
];
export const RELATIONSHIP_TYPES = [
  'Associated in a sample incident',
  'Shared fictional event',
  'Recorded fictional transaction',
  'Shared simulated location event',
  'Organizational association',
  'Other analyst-reviewed relationship'
];
export const VERIFICATION_STATES = ['Confirmed', 'Unverified', 'Suggested'];
export const IMPORT_CATEGORIES = [
  'FIR-style incident summary',
  'CDR-style interaction metadata',
  'Simulated financial transactions',
  'Simulated surveillance observation',
  'Intelligence report'
];
export const DOC_STATUSES = ['Uploaded', 'Processing', 'Completed', 'Needs Review', 'Failed'];
export const DOC_CATEGORIES = IMPORT_CATEGORIES;
export const EVIDENCE_STATUSES = ['Unreviewed', 'Under Review', 'Verified Sample Record', 'Rejected', 'Needs Correction'];
export const EVENT_CATEGORIES = ['Incident', 'Transaction', 'Communication metadata', 'Observation', 'Meeting', 'Document'];
export const TIMESTAMP_CONFIDENCE = ['Exact', 'Approximate', 'Unknown'];
export const AI_EVENT_TYPES = ['case', 'entity', 'relationship', 'document', 'import', 'evidence', 'report', 'ai', 'dataset', 'auth'];

export const ENTITY_COLORS = {
  Individual: '#ff003c',
  Organization: '#ff6b8a',
  Vehicle: '#a3002a',
  Location: '#ffc2ce',
  'Phone Identifier': '#8a8a93',
  'Transaction Identifier': '#ff1744',
  Event: '#d4d4d8'
};

export const ENTITY_ICON_SHAPE = {
  Individual: 'circle',
  Organization: 'square',
  Vehicle: 'triangle',
  Location: 'diamond',
  'Phone Identifier': 'hex',
  'Transaction Identifier': 'hex',
  Event: 'star'
};

export const RELATIONSHIP_STYLE = {
  'Associated in a sample incident': { dash: '', color: '#ff003c' },
  'Shared fictional event': { dash: '7 4', color: '#ff8098' },
  'Recorded fictional transaction': { dash: '2 4', color: '#ff1744' },
  'Shared simulated location event': { dash: '10 5 2 5', color: '#ffc2ce' },
  'Organizational association': { dash: '', color: '#b3002f' },
  'Other analyst-reviewed relationship': { dash: '4 4', color: '#8a8a93' }
};

export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return 'No timestamp recorded';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'No timestamp recorded';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

export function toList(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

export function downloadCsv(filename, rows) {
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}