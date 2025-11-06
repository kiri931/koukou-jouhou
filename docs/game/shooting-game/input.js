export const keys = {};

export function setupInput() {
  document.addEventListener("keydown", e => keys[e.code] = true);
  document.addEventListener("keyup", e => keys[e.code] = false);
}
