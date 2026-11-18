export class AuthenticationError extends Error { status = 401; }
export class RateLimitError extends Error { status = 429; }
export class ValidationError extends Error { status = 400; }
export class ConflictError extends Error { status = 409; }
export class NotFoundError extends Error { status = 404; }
export function privateJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers); headers.set("cache-control", "private, no-store"); headers.set("x-content-type-options", "nosniff");
  return Response.json(data, { ...init, headers });
}
export function errorResponse(error: unknown) {
  const declaredStatus = error && typeof error === "object" && "status" in error ? Number(error.status) : 0;
  const status = [400, 401, 403, 404, 409, 429].includes(declaredStatus) ? declaredStatus : 500;
  const message = status === 500 ? "Não foi possível concluir a operação." : (error as Error).message;
  return privateJson({ error: message }, { status });
}
