import { getRawDb } from "@/db";

export type CidCodeRecord = { id: string; code: string; description: string; category: string; version: string };

export async function searchCidCodes(query: string, limit: number) {
  const compactCode = query.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const words = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9]+/g) ?? [];
  const ftsQuery = words.map((word) => `"${word.replaceAll('"', '""')}"*`).join(" AND ");
  const db = getRawDb();
  const codePromise = compactCode
    ? db.prepare("SELECT id, code, description, category, version FROM cid_codes WHERE active = 1 AND code_search LIKE ? ORDER BY CASE WHEN code_search = ? THEN 0 ELSE 1 END, code LIMIT ?").bind(`${compactCode}%`, compactCode, limit).all<CidCodeRecord>()
    : Promise.resolve({ results: [] as CidCodeRecord[] });
  let descriptionResults: CidCodeRecord[] = [];
  if (ftsQuery) {
    try {
      descriptionResults = (await db.prepare("SELECT c.id, c.code, c.description, c.category, c.version FROM cid_codes_fts f JOIN cid_codes c ON c.rowid = f.rowid WHERE cid_codes_fts MATCH ? AND c.active = 1 ORDER BY rank, c.code LIMIT ?").bind(ftsQuery, limit).all<CidCodeRecord>()).results;
    } catch {
      const normalized = words.join(" ");
      descriptionResults = (await db.prepare("SELECT id, code, description, category, version FROM cid_codes WHERE active = 1 AND search_description LIKE ? ORDER BY code LIMIT ?").bind(`%${normalized}%`, limit).all<CidCodeRecord>()).results;
    }
  }
  const codeResults = (await codePromise).results;
  return [...codeResults, ...descriptionResults].filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id) === index).slice(0, limit);
}

export async function getActiveCidCodes(ids: string[]) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => "?").join(",");
  const result = await getRawDb().prepare(`SELECT id, code, description, category, version FROM cid_codes WHERE active = 1 AND id IN (${placeholders})`).bind(...ids).all<CidCodeRecord>();
  return result.results;
}
