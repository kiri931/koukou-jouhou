export async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return await res.json();
}

export function assertArray(value, message = "Expected array") {
  if (!Array.isArray(value)) throw new Error(message);
  return value;
}

export function assertObject(value, message = "Expected object") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value;
}
