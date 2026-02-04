// analytics.js の中身
const s = document.createElement('script');
s.async = true;
s.src = "https://www.googletagmanager.com/gtag/js?id=G-9HNJKSSQ12";
document.head.appendChild(s);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-9HNJKSSQ12');
