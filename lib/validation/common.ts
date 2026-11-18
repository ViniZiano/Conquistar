import { ValidationError } from "@/lib/http/errors";

export const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
export const textValue = (value: unknown) => String(value ?? "").trim();
export const boolValue = (value: unknown, fallback = true) => typeof value === "boolean" ? value : fallback;
export function required(value: unknown, label: string) { const result = textValue(value); if (!result) throw new ValidationError(`${label} é obrigatório.`); return result; }
export function validEmail(value: unknown, label = "E-mail") {
  const email = required(value, label).toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.includes("..")) throw new ValidationError(`Informe um ${label.toLowerCase()} válido.`);
  return email;
}
export function validBirthDate(value: unknown) {
  const date = required(value, "Data de nascimento");
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime()) || parsed > new Date()) throw new ValidationError("Informe uma data de nascimento válida e não futura.");
  return date;
}
