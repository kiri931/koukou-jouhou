import { calcAttackValue, equipNameList, canAttack } from "./game-logic.js";

export function initUI({
  onPlayCard,
  onCardDrop,
  onFieldDrop,
  onStadiumDrop,
  onHandDrop,
  onFieldCardClick,
  onAttackPhase,
  onEndTurn,
  onReset,
  onAiToggle,
}) {
  const elements = {
    turnInfo: document.getElementById("turn-info"),
    phaseInfo: document.getElementById("phase-info"),
    instruction: document.getElementById("instruction"),
    opponentName: document.getElementById("opponent-name"),
    currentName: document.getElementById("current-name"),
    opponentResources: document.getElementById("opponent-resources"),
    currentResources: document.getElementById("current-resources"),
    opponentStadium: document.getElementById("opponent-stadium"),
    currentStadium: document.getElementById("current-stadium"),
    opponentField: document.getElementById("opponent-field"),
    currentField: document.getElementById("current-field"),
    hand: document.getElementById("hand"),
    handMeta: document.getElementById("hand-meta"),
    log: document.getElementById("log"),
    attackPhase: document.getElementById("attack-phase"),
    endTurn: document.getElementById("end-turn"),
    resetGame: document.getElementById("reset-game"),
    aiToggle: document.getElementById("ai-toggle"),
    turnOverlay: document.getElementById("turn-overlay"),
    turnOverlayTitle: document.getElementById("turn-overlay-title"),
    turnOverlayText: document.getElementById("turn-overlay-text"),
    turnOverlayButton: document.getElementById("turn-overlay-button"),
    modal: document.getElementById("modal"),
    modalContent: document.getElementById("modal-content"),
  };

  const addHighlight = (element) => element.classList.add("drop-highlight");
  const removeHighlight = (element) => element.classList.remove("drop-highlight");

  elements.hand.addEventListener("dragstart", (event) => {
    const cardEl = event.target.closest(".card[data-hand-index]");
    if (!cardEl) {
      return;
    }
    event.dataTransfer.setData("text/plain", cardEl.dataset.handIndex);
    event.dataTransfer.effectAllowed = "move";
  });

  elements.hand.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  elements.hand.addEventListener("dragenter", () => {
    addHighlight(elements.hand);
  });

  elements.hand.addEventListener("dragleave", () => {
    removeHighlight(elements.hand);
  });

  elements.hand.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(index)) {
      return;
    }
    onHandDrop(index);
    removeHighlight(elements.hand);
  });

  const handleFieldClick = (event) => {
    const cardEl = event.target.closest(".card[data-uid]");
    if (!cardEl) {
      return;
    }
    onFieldCardClick(Number(cardEl.dataset.owner), Number(cardEl.dataset.uid));
  };

  const handleFieldDrop = (event) => {
    event.preventDefault();
    removeHighlight(event.currentTarget);
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(index)) {
      return;
    }
    const cardEl = event.target.closest(".card[data-uid]");
    if (cardEl) {
      onCardDrop(index, Number(cardEl.dataset.owner), Number(cardEl.dataset.uid));
      return;
    }
    onFieldDrop(index);
  };

  elements.currentField.addEventListener("click", handleFieldClick);
  elements.opponentField.addEventListener("click", handleFieldClick);

  elements.currentField.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  elements.currentField.addEventListener("dragenter", () => {
    addHighlight(elements.currentField);
  });
  elements.currentField.addEventListener("dragleave", () => {
    removeHighlight(elements.currentField);
  });
  elements.currentField.addEventListener("drop", handleFieldDrop);
  elements.opponentField.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  elements.opponentField.addEventListener("dragenter", () => {
    addHighlight(elements.opponentField);
  });
  elements.opponentField.addEventListener("dragleave", () => {
    removeHighlight(elements.opponentField);
  });
  elements.opponentField.addEventListener("drop", handleFieldDrop);

  elements.currentStadium.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  elements.currentStadium.addEventListener("dragenter", () => {
    addHighlight(elements.currentStadium);
  });
  elements.currentStadium.addEventListener("dragleave", () => {
    removeHighlight(elements.currentStadium);
  });
  elements.currentStadium.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isNaN(index)) {
      return;
    }
    onStadiumDrop(index);
    removeHighlight(elements.currentStadium);
  });

  elements.attackPhase.onclick = onAttackPhase;
  elements.endTurn.onclick = onEndTurn;
  elements.resetGame.onclick = onReset;

  if (elements.aiToggle) {
    elements.aiToggle.onchange = () => onAiToggle(elements.aiToggle.checked);
  }

  return {
    elements,
    render: (game, { isAiPlayer, updateInstruction }) => {
      const current = game.players[game.currentPlayer];
      const opponent = game.players[1 - game.currentPlayer];

      elements.turnInfo.textContent = `ターン ${game.turn} (${current.name})`;
      elements.phaseInfo.textContent = game.phase === "main" ? "メイン" : "アタック";

      elements.currentName.textContent = current.name;
      elements.opponentName.textContent = opponent.name;

      elements.currentResources.innerHTML = renderResources(game, current, true);
      elements.opponentResources.innerHTML = renderResources(game, opponent, true);

      elements.currentStadium.innerHTML = renderStadium(current);
      elements.opponentStadium.innerHTML = renderStadium(opponent);

      elements.currentField.innerHTML = current.field
        .map((ch) => renderCharacterCard(game, ch, game.currentPlayer, true))
        .join("");
      elements.opponentField.innerHTML = opponent.field
        .map((ch) => renderCharacterCard(game, ch, 1 - game.currentPlayer, false))
        .join("");

      elements.hand.innerHTML = renderHand(current);
      elements.handMeta.innerHTML = renderResources(game, current, true);

      elements.log.innerHTML = game.log.map((entry) => `<div>${entry}</div>`).join("");

      updateInstruction();
    },
    updateInstruction: (game, isAiPlayer, message) => {
      if (message) {
        elements.instruction.textContent = message;
        return;
      }
      if (game.gameOver) {
        elements.instruction.textContent = `勝者: ${game.gameOver}`;
        return;
      }
      if (isAiPlayer(game, game.currentPlayer)) {
        elements.instruction.textContent = "AIが行動中...";
        return;
      }
      if (game.phase === "main") {
        elements.instruction.textContent = "召喚・マジック・装備・スタジアムを使用できます。";
      } else {
        elements.instruction.textContent = "攻撃するキャラと相手を選択してください。";
      }
    },
    showAttackModal: ({ attacker, defender, canNormal, canSpecial, onSelect, onCancel }) => {
      elements.modalContent.innerHTML = `
        <h2>攻撃を選択</h2>
        <p>${attacker.card.name} → ${defender.card.name}</p>
        <div class="actions">
          <button class="primary" id="attack-normal" ${canNormal ? "" : "disabled"}>通常攻撃</button>
          <button class="secondary" id="attack-special" ${canSpecial ? "" : "disabled"}>必殺技</button>
          <button class="ghost" id="attack-cancel">キャンセル</button>
        </div>
      `;
      elements.modal.classList.remove("hidden");

      document.getElementById("attack-normal").onclick = () => {
        elements.modal.classList.add("hidden");
        onSelect("normal");
      };
      document.getElementById("attack-special").onclick = () => {
        elements.modal.classList.add("hidden");
        onSelect("special");
      };
      document.getElementById("attack-cancel").onclick = () => {
        elements.modal.classList.add("hidden");
        if (onCancel) {
          onCancel();
        }
      };
    },
    showCounterModal: ({ defender, canNormal, canSpecial, onSelect }) => {
      elements.modalContent.innerHTML = `
        <h2>反撃を選択</h2>
        <p>${defender.card.name}は反撃しますか？</p>
        <div class="actions">
          <button class="primary" id="counter-normal" ${canNormal ? "" : "disabled"}>反撃（通常）</button>
          <button class="secondary" id="counter-special" ${canSpecial ? "" : "disabled"}>反撃（必殺）</button>
          <button class="ghost" id="counter-none">反撃しない</button>
        </div>
      `;
      elements.modal.classList.remove("hidden");

      document.getElementById("counter-normal").onclick = () => {
        elements.modal.classList.add("hidden");
        onSelect("normal");
      };
      document.getElementById("counter-special").onclick = () => {
        elements.modal.classList.add("hidden");
        onSelect("special");
      };
      document.getElementById("counter-none").onclick = () => {
        elements.modal.classList.add("hidden");
        onSelect("none");
      };
    },
    showTurnOverlay: ({ title, text, buttonText, onConfirm }) => {
      elements.turnOverlayTitle.textContent = title;
      elements.turnOverlayText.textContent = text;
      elements.turnOverlayButton.textContent = buttonText;
      elements.turnOverlay.classList.remove("hidden");
      elements.turnOverlayButton.onclick = () => {
        elements.turnOverlay.classList.add("hidden");
        if (onConfirm) {
          onConfirm();
        }
      };
    },
  };
}

function renderResources(game, player, showHandCount = false) {
  const cardsLeft = player.deck.length;
  const handInfo = showHandCount ? `手札${player.hand.length}` : "";
  return [
    `マナ ${player.mana}/${game.balance.manaMax}`,
    `パワー ${player.power}`,
    `ポイント ${player.points}`,
    `山札 ${cardsLeft}`,
    handInfo,
  ]
    .filter(Boolean)
    .map((text) => `<span class="badge">${text}</span>`)
    .join("");
}

function renderStadium(player) {
  if (!player.stadium) {
    return "<div class=\"meta\">スタジアムなし</div>";
  }
  const description = buildRulesText(player.stadium);
  const flavor = player.stadium.flavor || "";
  return `
    <div class="card" data-flavor="${escapeAttribute(flavor)}">
      <div class="title">${player.stadium.name}</div>
      <div class="card-image">
        <img src="images/${player.stadium.id}.png" alt="${player.stadium.name}" onerror="this.closest('.card-image').classList.add('no-image'); this.remove();" />
        <span class="no-image-text">no image</span>
      </div>
      <div class="meta">${description}</div>
      <div class="meta">スタジアム</div>
      <div class="flavor-tooltip">${escapeHtml(flavor) || ""}</div>
    </div>
  `;
}

function renderCharacterCard(game, character, ownerIndex, isCurrentPlayer) {
  const atkValue = calcAttackValue(game, character, ownerIndex);
  const canAttackFlag = isCurrentPlayer && game.phase === "attack" && canAttack(game, character);
  const description = buildRulesText(character.card);
  const flavor = character.card.flavor || "";
  const statusLine = [
    character.status.shield > 0 ? `盾${character.status.shield}` : "",
    character.status.stunnedThisTurn ? "スタン" : "",
    character.status.evadeNextHit ? "回避" : "",
  ]
    .filter(Boolean)
    .join(" / ");

  return `
    <div class="card" data-uid="${character.uid}" data-owner="${ownerIndex}" data-flavor="${escapeAttribute(flavor)}">
      <div class="title">${character.card.name}</div>
      <div class="card-image">
        <img src="images/${character.card.id}.png" alt="${character.card.name}" onerror="this.closest('.card-image').classList.add('no-image'); this.remove();" />
        <span class="no-image-text">no image</span>
      </div>
      <div class="meta">${description}</div>
      <div class="meta"><span class="hp">HP ${character.hp}/${character.maxHp}</span> | <span class="atk">ATK ${atkValue}</span></div>
      <div class="meta">装備: ${equipNameList(character)}</div>
      <div class="meta">${statusLine || "状態: なし"}</div>
      <div class="meta">${canAttackFlag ? "攻撃可能" : ""}</div>
      <div class="flavor-tooltip">${escapeHtml(flavor) || ""}</div>
    </div>
  `;
}

function renderHand(player) {
  return player.hand
    .map((card, index) => {
      const description = buildRulesText(card);
      const flavor = card.flavor || "";
      const typeLabel = getTypeLabel(card.type);
      return `
      <div class="card" data-hand-index="${index}" data-flavor="${escapeAttribute(flavor)}" draggable="true">
        <div class="title">${card.name}</div>
        <div class="card-image">
          <img src="images/${card.id}.png" alt="${card.name}" onerror="this.closest('.card-image').classList.add('no-image'); this.remove();" />
          <span class="no-image-text">no image</span>
        </div>
        <div class="meta">${description}</div>
        <div class="meta">${typeLabel} / マナ ${card.costMana || 0}</div>
        <div class="meta">${card.type === "character" ? `HP ${card.hp} / ATK ${card.atk}` : ""}</div>
        <div class="flavor-tooltip">${escapeHtml(flavor) || ""}</div>
      </div>
    `;
    })
    .join("");
}

function getTypeLabel(type) {
  switch (type) {
    case "character":
      return "キャラクター";
    case "magic":
      return "マジック";
    case "equipment":
      return "装備";
    case "stadium":
      return "スタジアム";
    default:
      return type;
  }
}

function buildRulesText(card) {
  const rules = Array.isArray(card.rulesText) ? card.rulesText : [];
  if (rules.length === 0) {
    return "no description";
  }
  return rules.join("<br>");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/\n/g, " ");
}
