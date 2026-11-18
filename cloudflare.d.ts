interface D1Result<T = Record<string, unknown>> { results: T[] }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}
interface Fetcher { fetch(input: Request): Promise<Response> }
declare module "cloudflare:workers" { export const env: { DB: D1Database; FILES: R2Bucket } }
