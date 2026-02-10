import {
  CONFIG,
  DECK_P1,
  DECK_P2,
  stripJsonComments,
  createCharacter,
  createPlayer,
  getBalanceDefaults,
  drawCard,
  applyStartOfTurn,
  applyEndOfTurn,
  resolveAttack,
  getSpecialCost,
  applyMagic,
  attachEquipment,
  checkGameOver,
  canAttack,
} from "./game-logic.js";
import { initUI } from "./ui.js";
import {
  isAiPlayer,
  aiChooseCounterMode,
  aiTakeTurn,
  scheduleAiTurn,
} from "./ai.js";

let game = null;
let ui = null;
const MAX_COPIES_PER_DECK = 3;

function logMessage(message) {
  game.log.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  if (game.log.length > 30) {
    game.log.length = 30;
  }
}

function render() {
  if (!game) {
    return;
  }
  ui.render(game, {
    isAiPlayer,
    updateInstruction: () => ui.updateInstruction(game, isAiPlayer),
  });

  if (checkGameOver(game)) {
    ui.showTurnOverlay({
      title: "ゲーム終了",
      text: `勝者: ${game.gameOver}`,
      buttonText: "閉じる",
    });
  }
}

function startTurn() {
  const current = game.players[game.currentPlayer];
  applyStartOfTurn(game, current, logMessage);
  drawCard(game, current, 1, logMessage);
  game.phase = "main";
  game.summonUsed = false;
  ui.updateInstruction(game, isAiPlayer);
  render();
  scheduleAiTurn(game, () => aiTakeTurn(controllerArgs()));
}

function switchTurn() {
  const current = game.players[game.currentPlayer];
  applyEndOfTurn(current);
  game.currentPlayer = 1 - game.currentPlayer;
  game.turn += 1;

  if (isAiPlayer(game, game.currentPlayer)) {
    startTurn();
    return;
  }

  ui.showTurnOverlay({
    title: "次のプレイヤー",
    text: `${game.players[game.currentPlayer].name}のターンです。`,
    buttonText: "開始",
    onConfirm: startTurn,
  });
}

function handlePlayCard(cardIndex) {
  const player = game.players[game.currentPlayer];
  const card = player.hand[cardIndex];
  if (!card) {
    return;
  }
  if (game.phase !== "main") {
    logMessage("メインフェーズのみ使用可能です。");
    render();
    return;
  }
  if (card.costMana && player.mana < card.costMana) {
    logMessage("マナ不足です。");
    render();
    return;
  }

  if (card.type === "character") {
    if (game.summonUsed) {
      logMessage("このターンは召喚済みです。");
      render();
      return;
    }
    if (player.field.length >= CONFIG.maxField) {
      logMessage("場がいっぱいです。");
      render();
      return;
    }
    player.mana -= card.costMana || 0;
    player.hand.splice(cardIndex, 1);
    player.field.push(createCharacter(card, game.turn));
    game.summonUsed = true;
    logMessage(`${card.name}を召喚`);
    render();
    return;
  }

  if (card.type === "stadium") {
    player.mana -= card.costMana || 0;
    player.hand.splice(cardIndex, 1);
    if (player.stadium) {
      player.grave.push(player.stadium);
    }
    player.stadium = card;
    logMessage(`${card.name}を設置`);
    render();
    return;
  }

  if (card.type === "magic") {
    if (!card.effect.target) {
      player.mana -= card.costMana || 0;
      player.hand.splice(cardIndex, 1);
      applyMagic(game, game.currentPlayer, card, null, logMessage);
      player.grave.push(card);
      logMessage(`${card.name}を使用`);
      render();
      return;
    }
    game.selection = {
      kind: "magic",
      card,
      cardIndex,
    };
    ui.updateInstruction(game, isAiPlayer, "マジックの対象を選択");
    return;
  }

  if (card.type === "equipment") {
    game.selection = {
      kind: "equipment",
      card,
      cardIndex,
    };
    ui.updateInstruction(game, isAiPlayer, "装備先の味方キャラを選択");
  }
}

function handleTargetSelection(target, ownerIndex) {
  const player = game.players[game.currentPlayer];
  const selection = game.selection;
  if (!selection) {
    return;
  }

  if (selection.kind === "magic") {
    const card = selection.card;
    const targetType = card.effect.target;
    if (targetType === "enemyCharacter" && ownerIndex === game.currentPlayer) {
      return;
    }
    if (targetType === "allyCharacter" && ownerIndex !== game.currentPlayer) {
      return;
    }
    player.mana -= card.costMana || 0;
    player.hand.splice(selection.cardIndex, 1);
    applyMagic(game, game.currentPlayer, card, target, logMessage);
    player.grave.push(card);
    game.selection = null;
    ui.updateInstruction(game, isAiPlayer);
    render();
    return;
  }

  if (selection.kind === "equipment") {
    if (ownerIndex !== game.currentPlayer) {
      return;
    }
    const card = selection.card;
    player.mana -= card.costMana || 0;
    player.hand.splice(selection.cardIndex, 1);
    attachEquipment(card, target, logMessage);
    player.grave.push(card);
    game.selection = null;
    ui.updateInstruction(game, isAiPlayer);
    render();
  }
}

function handleFieldCardClick(ownerIndex, uid) {
  const owner = game.players[ownerIndex];
  const character = owner.field.find((ch) => ch.uid === uid);
  if (!character) {
    return;
  }

  if (game.selection) {
    handleTargetSelection(character, ownerIndex);
    return;
  }

  if (game.phase !== "attack") {
    return;
  }

  if (ownerIndex === game.currentPlayer) {
    if (!canAttack(game, character)) {
      logMessage("攻撃できません。");
      render();
      return;
    }
    game.targetingAttacker = character;
    ui.updateInstruction(game, isAiPlayer, "攻撃対象の相手キャラを選択");
    return;
  }

  if (game.targetingAttacker) {
    openAttackFlow(game.targetingAttacker, character);
    game.targetingAttacker = null;
  }
}

function openAttackFlow(attacker, defender) {
  const attackerIndex = game.currentPlayer;
  const defenderIndex = 1 - attackerIndex;
  const specialCost = attacker.card.special ? getSpecialCost(attacker) : null;
  const canSpecial = specialCost !== null && game.players[attackerIndex].power >= specialCost;
  const canNormal = game.players[attackerIndex].power >= game.balance.attackCostPower;

  ui.showAttackModal({
    attacker,
    defender,
    canNormal,
    canSpecial,
    onSelect: (attackMode) => {
      if (isAiPlayer(game, defenderIndex)) {
        const counterMode = aiChooseCounterMode(game, defenderIndex, defender, getSpecialCost);
        resolveAttack(game, attacker, defender, attackerIndex, attackMode === "special", counterMode, logMessage);
        ui.updateInstruction(game, isAiPlayer);
        render();
        return;
      }
      openCounterFlow(attacker, defender, attackMode);
    },
  });
}

function openCounterFlow(attacker, defender, attackMode) {
  const defenderIndex = 1 - game.currentPlayer;
  const counterCost = game.balance.counterCostPower;
  const specialCost = defender.card.special ? getSpecialCost(defender) : null;
  const canNormal = game.players[defenderIndex].power >= counterCost;
  const canSpecial = specialCost !== null && game.players[defenderIndex].power >= specialCost;

  ui.showCounterModal({
    defender,
    canNormal,
    canSpecial,
    onSelect: (counterMode) => {
      resolveAttack(game, attacker, defender, game.currentPlayer, attackMode === "special", counterMode, logMessage);
      ui.updateInstruction(game, isAiPlayer);
      render();
    },
  });
}

function controllerArgs() {
  return {
    game,
    canAttack,
    getSpecialCost,
    resolveAttack: (attacker, defender, attackerIndex, useSpecial, counterMode) => {
      resolveAttack(game, attacker, defender, attackerIndex, useSpecial, counterMode, logMessage);
    },
    handlePlayCard: (index, card) => handlePlayCard(index, card),
    handleTargetSelection,
    render,
    switchTurn,
  };
}

async function initGame(aiEnabledOverride = null) {
  const response = await fetch("cards.json");
  const text = await response.text();
  const cardsJson = JSON.parse(stripJsonComments(text));
  const cardsById = new Map(cardsJson.cards.map((card) => [card.id, card]));

  const aiEnabled = aiEnabledOverride !== null
    ? aiEnabledOverride
    : ui.elements.aiToggle
    ? ui.elements.aiToggle.checked
    : false;
  const playerTwoName = aiEnabled ? "AI" : "P2";

  const deckP1 = normalizeDeck(DECK_P1, MAX_COPIES_PER_DECK);
  const deckP2 = normalizeDeck(DECK_P2, MAX_COPIES_PER_DECK);

  game = {
    cardsById,
    balance: getBalanceDefaults(cardsJson),
    players: [createPlayer("P1", deckP1), createPlayer(playerTwoName, deckP2)],
    currentPlayer: 0,
    turn: 1,
    phase: "main",
    summonUsed: false,
    targetingAttacker: null,
    selection: null,
    log: [],
    gameOver: null,
    aiEnabled,
    aiBusy: false,
  };

  game.players.forEach((player) => {
    drawCard(game, player, CONFIG.startingHand, logMessage);
  });

  logMessage("ゲーム開始");
  startTurn();
}

function normalizeDeck(deck, maxCopies) {
  const counts = new Map();
  const normalized = [];
  deck.forEach((cardId) => {
    const count = counts.get(cardId) || 0;
    if (count >= maxCopies) {
      return;
    }
    counts.set(cardId, count + 1);
    normalized.push(cardId);
  });
  return normalized;
}

function initApp() {
  ui = initUI({
    onPlayCard: handlePlayCard,
    onCardDrop: (handIndex, ownerIndex, uid) => {
      const player = game.players[game.currentPlayer];
      const card = player.hand[handIndex];
      const owner = game.players[ownerIndex];
      const target = owner.field.find((ch) => ch.uid === uid);
      if (!card || !target) {
        return;
      }
      if (card.type === "magic" || card.type === "equipment") {
        handlePlayCard(handIndex);
        handleTargetSelection(target, ownerIndex);
        render();
      }
    },
    onFieldDrop: (handIndex) => {
      const player = game.players[game.currentPlayer];
      const card = player.hand[handIndex];
      if (!card) {
        return;
      }
      if (card.type === "character") {
        handlePlayCard(handIndex);
        render();
      }
    },
    onStadiumDrop: (handIndex) => {
      const player = game.players[game.currentPlayer];
      const card = player.hand[handIndex];
      if (!card) {
        return;
      }
      if (card.type === "stadium") {
        handlePlayCard(handIndex);
        render();
      }
    },
    onHandDrop: (handIndex) => {
      const player = game.players[game.currentPlayer];
      const card = player.hand[handIndex];
      if (!card) {
        return;
      }
      if (card.type === "magic" && !card.effect.target) {
        handlePlayCard(handIndex);
        render();
      }
    },
    onFieldCardClick: handleFieldCardClick,
    onAttackPhase: () => {
      if (game.phase === "main") {
        game.phase = "attack";
        ui.updateInstruction(game, isAiPlayer);
        render();
      }
    },
    onEndTurn: () => {
      if (game.selection || game.targetingAttacker) {
        game.selection = null;
        game.targetingAttacker = null;
      }
      switchTurn();
    },
    onReset: () => initGame(ui.elements.aiToggle?.checked ?? false),
    onAiToggle: (enabled) => initGame(enabled),
  });

  initGame();
}

initApp();
