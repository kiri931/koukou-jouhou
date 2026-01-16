// 左右移動（押しっぱなし）＋Uキー（1回入力）
export const input = {
  left: false,
  right: false,
  upgradePressed: false,
};

export function initInput() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") input.left = true;
    if (e.key === "ArrowRight") input.right = true;

    if ((e.key === "u" || e.key === "U") && !e.repeat) {
      input.upgradePressed = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") input.left = false;
    if (e.key === "ArrowRight") input.right = false;
  });
}

export function consumeUpgradePressed() {
  const v = input.upgradePressed;
  input.upgradePressed = false;
  return v;
}
