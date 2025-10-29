export function isColliding(a, b) {
  if (!a || !b) return false; // ← null 安全
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

