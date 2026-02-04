// ichimon.js - 一問一答の答え表示制御
document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".toggle");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const answer = btn.nextElementSibling;
      const isVisible = answer.style.display === "block";

      // すべて非表示にしたい場合は以下のコメントアウトを外す
      // document.querySelectorAll(".answer").forEach(a => a.style.display = "none");

      if (isVisible) {
        answer.style.display = "none";
        btn.textContent = "答えを表示";
      } else {
        answer.style.display = "block";
        btn.textContent = "答えを隠す";
      }
    });
  });
});
