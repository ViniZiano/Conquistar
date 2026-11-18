import { env } from "cloudflare:workers";
import { ensureDatabase, getRawDb } from "@/db";
import { hashPassword, validateNewPassword } from "@/lib/auth/password";
import { assertTrustedMutation, issueSession } from "@/lib/auth/session";
import { AuthenticationError, ConflictError, errorResponse, privateJson, ValidationError } from "@/lib/http/errors";

function isLocalRequest(request: Request) {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function secureEquals(left: string, right: string) {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index] ?? 0) ^ (b[index] ?? 0);
  return difference === 0;
}

export async function POST(request: Request) {
  try {
    assertTrustedMutation(request);
    if (!isLocalRequest(request)) throw new AuthenticationError("A configuração inicial só pode ser feita no computador local.");

    const configuredToken = (env as typeof env & { CONQUISTAR_BOOTSTRAP_TOKEN?: string }).CONQUISTAR_BOOTSTRAP_TOKEN ?? "";
    if (configuredToken.length < 32) throw new AuthenticationError("O token local de configuração não foi definido corretamente.");

    const payload = await request.json() as Record<string, unknown>;
    const suppliedToken = String(payload.token ?? "");
    if (!secureEquals(suppliedToken, configuredToken)) throw new AuthenticationError("Token de configuração inválido.");

    const name = String(payload.name ?? "").trim().replace(/\s+/g, " ");
    const email = String(payload.email ?? "").trim().toLowerCase();
    if (name.length < 2 || name.length > 120) throw new ValidationError("Informe um nome entre 2 e 120 caracteres.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Informe um e-mail válido.");
    const password = validateNewPassword(payload.password);
    if (password !== String(payload.confirmPassword ?? "")) throw new ValidationError("A confirmação da senha não confere.");

    await ensureDatabase();
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    const auditId = crypto.randomUUID();
    const statements = await getRawDb().batch([
      getRawDb().prepare(`INSERT INTO users (id, name, email, password_hash, password_updated_at, must_change_password, role, active)
        SELECT ?, ?, ?, ?, CURRENT_TIMESTAMP, 0, 'admin', 1 WHERE NOT EXISTS (SELECT 1 FROM users)`)
        .bind(userId, name, email, passwordHash),
      getRawDb().prepare(`INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, actor_role, summary)
        SELECT ?, id, 'auth.bootstrap_created', 'user', id, '{}', role, ? FROM users WHERE id = ?`)
        .bind(auditId, "Primeiro administrador criado no ambiente local.", userId),
    ]);
    const insertedCount = Number((statements[0] as { meta?: { changes?: number } } | undefined)?.meta?.changes ?? 0);
    if (insertedCount !== 1) throw new ConflictError("Já existe um usuário cadastrado. O cadastro inicial foi bloqueado.");

    const session = await issueSession(userId, request);
    return privateJson({ next: "/app" }, { status: 201, headers: { "set-cookie": session.cookie } });
  } catch (error) {
    return errorResponse(error);
  }
}
