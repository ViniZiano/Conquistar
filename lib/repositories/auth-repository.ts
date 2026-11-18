import { ensureDatabase, getRawDb } from "@/db";
import type { Role } from "@/lib/domain/types";

export type CredentialRow = {
  id: string; name: string; email: string; username: string | null; role: Role; active: number;
  passwordHash: string | null; mustChangePassword: number;
};

export async function findCredential(identifier: string) {
  await ensureDatabase();
  return getRawDb().prepare(`SELECT id, name, email, username, role, active, password_hash AS passwordHash,
    must_change_password AS mustChangePassword FROM users
    WHERE lower(email) = lower(?) OR lower(username) = lower(?) LIMIT 1`).bind(identifier, identifier).first<CredentialRow>();
}

export async function getCredential(userId: string) {
  await ensureDatabase();
  return getRawDb().prepare(`SELECT id, name, email, username, role, active, password_hash AS passwordHash,
    must_change_password AS mustChangePassword FROM users WHERE id = ?`).bind(userId).first<CredentialRow>();
}

export async function setPasswordCredential(userId: string, passwordHash: string, mustChangePassword: boolean) {
  await ensureDatabase();
  await getRawDb().prepare(`UPDATE users SET password_hash = ?, password_updated_at = CURRENT_TIMESTAMP,
    must_change_password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(passwordHash, mustChangePassword ? 1 : 0, userId).run();
}

export async function createSession(input: { userId: string; tokenHash: string; userAgentHash: string; ipHash: string; expiresAt: string }) {
  await ensureDatabase();
  const id = crypto.randomUUID();
  await getRawDb().prepare(`INSERT INTO auth_sessions
    (id, user_id, token_hash, user_agent_hash, ip_hash, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(id, input.userId, input.tokenHash, input.userAgentHash, input.ipHash, input.expiresAt).run();
  return id;
}

export async function findActiveSession(tokenHash: string) {
  await ensureDatabase();
  return getRawDb().prepare(`SELECT id, user_id AS userId, expires_at AS expiresAt, last_seen_at AS lastSeenAt
    FROM auth_sessions WHERE token_hash = ? AND revoked_at IS NULL AND datetime(expires_at) > datetime('now') LIMIT 1`)
    .bind(tokenHash).first<{ id: string; userId: string; expiresAt: string; lastSeenAt: string }>();
}

export async function touchSession(sessionId: string) {
  await getRawDb().prepare(`UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP
    WHERE id = ? AND datetime(last_seen_at) < datetime('now', '-5 minutes')`).bind(sessionId).run();
}

export async function revokeSession(tokenHash: string, reason: string) {
  await ensureDatabase();
  await getRawDb().prepare(`UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = ?
    WHERE token_hash = ? AND revoked_at IS NULL`).bind(reason, tokenHash).run();
}

export async function revokeUserSessions(userId: string, reason: string) {
  await ensureDatabase();
  await getRawDb().prepare(`UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP, revocation_reason = ?
    WHERE user_id = ? AND revoked_at IS NULL`).bind(reason, userId).run();
}

export async function cleanupSessions() {
  await ensureDatabase();
  await getRawDb().prepare(`DELETE FROM auth_sessions WHERE datetime(expires_at) <= datetime('now', '-7 days')
    OR datetime(revoked_at) <= datetime('now', '-30 days')`).run();
}

export async function getLoginAttempt(attemptKey: string) {
  await ensureDatabase();
  return getRawDb().prepare(`SELECT failed_count AS failedCount, window_started_at AS windowStartedAt,
    locked_until AS lockedUntil FROM auth_login_attempts WHERE attempt_key = ?`).bind(attemptKey)
    .first<{ failedCount: number; windowStartedAt: string; lockedUntil: string | null }>();
}

export async function recordLoginFailure(input: { attemptKey: string; identifierHash: string; ipHash: string; resetWindow: boolean; lock: boolean }) {
  await ensureDatabase();
  await getRawDb().prepare(`INSERT INTO auth_login_attempts
    (attempt_key, identifier_hash, ip_hash, failed_count, window_started_at, locked_until, last_attempt_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(attempt_key) DO UPDATE SET
      failed_count = CASE WHEN ? = 1 THEN 1 ELSE failed_count + 1 END,
      window_started_at = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE window_started_at END,
      locked_until = ?, last_attempt_at = CURRENT_TIMESTAMP`)
    .bind(input.attemptKey, input.identifierHash, input.ipHash, input.lock ? futureMinutes(15) : null,
      input.resetWindow ? 1 : 0, input.resetWindow ? 1 : 0, input.lock ? futureMinutes(15) : null).run();
}

export async function clearLoginAttempt(attemptKey: string) {
  await ensureDatabase();
  await getRawDb().prepare("DELETE FROM auth_login_attempts WHERE attempt_key = ?").bind(attemptKey).run();
}

function futureMinutes(minutes: number) { return new Date(Date.now() + minutes * 60_000).toISOString(); }
