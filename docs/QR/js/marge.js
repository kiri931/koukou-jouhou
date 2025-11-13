// progress_footer_analytics.js

window.addEventListener("DOMContentLoaded", () => {

    // --- ▼ アラート表示 --------------------------------------
    alert("これは1T3の展示です。\nあなたが今見ているページは、授業の一環で作成したものになります。");

    // --- ▼ フッター 追加 --------------------------------------
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

    // --- ▼ Google Analytics 読み込み --------------------------
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=G-9HNJKSSQ12";
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', 'G-9HNJKSSQ12');
});
