function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function verifyStep(step) {
  const token = getParam("token");
  const saved = localStorage.getItem("game_token");

  if (!token || token !== saved) {
    alert("正しい順序でQRを読み取ってください。");
    location.href = "/QR/index.html";
  }
}

function goNext(nextStep) {
  const token = localStorage.getItem("game_token");
  location.href = `/QR/story/${nextStep}.html?token=${token}`;
}
