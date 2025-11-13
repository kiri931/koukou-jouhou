// progress.js
window.addEventListener("DOMContentLoaded", () => {

    // --- ▼ アナリティクス読み込み ------------------------------
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-9HNJKSSQ12";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-9HNJKSSQ12');

    // --- ▼ ページ進行管理 ---------------------------------------

    const page = document.body.dataset.page;
    if (!page) {
        console.error("data-page が設定されていません");
        return;
    }

    const order = ["start", "gate", "gym", "club", "pool", "finish"];
    const currentIndex = order.indexOf(page);

    if (currentIndex === -1) {
        console.error("ページ名 " + page + " が order 配列にありません");
        return;
    }

    // 保存されている進行状況 → 到達した最大ページ index
    const unlockedIndex = Number(localStorage.getItem("unlockedIndex") || 0);

    // --- 順番を飛ばして来た場合 -----------------------------------
    if (currentIndex > unlockedIndex) {

        alert(
            "まだこのページには進めません。\n" 
        );

        let index = unlockedIndex - 1;

        // 0 未満にならないよう安全処理
        if (index < 0) index = 0;

        const backPage = order[index];


        window.location.href = backPage + ".html";
        return;
    }

    // --- 正しい順序で進んだ場合 → 進捗を更新 ----------------------
    if (currentIndex === unlockedIndex) {
        localStorage.setItem("unlockedIndex", currentIndex + 1);
    }
});
