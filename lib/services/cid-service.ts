import type { Actor } from "@/lib/domain/types";
import { assertPermission } from "@/lib/auth/permissions";
import { ValidationError } from "@/lib/http/errors";
import { searchCidCodes } from "@/lib/repositories/cid-repository";

export async function search(actor: Actor, rawQuery: string | null, rawLimit: string | null) {
  assertPermission(actor, "clinical.write");
  const query = (rawQuery ?? "").trim().slice(0, 80);
  if (query.length < 2) throw new ValidationError("Digite ao menos 2 caracteres para pesquisar o CID.");
  const requested = Number(rawLimit ?? 12);
  const limit = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 1), 20) : 12;
  return searchCidCodes(query, limit);
}
