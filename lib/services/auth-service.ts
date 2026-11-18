import type { ChatGPTUser } from "@/app/chatgpt-auth";
import type { Actor } from "@/lib/domain/types";
import { assertPermission } from "@/lib/auth/permissions";
import { hashPassword, sha256, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { AuthenticationError, RateLimitError, ValidationError } from "@/lib/http/errors";
import * as auth from "@/lib/repositories/auth-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";
import { getUser, resolveActor, resolveActiveUserById } from "@/lib/repositories/user-repository";
import { assertTrustedMutation, endSession, issueSession, readSessionActor, requireSessionActor } from "@/lib/auth/session";

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60_000;
const GENERIC_LOGIN_ERROR = "E-mail/usuário ou senha inválidos.";

export async function login(request: Request, payload: Record<string, unknown>) {
  assertTrustedMutation(request);
  const identifier = String(payload.identifier ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(payload.password ?? "");
  if (!identifier || !password || password.length > 128) throw new AuthenticationError(GENERIC_LOGIN_ERROR);
  const rate = await rateContext(request, identifier);
  const attempt = await auth.getLoginAttempt(rate.attemptKey);
  if (attempt?.lockedUntil && asTime(attempt.lockedUntil) > Date.now()) throw new RateLimitError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");

  const credential = await auth.findCredential(identifier);
  const valid = await verifyPassword(password, credential?.passwordHash ?? null);
  if (!credential || !valid || !credential.active) {
    const resetWindow = !attempt || Date.now() - asTime(attempt.windowStartedAt) > WINDOW_MS;
    const failures = resetWindow ? 1 : Number(attempt?.failedCount ?? 0) + 1;
    const lock = failures >= MAX_FAILURES;
    await auth.recordLoginFailure({ ...rate, resetWindow, lock });
    if (credential) await writeAudit(credential.id, "auth.login_failed", "user", credential.id, { locked: lock }, "Uma tentativa de autenticação própria não foi concluída.");
    if (lock) throw new RateLimitError("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    throw new AuthenticationError(GENERIC_LOGIN_ERROR);
  }

  let actor: Actor;
  try { actor = await resolveActiveUserById(credential.id); }
  catch { throw new AuthenticationError(GENERIC_LOGIN_ERROR); }
  await auth.clearLoginAttempt(rate.attemptKey);
  const session = await issueSession(credential.id, request);
  await writeAudit(credential.id, "auth.login_succeeded", "user", credential.id, { method: "password" }, `${actor.name} entrou com credenciais do Conquistar.`);
  return { cookie: session.cookie, next: credential.mustChangePassword ? "/alterar-senha" : "/app" };
}

export async function activateLegacyIdentity(request: Request, identity: ChatGPTUser, payload: Record<string, unknown>) {
  const actor = await resolveActor(identity);
  const password = validateConfirmedPassword(payload);
  const passwordHash = await hashPassword(password);
  await auth.revokeUserSessions(actor.id, "credential_activated");
  await auth.setPasswordCredential(actor.id, passwordHash, false);
  const session = await issueSession(actor.id, request);
  await writeAudit(actor.id, "auth.password_activated", "user", actor.id, { method: "verified_legacy_identity" }, `${actor.name} ativou credenciais próprias do Conquistar.`);
  return { cookie: session.cookie, next: "/app" };
}

export async function changePassword(request: Request, payload: Record<string, unknown>) {
  const sessionActor = await requireSessionActor(request, true);
  const credential = await auth.getCredential(sessionActor.actor.id);
  const currentPassword = String(payload.currentPassword ?? "");
  if (!credential?.passwordHash || !(await verifyPassword(currentPassword, credential.passwordHash))) throw new AuthenticationError("A senha atual não confere.");
  const password = validateConfirmedPassword(payload);
  if (await verifyPassword(password, credential.passwordHash)) throw new ValidationError("A nova senha deve ser diferente da senha atual.");
  const passwordHash = await hashPassword(password);
  await auth.revokeUserSessions(sessionActor.actor.id, "password_changed");
  await auth.setPasswordCredential(sessionActor.actor.id, passwordHash, false);
  const replacement = await issueSession(sessionActor.actor.id, request);
  await writeAudit(sessionActor.actor.id, "auth.password_changed", "user", sessionActor.actor.id, {}, `${sessionActor.actor.name} alterou a própria senha.`);
  return { cookie: replacement.cookie, next: "/app" };
}

export async function setTemporaryPassword(actor: Actor, targetUserId: string, payload: Record<string, unknown>) {
  assertPermission(actor, "users.manage");
  const target = await getUser(targetUserId);
  const password = validateConfirmedPassword(payload);
  const passwordHash = await hashPassword(password);
  await auth.revokeUserSessions(target.id, "password_reset_by_admin");
  await auth.setPasswordCredential(target.id, passwordHash, true);
  await writeAudit(actor.id, "auth.password_reset_by_admin", "user", target.id, { mustChangePassword: true }, `${actor.name} definiu uma senha temporária para ${target.name}.`);
}

export async function logout(request: Request) {
  assertTrustedMutation(request);
  let actor: Actor | null = null;
  try { actor = (await readSessionActor(request))?.actor ?? null; } catch { actor = null; }
  const cookie = await endSession(request);
  if (actor) await writeAudit(actor.id, "auth.logout", "user", actor.id, {}, `${actor.name} encerrou a sessão do Conquistar.`);
  return { cookie };
}

function validateConfirmedPassword(payload: Record<string, unknown>) {
  const password = validateNewPassword(payload.password);
  if (password !== String(payload.confirmPassword ?? "")) throw new ValidationError("A confirmação da senha não confere.");
  return password;
}

async function rateContext(request: Request, identifier: string) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [identifierHash, ipHash] = await Promise.all([sha256(identifier), sha256(ip)]);
  return { attemptKey: await sha256(`${identifierHash}|${ipHash}`), identifierHash, ipHash };
}

function asTime(value: string) {
  const normalized = /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const parsed = Date.parse(normalized); return Number.isFinite(parsed) ? parsed : 0;
}
