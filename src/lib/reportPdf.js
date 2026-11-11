import { jsPDF } from 'jspdf';

function wrap(doc, text, maxWidth) {
  return doc.splitTextToSize(String(text || ''), maxWidth);
}

export function exportReportPdf(report, sections) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 48;
  const width = doc.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const newPage = () => { doc.addPage(); y = margin; };
  const space = (n) => { if (y + n > pageHeight - margin) newPage(); };

  const heading = (text) => {
    space(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(String(text).toUpperCase(), margin, y);
    y += 6;
    doc.setDrawColor(180);
    doc.line(margin, y, margin + width, y);
    y += 14;
  };

  const body = (text, size = 10) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    const lines = wrap(doc, text, width);
    lines.forEach((line) => {
      space(size + 4);
      doc.text(line, margin, y);
      y += size + 4;
    });
    y += 4;
  };

  const list = (items, prefix = '· ') => {
    (items || []).forEach((item) => body(`${prefix}${item}`, 9));
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(String(report.title || 'Analytical report'), margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(`Version ${report.version || 1} · ${report.status || 'Draft'} · generated ${new Date(report.created_date || Date.now()).toLocaleString('en-GB')}`, margin, y);
  doc.setTextColor(0);
  y += 22;

  body(sections.disclaimer || '', 9);

  heading('Case');
  body(`${sections.case?.code} — ${sections.case?.title}`, 11);
  if (sections.case?.summary) body(sections.case.summary, 9);
  body(`Status: ${sections.case?.status} · Priority: ${sections.case?.priority || 'Low'} · Opened: ${sections.case?.opened_date || '—'}`, 9);
  if (sections.case?.analysts?.length) body(`Assigned analysts: ${sections.case.analysts.join(', ')}`, 9);

  if (sections.ai_summary) {
    heading('Draft analytical summary');
    body(sections.ai_summary, 9);
  }

  heading('Record counts');
  Object.entries(sections.stats || {}).forEach(([key, value]) => body(`${key.replace(/_/g, ' ')}: ${value}`, 9));

  if (sections.data_sources?.length) {
    heading('Data sources');
    sections.data_sources.forEach((d) => body(`${d.title} (${d.category}) — ${d.status}`, 9));
  }

  if (sections.entities?.length) {
    heading('Entities');
    sections.entities.forEach((e) => body(`${e.label} — ${e.category}${e.identifier ? ` · ${e.identifier}` : ''} · ${e.status}`, 9));
  }

  if (sections.relationships?.length) {
    heading('Relationships');
    sections.relationships.forEach((r) => body(`${r.source} → ${r.target} · ${r.type} · ${r.verification} · source: ${r.source_reference || '—'}`, 9));
  }

  if (sections.timeline?.length) {
    heading('Timeline');
    sections.timeline.forEach((t) => body(`${t.time ? new Date(t.time).toLocaleString('en-GB') : 'Timestamp unknown'} — ${t.title} (${t.category}, ${t.confidence})`, 9));
  }

  if (sections.patterns?.length) {
    heading('Pattern observations');
    sections.patterns.forEach((p) => {
      body(`${p.title} — ${p.confidence} confidence · ${p.review_status || 'Unreviewed'}`, 10);
      body(`Method: ${p.method}`, 9);
      body(p.explanation, 9);
      if (p.limitations) body(`Limitations: ${p.limitations}`, 9);
    });
  }

  if (sections.evidence?.length) {
    heading('Evidence register');
    sections.evidence.forEach((v) => body(`${v.code || '—'} · ${v.title} · ${v.status} · source: ${v.source || '—'}`, 9));
  }

  if (sections.analyst_notes?.length) {
    heading('Analyst notes');
    sections.analyst_notes.forEach((n) => body(`[${n.type}] ${n.content}`, 9));
  }

  if (sections.methodology?.length) {
    heading('Methodology');
    list(sections.methodology);
  }

  if (sections.limitations?.length) {
    heading('Limitations');
    list(sections.limitations);
  }

  doc.save(`${String(report.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-v${report.version || 1}.pdf`);
}