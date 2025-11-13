// progress.js
window.addEventListener("DOMContentLoaded", () => {

    // ページIDを body の data-page 属性から取得する
    const page = document.body.dataset.page;

    if (!page) {
        console.error("data-page が設定されていません");
        return;
    }

    // 許可された最大ページ番号（初期値は 1）
    const unlocked = Number(localStorage.getItem("unlocked") || 1);

    // 現在のページ番号
    const current = Number(page);

    // --- チェック処理（順番を飛ばした場合） ---------------------
    if (current > unlocked) {
        alert("まだこのページには進めません。\n" +
              "前のQRコード（" + unlocked + "番）を読み取ってください。");

        // 前のページに戻す
        window.location.href = "/QR/story/" + unlocked + ".html";
        return;
    }

    // --- 正しい順番で進んでいる場合、進行度を更新 ------------
    if (current === unlocked) {
        localStorage.setItem("unlocked", current + 1);
    }
});
