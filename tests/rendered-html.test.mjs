import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renderiza o site institucional da Conquistar sem conteúdo do starter", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Conquistar/);
  assert.match(html, /Com trabalho se conquista/);
  assert.match(html, /Sua saúde merece/);
  assert.match(html, /Nosso atendimento/i);
  assert.match(html, /Solicite informações/);
  assert.match(html, /Área da equipe/);
  assert.match(html, /favicon\.svg/);
  assert.match(html, /manifest\.webmanifest/);
  const visibleMarkup = html.replace(/<script\b[\s\S]*?<\/script>/gi, "").replace(/<style\b[\s\S]*?<\/style>/gi, "");
  assert.doesNotMatch(visibleMarkup, />[^<]*(ChatGPT|GPT|Codex)[^<]*</i);
  assert.doesNotMatch(html, /Clínica Vitae|codex-preview|Your site is taking shape|SkeletonPreview/i);
});

test("mantém a área de acesso da equipe em rota separada", async () => {
  const response = await render("/acesso");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Acesse o Conquistar/);
  assert.match(html, /E-mail ou usuário/);
  assert.match(html, /Senha/);
  assert.match(html, /Ativar acesso existente/);
});

test("usa formulário próprio com autenticação real no backend", async () => {
  const source = await readFile(new URL("../components/LoginForm.tsx", import.meta.url), "utf8");
  assert.match(source, /\/api\/auth\/login/);
  assert.match(source, /autoComplete="username"/);
  assert.match(source, /autoComplete="current-password"/);
  assert.doesNotMatch(source, /localStorage|isLoggedIn\s*=\s*true/);
});

test("declara proteção explícita na superfície autenticada", async () => {
  const source = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /requireActor\(undefined, \{ allowPasswordChange: true \}\)/);
  assert.match(source, /redirect\("\/acesso\?session=required"\)/);
});
