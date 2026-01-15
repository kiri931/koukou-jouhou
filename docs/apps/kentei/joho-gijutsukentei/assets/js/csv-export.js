function escapeCsvCell(value) {
  const s = String(value ?? "");
  if (/[\n\r",]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(escapeCsvCell).join(",")).join("\r\n") + "\r\n";
}

export function downloadCsv(filename, rows, { bom = true } = {}) {
  const csv = toCsv(rows);
  const content = bom ? "\ufeff" + csv : csv;
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}
