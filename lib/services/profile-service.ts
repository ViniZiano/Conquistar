import type { Actor, ThemePreference } from "@/lib/domain/types";
import { ValidationError } from "@/lib/http/errors";
import { required, textValue } from "@/lib/validation/common";
import * as users from "@/lib/repositories/user-repository";
import { writeAudit } from "@/lib/repositories/audit-repository";

const themes = new Set<ThemePreference>(["light", "dark", "system"]);

export async function update(actor: Actor, payload: Record<string, unknown>) {
  const theme = String(payload.theme ?? actor.theme) as ThemePreference;
  if (!themes.has(theme)) throw new ValidationError("Tema inválido.");
  const phone = textValue(payload.phone ?? actor.phone).replace(/\D/g, "");
  if (phone && (phone.length < 10 || phone.length > 11)) throw new ValidationError("Informe um telefone com DDD.");
  const input = {
    name: required(payload.name ?? actor.name, "Nome de exibição"), phone, theme,
    notifyAppointments: typeof payload.notifyAppointments === "boolean" ? payload.notifyAppointments : actor.notifyAppointments,
    notifySystem: typeof payload.notifySystem === "boolean" ? payload.notifySystem : actor.notifySystem,
  };
  await users.updateProfile(actor.id, input);
  await writeAudit(actor.id, "profile.updated", "user", actor.id, { theme }, `${actor.name} atualizou suas preferências pessoais.`);
}
