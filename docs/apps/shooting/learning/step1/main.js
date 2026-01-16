const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Step1 では「キャンバスの枠が出る」ことが目的なので
// 黒い背景を塗って、画面が表示されていることを確認します。
ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);
