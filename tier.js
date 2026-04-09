const STORAGE_KEY = "playstack.games";
const TIERS = ["S", "A", "B", "C", "D"];

const refs = {
  board: document.querySelector("#tier-board"),
  copyButton: document.querySelector("#copy-tier-link")
};

let games = [];
let isSharedView = false;
let draggedGameId = null;

const loadSavedGames = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveGames = () => {
  if (isSharedView) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
};

const getEffectiveTier = (game) => {
  const t = game.tier;
  if (t === null || t === undefined || t === "") return null;
  return t;
};

const getTierGroups = () => {
  return TIERS.reduce((acc, tier) => {
    acc[tier] = games.filter((game) => getEffectiveTier(game) === tier);
    return acc;
  }, {});
};

const renderBoard = () => {
  const tierGroups = getTierGroups();
  refs.board.innerHTML = TIERS
    .map((tier) => {
    const cards = tierGroups[tier]
      .map(
        (game) => `
      <article class="tier-game-card" data-tier-card data-game-id="${game.id}" draggable="${isSharedView ? "false" : "true"}">
        <img
          class="tier-game-image"
          src="${game.cover || "https://placehold.co/220x130/ffffff/060606?text=No+Cover"}"
          alt="${game.title} cover image"
        />
        <h4 class="tier-game-title">${game.title}</h4>
      </article>
    `
      )
      .join("");

    return `
      <section class="tier-row" data-tier-row data-tier="${tier}">
        <h3><span class="tier-tag">${tier}</span> Tier</h3>
        <div class="tier-row-content">
          <div class="tier-cards-wrap" data-tier-dropzone data-tier="${tier}">
            ${cards || '<p class="muted">No games in this tier yet.</p>'}
          </div>
          <div
            class="tier-remove-dropzone"
            data-remove-from-tier-dropzone
            role="region"
            aria-label="Drop a game here to remove it from the tier list"
          >
            <svg class="tier-remove-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M4 7h16M9 7V5h6v2m-7 0l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="tier-remove-label">remove from tier list</span>
          </div>
        </div>
      </section>
    `;
  })
    .join("");
};

const decodeSharedData = () => {
  const shared = new URLSearchParams(window.location.search).get("data");
  if (!shared) return null;
  try {
    const decoded = JSON.parse(atob(decodeURIComponent(shared)));
    return Array.isArray(decoded) ? decoded : null;
  } catch {
    return null;
  }
};

const encodeSharedData = () => {
  return encodeURIComponent(btoa(JSON.stringify(games)));
};

const saveAndRender = () => {
  saveGames();
  renderBoard();
};

const moveGameToTierAndPosition = (gameId, nextTier, beforeGameId = null) => {
  const draggedIndex = games.findIndex((game) => game.id === gameId);
  if (draggedIndex < 0) return;

  const [dragged] = games.splice(draggedIndex, 1);
  const updated = { ...dragged, tier: nextTier };

  if (beforeGameId) {
    const beforeIndex = games.findIndex((game) => game.id === beforeGameId);
    if (beforeIndex >= 0) {
      games.splice(beforeIndex, 0, updated);
      saveAndRender();
      return;
    }
  }

  let lastTierIndex = -1;
  games.forEach((game, index) => {
    if (getEffectiveTier(game) === nextTier) {
      lastTierIndex = index;
    }
  });

  if (lastTierIndex >= 0) {
    games.splice(lastTierIndex + 1, 0, updated);
  } else {
    games.push(updated);
  }

  saveAndRender();
};

const removeGameFromTierList = (gameId) => {
  const idx = games.findIndex((game) => game.id === gameId);
  if (idx < 0) return;
  const game = games[idx];
  games[idx] = { ...game, tier: null };
  saveAndRender();
};

const clearDropStates = () => {
  refs.board
    .querySelectorAll(".tier-cards-wrap, .tier-game-card, .tier-remove-dropzone")
    .forEach((element) => element.classList.remove("drag-over"));
};

const finishTierDragSession = () => {
  clearDropStates();
  draggedGameId = null;
  refs.board.classList.remove("tier-board--dragging");
};

const handleDragStart = (event) => {
  if (isSharedView) return;
  const card = event.target.closest("[data-tier-card]");
  if (!card) return;
  draggedGameId = card.getAttribute("data-game-id");
  if (!draggedGameId) return;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedGameId);
  refs.board.classList.add("tier-board--dragging");
};

const handleDragEnd = () => {
  finishTierDragSession();
};

const handleDragOver = (event) => {
  if (isSharedView) return;
  const removeZone = event.target.closest("[data-remove-from-tier-dropzone]");
  if (removeZone) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    return;
  }
  const dropZone = event.target.closest("[data-tier-dropzone]");
  if (!dropZone) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const handleDragEnter = (event) => {
  if (isSharedView) return;
  const removeZone = event.target.closest("[data-remove-from-tier-dropzone]");
  if (removeZone) {
    removeZone.classList.add("drag-over");
    return;
  }
  const dropZone = event.target.closest("[data-tier-dropzone]");
  if (dropZone) {
    dropZone.classList.add("drag-over");
  }
  const card = event.target.closest("[data-tier-card]");
  if (card) {
    card.classList.add("drag-over");
  }
};

const handleDragLeave = (event) => {
  const removeZone = event.target.closest("[data-remove-from-tier-dropzone]");
  if (removeZone && !removeZone.contains(event.relatedTarget)) {
    removeZone.classList.remove("drag-over");
  }

  const zone = event.target.closest(".tier-cards-wrap");
  if (zone && !zone.contains(event.relatedTarget)) {
    zone.classList.remove("drag-over");
  }

  const card = event.target.closest("[data-tier-card]");
  if (card && !card.contains(event.relatedTarget)) {
    card.classList.remove("drag-over");
  }
};

const handleDrop = (event) => {
  if (isSharedView) return;

  const droppedId = event.dataTransfer.getData("text/plain") || draggedGameId;
  if (!droppedId) return;

  const removeZone = event.target.closest("[data-remove-from-tier-dropzone]");
  if (removeZone) {
    event.preventDefault();
    removeGameFromTierList(droppedId);
    finishTierDragSession();
    return;
  }

  const dropZone = event.target.closest("[data-tier-dropzone]");
  if (!dropZone) return;
  event.preventDefault();

  const targetTier = dropZone.getAttribute("data-tier");
  if (!targetTier || !TIERS.includes(targetTier)) return;

  const targetCard = event.target.closest("[data-tier-card]");
  const beforeGameId = targetCard?.getAttribute("data-game-id") || null;

  if (beforeGameId === droppedId) {
    finishTierDragSession();
    return;
  }

  moveGameToTierAndPosition(droppedId, targetTier, beforeGameId);
  finishTierDragSession();
};

const copyLink = async () => {
  const url = `${window.location.origin}${window.location.pathname}?data=${encodeSharedData()}`;
  await navigator.clipboard.writeText(url);
  refs.copyButton.textContent = "Link Copied";
  setTimeout(() => {
    refs.copyButton.textContent = "Copy Share Link";
  }, 1200);
};

const migrateStoredTiers = (list) => {
  let changed = false;
  const next = list.map((game) => {
    const t = game.tier;
    if (t === "None" || t === "" || (t != null && !TIERS.includes(t))) {
      changed = true;
      return { ...game, tier: null };
    }
    return game;
  });
  return { games: next, changed };
};

const init = () => {
  const sharedData = decodeSharedData();
  if (sharedData) {
    isSharedView = true;
    games = migrateStoredTiers(sharedData).games;
  } else {
    const { games: migrated, changed } = migrateStoredTiers(loadSavedGames());
    games = migrated;
    if (changed) saveGames();
  }

  renderBoard();
  refs.board.addEventListener("dragstart", handleDragStart);
  refs.board.addEventListener("dragend", handleDragEnd);
  refs.board.addEventListener("dragover", handleDragOver);
  refs.board.addEventListener("dragenter", handleDragEnter);
  refs.board.addEventListener("dragleave", handleDragLeave);
  refs.board.addEventListener("drop", handleDrop);
  refs.copyButton?.addEventListener("click", copyLink);
};

init();
