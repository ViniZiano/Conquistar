"use client";

import { useEffect, useState } from "react";
import type { CidSearchResult, DiagnosisType, EncounterDiagnosis } from "./clinic-types";

const diagnosisTypes: Array<{ value: DiagnosisType; label: string }> = [
  { value: "hypothesis", label: "Hipótese diagnóstica" },
  { value: "confirmed", label: "Diagnóstico confirmado" },
  { value: "preexisting", label: "Condição preexistente" },
  { value: "other", label: "Outro" },
];

export function CidAutocomplete({ value, onChange }: { value: EncounterDiagnosis[]; onChange(value: EncounterDiagnosis[]): void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CidSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const response = await fetch(`/api/cid?q=${encodeURIComponent(term)}&limit=12`, { signal: controller.signal });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Não foi possível pesquisar o catálogo CID.");
        setResults((data.results ?? []).filter((item: CidSearchResult) => !value.some((selected) => selected.cidId === item.id)));
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Busca CID indisponível.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, value]);

  function select(result: CidSearchResult) {
    if (value.length >= 12 || value.some((item) => item.cidId === result.id)) return;
    onChange([...value, { ...result, cidId: result.id, type: "hypothesis" }]);
    setQuery(""); setResults([]);
  }
  function changeQuery(next: string) {
    setQuery(next);
    if (next.trim().length < 2) { setResults([]); setLoading(false); setError(""); }
  }

  return <div className="cid-picker">
    <label><span>Diagnóstico / CID</span><div className="cid-search"><i aria-hidden="true">⌕</i><input value={query} onChange={(event) => changeQuery(event.target.value)} placeholder="Pesquisar por doença ou código CID..." autoComplete="off" aria-label="Pesquisar por doença ou código CID" aria-controls="cid-results" /></div></label>
    {query.trim().length >= 2 ? <div id="cid-results" className="cid-results" role="listbox" aria-label="Resultados do catálogo CID">{loading ? <p>Pesquisando no catálogo oficial…</p> : null}{error ? <p className="cid-error">{error}</p> : null}{!loading && !error && !results.length ? <p>Nenhum código correspondente foi encontrado.</p> : null}{results.map((result) => <button type="button" role="option" aria-selected="false" key={result.id} onClick={() => select(result)}><strong>{result.code}</strong><span>{result.description}</span><small>Adicionar</small></button>)}</div> : null}
    <div className="cid-source"><strong>CID-10 · DATASUS V2008</strong><span>Busca oficial sob demanda; o catálogo completo não é carregado no navegador.</span></div>
    <div className="selected-diagnoses"><h4>Diagnósticos deste atendimento <span>{value.length}</span></h4>{value.length ? value.map((diagnosis) => <article key={diagnosis.cidId}><div><strong>{diagnosis.code}</strong><span>{diagnosis.description}</span></div><select aria-label={`Tipo do diagnóstico ${diagnosis.code}`} value={diagnosis.type} onChange={(event) => onChange(value.map((item) => item.cidId === diagnosis.cidId ? { ...item, type: event.target.value as DiagnosisType } : item))}>{diagnosisTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><button type="button" aria-label={`Remover CID ${diagnosis.code}`} onClick={() => onChange(value.filter((item) => item.cidId !== diagnosis.cidId))}>×</button></article>) : <p>Nenhum CID selecionado. Pesquise por nome da condição ou código.</p>}</div>
  </div>;
}

export function diagnosisTypeLabel(value: DiagnosisType) { return diagnosisTypes.find((item) => item.value === value)?.label ?? "Outro"; }
