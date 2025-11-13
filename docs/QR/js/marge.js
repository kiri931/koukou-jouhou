
window.addEventListener("DOMContentLoaded", () => {
  alert("これは1T3の展示です。\nあなたが今見ているページは、授業の一環で作成したものになります。");
  const footer = document.createElement("footer");
  footer.style.marginTop = "40px";
  footer.style.textAlign = "center";
  footer.style.padding = "20px 0";
  footer.style.fontSize = "14px";
  footer.style.color = "#555";

  const link = document.createElement("a");
  link.href = "../../index.html";
  link.style.color = "#007acc";
  link.style.textDecoration = "none";
  link.textContent = "← トップページへ戻る";

  footer.appendChild(link);
  document.body.appendChild(footer);
});
