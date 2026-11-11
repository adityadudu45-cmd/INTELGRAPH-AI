export function toList(result) {
  if (Array.isArray(result)) return result;
  if (result && Array.isArray(result.items)) return result.items;
  return [];
}

export async function getSessionUser(base44) {
  return await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
}

// The application is a public demonstration: visitors have no account, so they act
// as one clearly labelled demo identity. Privileged operations (dataset reset) stay
// gated on a real administrator and never use this fallback.
export const DEMO_ACTOR = {
  id: "public-demo",
  email: "public-demo@intelgraph.local",
  full_name: "Public demo visitor",
  role: "user"
};

export async function getActor(base44) {
  const user = await getSessionUser(base44);
  return user || DEMO_ACTOR;
}

export async function getAppRole(base44, user) {
  if (!user) return "Viewer";
  if (user.role === "admin") return "Administrator";
  const profiles = toList(await base44.entities.UserProfile.filter({ created_by_id: user.id }).catch(() => []));
  return profiles[0]?.app_role || "Analyst";
}

export async function assertCanWrite(base44, user) {
  const role = await getAppRole(base44, user);
  return { role, allowed: role !== "Viewer" };
}

export async function writeAudit(base44, entry) {
  try {
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: entry.event_type || "system",
      action: entry.action,
      resource_type: entry.resource_type || "",
      resource_id: entry.resource_id || "",
      outcome: entry.outcome || "Success",
      details: entry.details || "",
      actor_email: entry.actor_email || ""
    });
  } catch (_) {
    // auditing must never break the operation it records
  }
}

export function jsonError(message, status) {
  return Response.json({ error: message }, { status });
}