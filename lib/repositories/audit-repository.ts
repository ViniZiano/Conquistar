import { getRawDb } from "@/db";

export async function writeAudit(userId: string, action: string, entityType: string, entityId: string, details: Record<string, unknown> = {}, summary = "") {
  await getRawDb().prepare("INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, actor_role, summary) SELECT ?, id, ?, ?, ?, ?, role, ? FROM users WHERE id = ?")
    .bind(crypto.randomUUID(), action, entityType, entityId, JSON.stringify(details), summary, userId).run();
}

export type AuditFilters = { from?: string; to?: string; userId?: string; action?: string; entityType?: string; limit?: number };

export async function listAudit(filters: AuditFilters = {}) {
  const clauses: string[] = []; const bindings: Array<string | number> = [];
  if (filters.from) { clauses.push("date(a.created_at) >= date(?)"); bindings.push(filters.from); }
  if (filters.to) { clauses.push("date(a.created_at) <= date(?)"); bindings.push(filters.to); }
  if (filters.userId) { clauses.push("a.user_id = ?"); bindings.push(filters.userId); }
  if (filters.action) { clauses.push("a.action = ?"); bindings.push(filters.action); }
  if (filters.entityType) { clauses.push("a.entity_type = ?"); bindings.push(filters.entityType); }
  const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
  bindings.push(Math.min(Math.max(filters.limit ?? 150, 1), 300));
  const result = await getRawDb().prepare(`SELECT a.id, a.action, a.entity_type AS entityType, a.entity_id AS entityId, a.details, a.actor_role AS actorRole, a.summary, a.created_at AS createdAt, u.name AS userName, u.email AS userEmail FROM audit_logs a JOIN users u ON u.id = a.user_id${where} ORDER BY a.created_at DESC LIMIT ?`).bind(...bindings).all();
  return result.results;
}
