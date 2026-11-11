import { base44 } from '@/api/base44Client';

export async function logEvent({ action, event_type = 'ui', resource_type = '', resource_id = '', outcome = 'Success', details = '' }) {
  try {
    await base44.entities.AuditLog.create({
      event_type,
      action,
      resource_type,
      resource_id: String(resource_id || ''),
      outcome,
      details,
      actor_email: 'public-demo'
    });
  } catch (_) {
    // Audit failures must never block the visitor's action
  }
}