export const weapon = {
  level: 1,
  maxLevel: 3,
};

const BULLET_SPEED_X = 3;

export function upgradeWeapon() {
  if (weapon.level < weapon.maxLevel) weapon.level++;
}

export function getVxPattern(level = weapon.level) {
  if (level <= 1) return [0];
  if (level === 2) return [-BULLET_SPEED_X, BULLET_SPEED_X];
  return [-BULLET_SPEED_X, 0, BULLET_SPEED_X];
}
