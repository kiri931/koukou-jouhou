export function nowIso() {
  return new Date().toISOString();
}

export function fmtDateTimeLocal(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP');
  } catch {
    return iso;
  }
}

export function parseDateInputToIso(yyyyMmDd) {
  // date input is local date; store as ISO at midnight local
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 0, 0, 0, 0);
  return dt.toISOString();
}
