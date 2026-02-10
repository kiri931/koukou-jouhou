export const CONFIG = {
  pointsToWin: 3,
  maxField: 3,
  startingHand: 6,
  defaultManaMax: 10,
  aiDelayMs: 450,
};

export const DECK_P1 = [
  101, 102, 103, 104, 105, 106, 201, 202, 203, 204,
  205, 206, 301, 302, 303, 304, 401, 402, 403, 208,
];

export const DECK_P2 = [
  107, 108, 109, 110, 111, 112, 201, 202, 203, 207,
  204, 208, 305, 306, 301, 302, 404, 401, 402, 205,
];

let uidCounter = 1;

export function stripJsonComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "");
}

export function shuffle(list) {
  const items = [...list];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function createCharacter(card, turn) {
  return {
    uid: uidCounter += 1,
    card,
    hp: card.hp,
    maxHp: card.hp,
    baseAtk: card.atk,
    equipment: [],
    tempAtkBuff: 0,
    tempBuffTurns: 0,
    summonedTurn: turn,
    hasAttacked: false,
    status: {
      shield: 0,
      stunnedTurns: 0,
      stunnedThisTurn: false,
      evadeNextHit: false,
      canAttackOnSummon: false,
      specialCostMod: 0,
    },
  };
}

export function createPlayer(name, deckIds) {
  return {
    name,
    deck: shuffle(deckIds),
    hand: [],
    field: [],
    grave: [],
    mana: 0,
    power: 0,
    points: 0,
    stadium: null,
  };
}

export function getBalanceDefaults(cardsJson) {
  const defaults = cardsJson.balanceDefaults || {};
  return {
    attackCostPower: defaults.attackCostPower ?? 1,
    counterCostPower: defaults.counterCostPower ?? 1,
    manaPerTurn: defaults.manaPerTurn ?? 1,
    manaMax: defaults.manaMax ?? CONFIG.defaultManaMax,
    powerPerTurn: defaults.powerPerTurn ?? 1,
  };
}

export function drawCard(game, player, count = 1, logMessage) {
  for (let i = 0; i < count; i += 1) {
    if (player.deck.length === 0) {
      logMessage(`${player.name}の山札は空です。`);
      return;
    }
    const cardId = player.deck.shift();
    const card = game.cardsById.get(cardId);
    player.hand.push(card);
  }
}

export function awardPoint(game, playerIndex, points = 1) {
  game.players[playerIndex].points += points;
}

export function checkGameOver(game) {
  const p1 = game.players[0].points;
  const p2 = game.players[1].points;
  if (p1 >= CONFIG.pointsToWin && p2 >= CONFIG.pointsToWin) {
    game.gameOver = "引き分け";
    return true;
  }
  if (p1 >= CONFIG.pointsToWin) {
    game.gameOver = game.players[0].name;
    return true;
  }
  if (p2 >= CONFIG.pointsToWin) {
    game.gameOver = game.players[1].name;
    return true;
  }
  return false;
}

export function applyEndOfTurn(player) {
  player.field.forEach((ch) => {
    ch.hasAttacked = false;
    ch.status.stunnedThisTurn = false;
    if (ch.tempBuffTurns > 0) {
      ch.tempBuffTurns -= 1;
      if (ch.tempBuffTurns === 0) {
        ch.tempAtkBuff = 0;
      }
    }
  });
}

export function applyStartOfTurn(game, player, logMessage) {
  player.mana = Math.min(player.mana + game.balance.manaPerTurn, game.balance.manaMax);
  player.power += game.balance.powerPerTurn;

  if (player.stadium?.effect?.kind === "onTurnStart") {
    applyStadiumOnTurnStart(game, player, player.stadium.effect, logMessage);
  }

  player.field.forEach((ch) => {
    if (ch.status.stunnedTurns > 0) {
      ch.status.stunnedThisTurn = true;
      ch.status.stunnedTurns -= 1;
    }
  });
}

export function applyStadiumOnTurnStart(game, player, effect, logMessage) {
  if (effect.gainPower) {
    player.power += effect.gainPower;
    logMessage(`${player.name}はスタジアム効果でパワー+${effect.gainPower}`);
  }
  if (effect.gainMana) {
    player.mana = Math.min(player.mana + effect.gainMana, game.balance.manaMax);
    logMessage(`${player.name}はスタジアム効果でマナ+${effect.gainMana}`);
  }
  if (effect.healAllAllies) {
    player.field.forEach((ch) => {
      ch.hp = Math.min(ch.maxHp, ch.hp + effect.healAllAllies);
    });
    logMessage(`${player.name}の味方全体を回復（${effect.healAllAllies}）`);
  }
}

export function getGlobalAtkDelta(game) {
  let delta = 0;
  game.players.forEach((player) => {
    if (player.stadium?.effect?.kind === "global") {
      delta += player.stadium.effect.atkDelta || 0;
    }
  });
  return delta;
}

export function getEnemyAuraDelta(game, attackerIndex) {
  const opponent = game.players[1 - attackerIndex];
  let delta = 0;
  opponent.field.forEach((ch) => {
    ch.equipment.forEach((eq) => {
      if (eq.effect.kind === "equipAura" && eq.effect.enemyAtkDelta) {
        delta += eq.effect.enemyAtkDelta;
      }
    });
  });
  return delta;
}

export function calcAttackValue(game, character, ownerIndex) {
  let atk = character.baseAtk + character.tempAtkBuff;
  character.equipment.forEach((eq) => {
    if (eq.effect.kind === "equipBuff") {
      atk += eq.effect.atk || 0;
    }
  });
  atk += getGlobalAtkDelta(game);
  atk += getEnemyAuraDelta(game, ownerIndex);
  return Math.max(0, atk);
}

export function countEquipBonusDamage(character) {
  return character.equipment.reduce((sum, eq) => {
    if (eq.effect.kind === "equipOnHitBonus") {
      return sum + (eq.effect.bonusDamage || 0);
    }
    return sum;
  }, 0);
}

export function applyDamage(target, amount, { piercing = false } = {}) {
  if (amount <= 0) {
    return 0;
  }
  if (target.status.evadeNextHit) {
    target.status.evadeNextHit = false;
    return 0;
  }
  let remaining = amount;
  if (!piercing && target.status.shield > 0) {
    const blocked = Math.min(target.status.shield, remaining);
    target.status.shield -= blocked;
    remaining -= blocked;
  }
  target.hp -= remaining;
  return remaining;
}

export function removeIfDead(game, character, ownerIndex, killerIndex) {
  if (character.hp > 0) {
    return false;
  }
  const owner = game.players[ownerIndex];
  owner.field = owner.field.filter((ch) => ch.uid !== character.uid);
  owner.grave.push(character.card);
  character.equipment.forEach((eq) => owner.grave.push(eq));
  if (killerIndex !== null) {
    awardPoint(game, killerIndex, 1);
  }
  return true;
}

export function checkSimultaneousDeaths(game, attacker, defender, attackerIndex, defenderIndex) {
  const attackerDead = attacker.hp <= 0;
  const defenderDead = defender.hp <= 0;
  if (!attackerDead && !defenderDead) {
    return;
  }

  if (attackerDead && defenderDead) {
    removeIfDead(game, attacker, attackerIndex, null);
    removeIfDead(game, defender, defenderIndex, null);
    awardPoint(game, attackerIndex, 1);
    awardPoint(game, defenderIndex, 1);
    return;
  }

  if (attackerDead) {
    removeIfDead(game, attacker, attackerIndex, defenderIndex);
  }
  if (defenderDead) {
    removeIfDead(game, defender, defenderIndex, attackerIndex);
  }
}

export function getSpecialCost(character) {
  const base = character.card.special?.costPower ?? 0;
  const reduced = base - character.status.specialCostMod;
  return Math.max(1, reduced);
}

export function computeAttackDamage(game, attacker, defender, attackerIndex, useSpecial, logMessage) {
  if (!useSpecial || !attacker.card.special) {
    const baseAtk = calcAttackValue(game, attacker, attackerIndex);
    const bonus = countEquipBonusDamage(attacker);
    return { totalDamage: baseAtk + bonus, piercingDamage: 0 };
  }

  const effect = attacker.card.special.effect;
  const baseAtk = calcAttackValue(game, attacker, attackerIndex);

  switch (effect.kind) {
    case "damageMultiplier":
      return { totalDamage: baseAtk * effect.value, piercingDamage: 0 };
    case "bonusDamage":
      return { totalDamage: baseAtk + effect.value, piercingDamage: 0 };
    case "pierce":
      return { totalDamage: baseAtk + effect.value, piercingDamage: effect.value };
    case "gainShield":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          attacker.status.shield += effect.value;
          logMessage(`${attacker.card.name}がシールドを獲得（${effect.value}）`);
        },
      };
    case "healAlly":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          attacker.hp = Math.min(attacker.maxHp, attacker.hp + effect.value);
          logMessage(`${attacker.card.name}が回復（${effect.value}）`);
        },
      };
    case "assassinateIfWounded":
      if (defender.hp <= effect.thresholdHp) {
        return {
          totalDamage: defender.hp + defender.status.shield,
          piercingDamage: defender.hp,
        };
      }
      return { totalDamage: baseAtk, piercingDamage: 0 };
    case "aoeToAllEnemies":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          const enemy = game.players[1 - attackerIndex];
          enemy.field.forEach((target) => {
            applyDamage(target, effect.value);
            if (target.hp <= 0) {
              removeIfDead(game, target, 1 - attackerIndex, attackerIndex);
            }
          });
          logMessage("全体にダメージ");
        },
      };
    case "damageAndStun":
      return {
        totalDamage: effect.damage,
        piercingDamage: 0,
        sideEffects: () => {
          defender.status.stunnedTurns += effect.stunTurns;
        },
      };
    case "reviveFromGrave":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          const player = game.players[attackerIndex];
          if (player.grave.length === 0 || player.field.length >= CONFIG.maxField) {
            logMessage("墓地から復活できません。");
            return;
          }
          const card = player.grave.pop();
          const revived = createCharacter(card, game.turn);
          revived.hp = effect.hp;
          revived.maxHp = Math.max(revived.maxHp, effect.hp);
          player.field.push(revived);
          logMessage("墓地から復活");
        },
      };
    case "selfBuffAtkThisTurn":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          attacker.tempAtkBuff += effect.value;
          attacker.tempBuffTurns = 1;
          logMessage(`${attacker.card.name}が攻撃力アップ`);
        },
      };
    case "evadeNextHit":
      return {
        totalDamage: 0,
        piercingDamage: 0,
        sideEffects: () => {
          attacker.status.evadeNextHit = true;
          logMessage(`${attacker.card.name}が回避状態`);
        },
      };
    default:
      return { totalDamage: baseAtk, piercingDamage: 0 };
  }
}

export function computeCounterDamage(game, defender, attacker, defenderIndex, mode, logMessage) {
  const defenderPlayer = game.players[defenderIndex];
  if (mode === "none") {
    return { totalDamage: 0, piercingDamage: 0 };
  }
  const useSpecial = mode === "special";
  const cost = useSpecial ? getSpecialCost(defender) : game.balance.counterCostPower;
  if (defenderPlayer.power < cost) {
    logMessage("反撃パワー不足");
    return { totalDamage: 0, piercingDamage: 0 };
  }
  defenderPlayer.power -= cost;
  return computeAttackDamage(game, defender, attacker, defenderIndex, useSpecial, logMessage);
}

export function resolveAttack(game, attacker, defender, attackerIndex, useSpecial, counterMode, logMessage) {
  const attackerPlayer = game.players[attackerIndex];
  const attackCost = useSpecial ? getSpecialCost(attacker) : game.balance.attackCostPower;

  if (attackerPlayer.power < attackCost) {
    logMessage("パワー不足で攻撃できません。");
    return;
  }

  attackerPlayer.power -= attackCost;

  const attackResult = computeAttackDamage(game, attacker, defender, attackerIndex, useSpecial, logMessage);
  const counterResult = computeCounterDamage(game, defender, attacker, 1 - attackerIndex, counterMode, logMessage);

  const attackerDamage = attackResult.totalDamage;
  const defenderDamage = counterResult.totalDamage;

  if (attackResult.sideEffects) {
    attackResult.sideEffects();
  }
  if (counterResult.sideEffects) {
    counterResult.sideEffects();
  }

  if (attackResult.piercingDamage > 0) {
    applyDamage(defender, attackerDamage - attackResult.piercingDamage);
    applyDamage(defender, attackResult.piercingDamage, { piercing: true });
  } else {
    applyDamage(defender, attackerDamage);
  }

  if (counterResult.piercingDamage > 0) {
    applyDamage(attacker, defenderDamage - counterResult.piercingDamage);
    applyDamage(attacker, counterResult.piercingDamage, { piercing: true });
  } else {
    applyDamage(attacker, defenderDamage);
  }

  checkSimultaneousDeaths(game, attacker, defender, attackerIndex, 1 - attackerIndex);
  attacker.hasAttacked = true;

  logMessage(`${attacker.card.name}が攻撃（${useSpecial ? "必殺" : "通常"}）`);
}

export function destroyCharacter(game, character, ownerIndex, killerIndex) {
  character.hp = 0;
  removeIfDead(game, character, ownerIndex, killerIndex);
}

export function applyMagic(game, playerIndex, card, target, logMessage) {
  const player = game.players[playerIndex];
  const effect = card.effect;

  switch (effect.kind) {
    case "dealDamage":
      applyDamage(target, effect.value);
      if (target.hp <= 0) {
        removeIfDead(game, target, 1 - playerIndex, playerIndex);
      }
      logMessage(`${card.name}でダメージ`);
      break;
    case "heal":
      target.hp = Math.min(target.maxHp, target.hp + effect.value);
      logMessage(`${card.name}で回復`);
      break;
    case "stun":
      target.status.stunnedTurns += effect.turns;
      logMessage(`${card.name}でスタン`);
      break;
    case "destroyIfHpBelowOrEqual":
      if (target.hp <= effect.thresholdHp) {
        destroyCharacter(game, target, 1 - playerIndex, playerIndex);
        logMessage(`${card.name}で破壊`);
      } else {
        logMessage("破壊条件を満たしません。");
      }
      break;
    case "buffAllAllies":
      player.field.forEach((ch) => {
        ch.tempAtkBuff += effect.atk || 0;
        ch.tempBuffTurns = effect.durationTurns || 1;
      });
      logMessage("味方全体を強化");
      break;
    case "debuff":
      target.tempAtkBuff += effect.atk || 0;
      target.tempBuffTurns = effect.durationTurns || 1;
      logMessage("敵を弱体化");
      break;
    case "gainMana":
      player.mana = Math.min(player.mana + effect.value, game.balance.manaMax);
      logMessage("マナ増加");
      break;
    default:
      logMessage("未対応のマジック効果です。");
      break;
  }
}

export function attachEquipment(equipmentCard, target, logMessage) {
  target.equipment.push(equipmentCard);
  const effect = equipmentCard.effect;
  if (effect.kind === "equipBuff") {
    target.maxHp += effect.hp || 0;
    target.hp += effect.hp || 0;
  }
  if (effect.kind === "equipGrant" && effect.canAttackOnSummon) {
    target.status.canAttackOnSummon = true;
  }
  if (effect.kind === "equipReduceSpecialCost") {
    target.status.specialCostMod += effect.value || 0;
  }
  logMessage(`${equipmentCard.name}を装備`);
}

export function equipNameList(character) {
  if (character.equipment.length === 0) {
    return "装備なし";
  }
  return character.equipment.map((eq) => eq.name).join(" / ");
}

export function canAttack(game, character) {
  if (character.status.stunnedThisTurn) {
    return false;
  }
  if (character.hasAttacked) {
    return false;
  }
  if (character.summonedTurn === game.turn && !character.status.canAttackOnSummon) {
    return false;
  }
  return true;
}
