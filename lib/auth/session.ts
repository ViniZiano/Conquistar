import { cookies } from "next/headers";
import { AccessError } from "@/lib/auth/permissions";
import { AuthenticationError } from "@/lib/http/errors";
import { sha256, toBase64Url } from "@/lib/auth/password";
import { createSession, cleanupSessions, findActiveSession, revokeSession, touchSession } from "@/lib/repositories/auth-repository";
import { resolveActiveUserById } from "@/lib/repositories/user-repository";

export const SESSION_COOKIE = "conquistar_session";
const SESSION_HOURS = 8;

export async function readSessionActor(request?: Request) {
  const token = await readSessionToken(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const session = await findActiveSession(tokenHash);
  if (!session) return null;
  const actor = await resolveActiveUserById(session.userId);
  await touchSession(session.id);
  return { actor: { ...actor, authenticationMethod: "password" as const }, tokenHash, sessionId: session.id };
}

export async function requireSessionActor(request: Request, allowPasswordChange = false) {
  const session = await readSessionActor(request);
  if (!session) throw new AuthenticationError("Sua sessão expirou. Entre novamente.");
  assertTrustedMutation(request);
  if (session.actor.mustChangePassword && !allowPasswordChange) throw new AuthenticationError("Atualize sua senha temporária para continuar.");
  return session;
}

export async function issueSession(userId: string, request: Request) {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const userAgentHash = await sha256(request.headers.get("user-agent") ?? "unknown");
  const ipHash = await sha256(clientIp(request));
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60_000).toISOString();
  await cleanupSessions();
  await createSession({ userId, tokenHash, userAgentHash, ipHash, expiresAt });
  return { token, cookie: serializeSessionCookie(token, request) };
}

export async function endSession(request: Request, reason = "logout") {
  const token = await readSessionToken(request);
  if (token) await revokeSession(await sha256(token), reason);
  return clearSessionCookie(request);
}

export function assertTrustedMutation(request: Request) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method.toUpperCase())) return;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) throw new AccessError("A origem desta solicitação não é autorizada.");
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new AccessError("A origem desta solicitação não é autorizada.");
}

async function readSessionToken(request?: Request) {
  if (request) return parseCookie(request.headers.get("cookie") ?? "", SESSION_COOKIE);
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

function serializeSessionCookie(token: string, request: Request) {
  const secure = isSecure(request) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function clearSessionCookie(request: Request) {
  const secure = isSecure(request) ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function isSecure(request: Request) {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function parseCookie(header: string, name: string) {
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=") || null;
  }
  return null;
}
