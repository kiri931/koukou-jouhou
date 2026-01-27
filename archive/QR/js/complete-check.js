// complete-check.js
window.addEventListener("DOMContentLoaded", () => {

    // --- ▼ アナリティクス読み込み ------------------------------
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-9HNJKSSQ12";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    gtag("js", new Date());
    gtag("config", "G-9HNJKSSQ12");

    // --- ▼ フィニッシュ到達チェック -----------------------------

    // 進行度を読み取る（progress.js が記録している値）
    const unlockedIndex = Number(localStorage.getItem("unlockedIndex") || 0);

    // ページ構造の順番（progress.js と同じ順番を指定）
    const order = ["start", "gate", "gym", "club", "pool", "finish"];

    // finish のインデックス番号
    const finishIndex = order.indexOf("finish");

    if (finishIndex === -1) {
        console.error("order 内に finish が存在しません");
        return;
    }

    // finishIndex に到達しているか？
    if (unlockedIndex < finishIndex) {
        // 未到達 → 失敗ページへ移動
        window.location.href = "check-failure.html";
        return;
    }

    // 到達済み → 現在のページをそのまま表示（何もしない）
    console.log("finish まで到達済み。ページ表示を許可します。");
});
