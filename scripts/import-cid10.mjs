import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = resolve(process.argv[2] || "data/official/CID-10-SUBCATEGORIAS-V2008.csv");
const categoryPath = resolve(process.argv.find((value) => value.startsWith("--categories="))?.slice("--categories=".length) || sourcePath.replace("SUBCATEGORIAS", "CATEGORIAS"));
const targetPath = process.argv[3] ? resolve(process.argv[3]) : null;
const append = process.argv.includes("--append");
const bytes = readFileSync(sourcePath);
const categoryBytes = readFileSync(categoryPath);
const decode = (value) => { try { return new TextDecoder("utf-8", { fatal: true }).decode(value); } catch { return new TextDecoder("windows-1252").decode(value); } };

const normalizeSearch = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
const displayCode = (raw) => raw.length > 3 ? `${raw.slice(0, 3)}.${raw.slice(3)}` : raw;
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const recordsByCode = new Map();
const addRecord = ({ rawCode, classificationType = "", sexRestriction = "", mortalityRestriction = "", description, referenceCode = "", excludedCodes = "" }, location) => {
  if (!/^[A-Z][0-9]{2}[0-9A-Z]?$/.test(rawCode) || !description) throw new Error(`Código ou descrição inválidos em ${location}.`);
  const code = displayCode(rawCode);
  recordsByCode.set(code, {
    id: `cid10-datasus-v2008-${rawCode.toLowerCase()}`, code, codeSearch: rawCode,
    description, searchDescription: normalizeSearch(description), category: rawCode.slice(0, 3),
    classificationType, sexRestriction, mortalityRestriction, referenceCode, excludedCodes,
  });
};

const categoryRows = decode(categoryBytes).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
if (categoryRows.shift()?.split(";").slice(0, 6).join(";") !== "CAT;CLASSIF;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS") throw new Error("Cabeçalho oficial de categorias CID-10 inválido.");
categoryRows.forEach((line, index) => {
  const [rawCode, classificationType, description, , referenceCode, excludedCodes] = line.split(";").map((value) => value.trim());
  addRecord({ rawCode, classificationType, description, referenceCode, excludedCodes }, `categorias, linha ${index + 2}`);
});

const subcategoryRows = decode(bytes).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
if (subcategoryRows.shift()?.split(";").slice(0, 8).join(";") !== "SUBCAT;CLASSIF;RESTRSEXO;CAUSAOBITO;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS") throw new Error("Cabeçalho oficial de subcategorias CID-10 inválido.");
subcategoryRows.forEach((line, index) => {
  const [rawCode, classificationType, sexRestriction, mortalityRestriction, description, , referenceCode, excludedCodes] = line.split(";").map((value) => value.trim());
  addRecord({ rawCode, classificationType, sexRestriction, mortalityRestriction, description, referenceCode, excludedCodes }, `subcategorias, linha ${index + 2}`);
});

const records = [...recordsByCode.values()].sort((left, right) => left.codeSearch.localeCompare(right.codeSearch));

if (records.length < 14000) throw new Error(`Importação recusada: apenas ${records.length} códigos foram encontrados; a base oficial completa é esperada.`);

const categorySha256 = createHash("sha256").update(categoryBytes).digest("hex").toUpperCase();
const subcategorySha256 = createHash("sha256").update(bytes).digest("hex").toUpperCase();
const sourceSha256 = createHash("sha256").update(categoryBytes).update(bytes).digest("hex").toUpperCase();
const releaseId = "cid10-datasus-v2008";
const sourceUrl = "http://www2.datasus.gov.br/cid10/V2008/downloads/CID10CSV.zip";
const statements = [
  `INSERT INTO cid_catalog_releases (id, classification, version, source_url, source_sha256, active) VALUES (${quote(releaseId)}, 'CID-10', 'DATASUS V2008', ${quote(sourceUrl)}, ${quote(sourceSha256)}, 1) ON CONFLICT(id) DO UPDATE SET source_url = excluded.source_url, source_sha256 = excluded.source_sha256, active = 1`,
];

for (let index = 0; index < records.length; index += 100) {
  const values = records.slice(index, index + 100).map((record) => `(${[
    record.id, releaseId, record.code, record.codeSearch, record.description, record.searchDescription,
    record.category, "DATASUS V2008", record.classificationType, record.sexRestriction,
    record.mortalityRestriction, record.referenceCode, record.excludedCodes,
  ].map(quote).join(", ")}, 1)`).join(",\n");
  statements.push(`INSERT INTO cid_codes (id, release_id, code, code_search, description, search_description, category, version, classification_type, sex_restriction, mortality_restriction, reference_code, excluded_codes, active) VALUES\n${values}\nON CONFLICT(id) DO UPDATE SET description = excluded.description, search_description = excluded.search_description, category = excluded.category, classification_type = excluded.classification_type, sex_restriction = excluded.sex_restriction, mortality_restriction = excluded.mortality_restriction, reference_code = excluded.reference_code, excluded_codes = excluded.excluded_codes, active = 1`);
}

statements.push("INSERT INTO cid_codes_fts(cid_codes_fts) VALUES('rebuild')");
statements.push("INSERT OR IGNORE INTO encounter_diagnoses (id, encounter_id, cid_id, type) SELECT 'legacy-cid-' || e.id, e.id, c.id, 'other' FROM encounters e JOIN cid_codes c ON c.code_search = UPPER(REPLACE(e.diagnosis_code, '.', '')) AND c.active = 1 WHERE e.diagnosis_code <> ''");
statements.push("UPDATE governance_controls SET title = 'Catálogo oficial CID-10', description = 'Catálogo DATASUS V2008 importado, pesquisável e versionado, com vínculo estruturado a múltiplos diagnósticos por atendimento.', status = 'complete', updated_at = CURRENT_TIMESTAMP WHERE key = 'cid_structured'");
statements.push("PRAGMA optimize");

const sql = `\n-- Catálogo oficial CID-10 DATASUS V2008: ${records.length} códigos; SHA-256 ${sourceSha256}.\n${statements.join(";--> statement-breakpoint\n")};\n`;
if (targetPath) {
  if (append) appendFileSync(targetPath, sql, "utf8"); else writeFileSync(targetPath, sql.trimStart(), "utf8");
}
console.log(JSON.stringify({ classification: "CID-10", version: "DATASUS V2008", records: records.length, sourceSha256, categorySha256, subcategorySha256, target: targetPath, append }, null, 2));
