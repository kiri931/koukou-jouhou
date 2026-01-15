export function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function richTextToHtml(s) {
  // 問題文/解説は「自作前提」だが、静的サイト運用上の安全のため最低限エスケープする。
  return escapeHtml(s).replaceAll("\n", "<br>");
}
