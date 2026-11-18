import { ValidationError } from "@/lib/http/errors";

const ALGORITHM = "pbkdf2-sha256";
// workerd rejects PBKDF2 requests above 100,000 iterations. Keep this value
// explicit so hashes produced locally remain deployable on the Sites runtime.
const ITERATIONS = 100_000;
const KEY_BYTES = 32;
const SALT_BYTES = 16;

export function validateNewPassword(value: unknown) {
  const password = String(value ?? "");
  if (password.length < 12 || password.length > 128) throw new ValidationError("Use uma senha entre 12 e 128 caracteres.");
  const groups = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length;
  if (groups < 3) throw new ValidationError("Combine ao menos três grupos: minúsculas, maiúsculas, números e símbolos.");
  return password;
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(derived)}`;
}

export async function verifyPassword(password: string, encoded: string | null) {
  const parsed = parseHash(encoded);
  if (!parsed) {
    await derive(password.slice(0, 128), new Uint8Array(SALT_BYTES).fill(17), ITERATIONS);
    return false;
  }
  const actual = await derive(password.slice(0, 128), parsed.salt, parsed.iterations);
  return constantTimeEqual(actual, parsed.hash);
}

function parseHash(value: string | null) {
  if (!value) return null;
  const [algorithm, iterationsText, saltText, hashText, ...rest] = value.split("$");
  const iterations = Number(iterationsText);
  if (rest.length || algorithm !== ALGORITHM || iterations !== ITERATIONS) return null;
  try {
    const salt = fromBase64Url(saltText); const hash = fromBase64Url(hashText);
    if (salt.length < 16 || hash.length !== KEY_BYTES) return null;
    return { iterations, salt, hash };
  } catch { return null; }
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, material, KEY_BYTES * 8);
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function toBase64Url(value: Uint8Array) {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded); const result = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) result[index] = binary.charCodeAt(index);
  return result;
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}
