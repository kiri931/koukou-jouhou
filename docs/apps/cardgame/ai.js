import { CONFIG } from "./game-logic.js";

export function isAiPlayer(game, playerIndex) {
  return game.aiEnabled && playerIndex === 1;
}

export function aiChooseCounterMode(game, defenderIndex, defender, getSpecialCost) {
  const defenderPlayer = game.players[defenderIndex];
  const specialCost = defender.card.special ? getSpecialCost(defender) : null;
  if (specialCost !== null && defenderPlayer.power >= specialCost && Math.random() < 0.4) {
    return "special";
  }
  if (defenderPlayer.power >= game.balance.counterCostPower) {
    return "normal";
  }
  return "none";
}

export function aiSelectTarget(game, card) {
  const player = game.players[game.currentPlayer];
  const enemy = game.players[1 - game.currentPlayer];
  const targetType = card.effect.target;
  if (targetType === "enemyCharacter") {
    return enemy.field[0] || null;
  }
  if (targetType === "allyCharacter") {
    return player.field[0] || null;
  }
  return null;
}

export function aiTryPlayCard(game, handlePlayCard, handleTargetSelection) {
  const player = game.players[game.currentPlayer];

  if (!game.summonUsed) {
    const summonIndex = player.hand.findIndex(
      (card) => card.type === "character" && (card.costMana || 0) <= player.mana,
    );
    if (summonIndex >= 0 && player.field.length < CONFIG.maxField) {
      handlePlayCard(summonIndex, player.hand[summonIndex]);
      return true;
    }
  }

  const stadiumIndex = player.hand.findIndex(
    (card) => card.type === "stadium" && (card.costMana || 0) <= player.mana,
  );
  if (stadiumIndex >= 0) {
    handlePlayCard(stadiumIndex, player.hand[stadiumIndex]);
    return true;
  }

  const magicIndex = player.hand.findIndex(
    (card) => card.type === "magic" && (card.costMana || 0) <= player.mana,
  );
  if (magicIndex >= 0) {
    const card = player.hand[magicIndex];
    if (!card.effect.target) {
      handlePlayCard(magicIndex, card);
      return true;
    }
    const target = aiSelectTarget(game, card);
    if (target) {
      handlePlayCard(magicIndex, card);
      const ownerIndex = card.effect.target === "enemyCharacter" ? 1 - game.currentPlayer : game.currentPlayer;
      handleTargetSelection(target, ownerIndex);
      return true;
    }
  }

  const equipmentIndex = player.hand.findIndex(
    (card) => card.type === "equipment" && (card.costMana || 0) <= player.mana,
  );
  if (equipmentIndex >= 0 && player.field.length > 0) {
    const card = player.hand[equipmentIndex];
    handlePlayCard(equipmentIndex, card);
    handleTargetSelection(player.field[0], game.currentPlayer);
    return true;
  }

  return false;
}

export function aiTakeTurn({
  game,
  canAttack,
  getSpecialCost,
  resolveAttack,
  handlePlayCard,
  handleTargetSelection,
  render,
  switchTurn,
}) {
  if (!isAiPlayer(game, game.currentPlayer)) {
    return;
  }
  if (game.phase !== "main") {
    game.phase = "main";
  }

  let safety = 6;
  while (safety > 0 && aiTryPlayCard(game, handlePlayCard, handleTargetSelection)) {
    safety -= 1;
  }

  game.phase = "attack";
  const player = game.players[game.currentPlayer];
  const enemy = game.players[1 - game.currentPlayer];

  if (enemy.field.length === 0) {
    switchTurn();
    return;
  }

  const attackers = player.field.filter((ch) => canAttack(game, ch));
  if (attackers.length === 0) {
    switchTurn();
    return;
  }

  attackers.forEach((attacker) => {
    if (enemy.field.length === 0) {
      return;
    }
    const target = enemy.field[0];
    const specialCost = attacker.card.special ? getSpecialCost(attacker) : null;
    const useSpecial = specialCost !== null && player.power >= specialCost && Math.random() < 0.3;
    const counterMode = aiChooseCounterMode(game, 1 - game.currentPlayer, target, getSpecialCost);
    resolveAttack(attacker, target, game.currentPlayer, useSpecial, counterMode);
  });

  render();
  if (!game.gameOver) {
    switchTurn();
  }
}

export function scheduleAiTurn(game, aiTakeTurnFn) {
  if (!isAiPlayer(game, game.currentPlayer) || game.gameOver) {
    return;
  }
  if (game.aiBusy) {
    return;
  }
  game.aiBusy = true;
  setTimeout(() => {
    if (isAiPlayer(game, game.currentPlayer) && !game.gameOver) {
      aiTakeTurnFn();
    }
    game.aiBusy = false;
  }, CONFIG.aiDelayMs);
}
