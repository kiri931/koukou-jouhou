// return-button.js

function returnToClearedPage() {

    // --- ▼ 保存されている進行状況を取得 -------------------------
    const unlockedIndex = Number(localStorage.getItem("unlockedIndex") || 0);

    // --- ▼ ページ順リスト（progress.js と同じ） -----------------
    const order = ["start", "gate", "gym", "club", "pool", "finish"];

    // 安全に最大値を調整
    const maxIndex = order.length - 1;
    const safeIndex = Math.min(unlockedIndex, maxIndex);

    // 戻るべきページ
    let targetPage;

    if (safeIndex <= 0) {
        targetPage = order[0];  // start に戻す
    } else {
        targetPage = order[safeIndex - 1]; // クリア済みの最後のページ
    }


    // --- ▼ クリア済みページへ移動 -------------------------------
    window.location.href = targetPage + ".html";

}
