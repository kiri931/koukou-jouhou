// 押しっぱなし入力にするため、キーの状態を持つ
export const input = {
  left: false,
  right: false,
  shoot: false,
};

export function initInput() {
  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") input.left = true;
    if (e.key === "ArrowRight") input.right = true;
    if (e.code === "Space") input.shoot = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft") input.left = false;
    if (e.key === "ArrowRight") input.right = false;
    if (e.code === "Space") input.shoot = false;
  });
}
