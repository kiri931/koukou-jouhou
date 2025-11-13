// progress.js
window.addEventListener("DOMContentLoaded", () => {

    // --- ▼ アナリティクス読み込み ------------------------------
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-9HNJKSSQ12";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-9HNJKSSQ12');

    // --- ▼ ページ進行管理 ---------------------------------------

    // ページIDを body の data-page 属性から取得する
    const page = document.body.dataset.page;

    if (!page) {
        console.error("data-page が設定されていません");
        return;
    }

    // ページ順のリスト（順番を変える場合はここだけ変更）
    const order = ["start", "gate", "gym", "club", "pool","finish"];

    // 現在のページが何番目か
    const currentIndex = order.indexOf(page);

    if (currentIndex === -1) {
        console.error("ページ名 " + page + " が order 配列にありません");
        return;
    }

    // localStorage に保存されている開放済みページ番号（初回は 0）
    const unlockedIndex = Number(localStorage.getItem("unlockedIndex") || 0);

    // --- 順番を飛ばした場合 -------------------------------------
    if (currentIndex > unlockedIndex) {
        alert(
            "まだこのページには進めません。\n" +
            "前のQRコード（" + order[unlockedIndex] + "）を読み取ってください。"
        );

        // 前のページへ戻す
        window.location.href = "/QR/story/" + order[unlockedIndex] + ".html";
        return;
    }

    // --- 正しい順番なら進行度を更新 ------------------------------
    if (currentIndex === unlockedIndex) {
        localStorage.setItem("unlockedIndex", currentIndex + 1);
    }
});
