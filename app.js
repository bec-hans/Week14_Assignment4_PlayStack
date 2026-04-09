const STORAGE_KEY = "playstack.games";
const STATUSES = ["Wishlist", "Playing", "Completed"];

const state = {
  games: [],
  suggestions: [],
  activeGameId: null,
  draggedGameId: null,
  search: "",
  sort: "recent",
  genre: "all"
};

const refs = {
  openAddButton: document.querySelector("#open-add-game"),
  addGameModal: document.querySelector("#add-game-modal"),
  addForm: document.querySelector("#add-game-form"),
  titleInput: document.querySelector("#add-game-title"),
  platformInput: document.querySelector("#add-game-platform"),
  statusInput: document.querySelector("#add-game-status"),
  addStarGroup: document.querySelector("#add-game-star-group"),
  notesInput: document.querySelector("#add-game-notes"),
  tierCheckbox: document.querySelector("#add-game-tier-checkbox"),
  addTierPanel: document.querySelector("#add-game-tier-panel"),
  addTierFieldset: document.querySelector("#add-game-tier-fieldset"),
  addGameCancel: document.querySelector("#add-game-cancel"),
  addGameCloseX: document.querySelector("#add-game-close-x"),
  suggestionsList: document.querySelector("#suggestions-list"),
  searchInput: document.querySelector("#search-input"),
  sortSelect: document.querySelector("#sort-select"),
  genreFilter: document.querySelector("#genre-filter"),
  modal: document.querySelector("#game-modal"),
  modalBody: document.querySelector("#modal-body"),
  lists: {
    Wishlist: document.querySelector("#wishlist-list"),
    Playing: document.querySelector("#playing-list"),
    Completed: document.querySelector("#completed-list")
  },
  counts: {
    Wishlist: document.querySelector("#wishlist-count"),
    Playing: document.querySelector("#playing-count"),
    Completed: document.querySelector("#completed-count")
  }
};

const getConfig = () => window.PLAYSTACK_CONFIG || {};

const loadGames = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveGames = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.games));
};

const createId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const formatStars = (rating) => {
  if (!rating || rating < 1) return "☆☆☆☆☆";
  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
};

const syncStarRatingButtons = (groupEl, value) => {
  if (!groupEl) return;
  const hiddenId = groupEl.getAttribute("data-star-hidden");
  const hidden = hiddenId ? document.getElementById(hiddenId) : null;
  const num = Number(value);
  const clamped = Number.isInteger(num) && num >= 1 && num <= 5 ? num : 0;
  if (hidden) {
    hidden.value = clamped > 0 ? String(clamped) : "";
  }
  groupEl.querySelectorAll("[data-star-rating-btn]").forEach((starBtn) => {
    const starVal = Number(starBtn.getAttribute("data-star-value"));
    const on = clamped >= starVal;
    starBtn.classList.toggle("star-rating-btn--on", on);
    starBtn.setAttribute("aria-pressed", on ? "true" : "false");
  });
};

const handleStarRatingClick = (event) => {
  const btn = event.target.closest("[data-star-rating-btn]");
  if (!btn) return;
  const group = btn.closest(".star-rating");
  if (!group) return;
  const val = Number(btn.getAttribute("data-star-value"));
  if (!Number.isInteger(val) || val < 1 || val > 5) return;
  syncStarRatingButtons(group, val);
};

const syncDetailTierPanelFromCheckbox = () => {
  const checkbox = refs.modalBody.querySelector("#detail-tier-checkbox");
  const panel = refs.modalBody.querySelector("#detail-tier-panel");
  const fieldset = refs.modalBody.querySelector("#detail-tier-fieldset");
  if (!checkbox || !panel || !fieldset) return;
  const on = Boolean(checkbox.checked);
  panel.hidden = !on;
  fieldset.disabled = !on;
};

const normalizeGame = (partialGame) => {
  let tier;
  if (Object.prototype.hasOwnProperty.call(partialGame, "tier")) {
    tier = partialGame.tier;
  } else {
    tier = "None";
  }

  return {
    id: partialGame.id || createId(),
    title: partialGame.title || "Untitled",
    platform: partialGame.platform || "Unknown",
    status: STATUSES.includes(partialGame.status) ? partialGame.status : "Wishlist",
    genre: partialGame.genre || "Unknown",
    releaseYear: partialGame.releaseYear || "N/A",
    cover: partialGame.cover || "",
    rawgRating: partialGame.rawgRating || null,
    userRating: partialGame.userRating || 0,
    notes: partialGame.notes || "",
    tier,
    addedAt: partialGame.addedAt || Date.now()
  };
};

const getUniqueGenres = () => {
  const genres = new Set(state.games.map((game) => game.genre).filter(Boolean));
  return ["all", ...Array.from(genres).sort((a, b) => a.localeCompare(b))];
};

const applySearchFilterSort = (games) => {
  const titleNeedle = state.search.trim().toLowerCase();
  let result = games;

  if (titleNeedle) {
    result = result.filter((game) => game.title.toLowerCase().includes(titleNeedle));
  }

  if (state.genre !== "all") {
    result = result.filter((game) => game.genre === state.genre);
  }

  if (state.sort === "rating") {
    result = [...result].sort((a, b) => b.userRating - a.userRating);
  } else if (state.sort === "alphabetical") {
    result = [...result].sort((a, b) => a.title.localeCompare(b.title));
  } else {
    result = [...result].sort((a, b) => b.addedAt - a.addedAt);
  }

  return result;
};

const updateGenreFilter = () => {
  const genres = getUniqueGenres();
  refs.genreFilter.innerHTML = genres
    .map((genre) => {
      const selected = state.genre === genre ? "selected" : "";
      const label = genre === "all" ? "All Genres" : genre;
      return `<option value="${genre}" ${selected}>${label}</option>`;
    })
    .join("");
};

const renderSuggestions = () => {
  const suggestions = state.suggestions.slice(0, 5);
  if (!suggestions.length) {
    refs.suggestionsList.innerHTML = "";
    return;
  }

  refs.suggestionsList.innerHTML = suggestions
    .map(
      (suggestion) => `
      <li class="suggestion-item">
        <div>
          <strong>${suggestion.title}</strong>
          <p class="muted">${suggestion.genre || "Unknown genre"} · ${suggestion.releaseYear || "N/A"}</p>
        </div>
        <button class="btn btn-small" data-select-suggestion="${suggestion.id}" aria-label="Select ${suggestion.title}">
          Use
        </button>
      </li>
    `
    )
    .join("");
};

const renderCard = (game) => `
  <article class="game-card" data-status-card data-game-id="${game.id}" draggable="true">
    ${
      game.cover
        ? `<img class="game-cover" src="${game.cover}" alt="${game.title} cover artwork" />`
        : ""
    }
    <div class="game-card-header">
      <span class="pill">${game.genre || "Unknown"}</span>
      <h4>${game.title}</h4>
    </div>
    <div class="stars" aria-label="User rating">${formatStars(game.userRating)}</div>
    <div class="card-actions">
      <button class="btn btn-small" data-open-detail="${game.id}" aria-label="Open details for ${game.title}">Details</button>
      <div class="card-tier-row">
        <button class="btn btn-small btn-tier" data-tier-add="${game.id}" aria-label="Add ${game.title} to tier list">Add to Tier</button>
        <button class="btn btn-icon" data-delete="${game.id}" aria-label="Delete ${game.title}">
          <svg viewBox="0 0 24 24" class="trash-icon" aria-hidden="true" focusable="false">
            <path d="M4 7h16M9 7V5h6v2m-7 0l1 12h6l1-12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  </article>
`;

const renderLists = () => {
  STATUSES.forEach((status) => {
    refs.lists[status].innerHTML = "";
  });

  const filtered = applySearchFilterSort(state.games);

  STATUSES.forEach((status) => {
    const gamesInStatus = filtered.filter((game) => game.status === status);
    refs.counts[status].textContent = String(gamesInStatus.length);
    refs.lists[status].setAttribute("data-status-dropzone", "true");
    refs.lists[status].setAttribute("data-status", status);
    refs.lists[status].innerHTML = gamesInStatus.map(renderCard).join("");
  });
};

const renderModal = () => {
  const game = state.games.find((item) => item.id === state.activeGameId);
  if (!game) return;

  const initialRating = game.userRating && game.userRating >= 1 ? game.userRating : 0;
  const addToTier = game.tier !== null && game.tier !== undefined && game.tier !== "";
  const tierValue = addToTier ? game.tier : "None";
  refs.modalBody.innerHTML = `
    <section class="detail-grid">
      <h2 id="modal-title">${game.title}</h2>
      <p class="muted">${game.genre} · ${game.releaseYear}</p>
      <label>
        <span>Game Title</span>
        <input id="detail-title" type="text" value="${game.title}" />
      </label>
      <label>
        <span>Platform</span>
        <input id="detail-platform" type="text" value="${game.platform}" />
      </label>
      <label>
        <span>Status</span>
        <select id="detail-status">
          ${STATUSES.map((status) => `<option value="${status}" ${status === game.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      <div class="star-rating-field">
        <span>Your Rating</span>
        <input type="hidden" id="detail-user-rating-value" value="${initialRating > 0 ? initialRating : ""}" />
        <div
          id="detail-star-group"
          class="star-rating"
          role="radiogroup"
          aria-label="User rating from 1 to 5 stars"
          data-star-hidden="detail-user-rating-value"
        >
          <button type="button" class="star-rating-btn" data-star-rating-btn data-star-value="1" aria-label="1 out of 5 stars" aria-pressed="false">★</button>
          <button type="button" class="star-rating-btn" data-star-rating-btn data-star-value="2" aria-label="2 out of 5 stars" aria-pressed="false">★</button>
          <button type="button" class="star-rating-btn" data-star-rating-btn data-star-value="3" aria-label="3 out of 5 stars" aria-pressed="false">★</button>
          <button type="button" class="star-rating-btn" data-star-rating-btn data-star-value="4" aria-label="4 out of 5 stars" aria-pressed="false">★</button>
          <button type="button" class="star-rating-btn" data-star-rating-btn data-star-value="5" aria-label="5 out of 5 stars" aria-pressed="false">★</button>
        </div>
      </div>
      <p><strong>RAWG Rating:</strong> ${game.rawgRating ?? "Not available yet"}</p>
      <label>
        <span>Notes / Mini Review</span>
        <textarea id="detail-notes" rows="5" placeholder="Your experience...">${game.notes || ""}</textarea>
      </label>
      <label class="checkbox-label">
        <input id="detail-tier-checkbox" type="checkbox" ${addToTier ? "checked" : ""} />
        <span>Add to Tier List</span>
      </label>
      <div id="detail-tier-panel" class="tier-radio-panel" ${addToTier ? "" : "hidden"}>
        <fieldset id="detail-tier-fieldset" class="tier-radio-fieldset" ${addToTier ? "" : "disabled"}>
          <legend class="tier-radio-legend">Tier level</legend>
          <div class="tier-radio-grid" role="presentation">
            ${["S", "A", "B", "C", "D", "None"]
              .map(
                (value) => `
              <label class="tier-radio-option">
                <input type="radio" name="detail-tier" value="${value}" ${tierValue === value ? "checked" : ""} />
                <span>${value}</span>
              </label>
            `
              )
              .join("")}
          </div>
        </fieldset>
      </div>
      <button id="save-detail-btn" class="btn btn-solid" aria-label="Save game details">Save Details</button>
    </section>
  `;

  syncStarRatingButtons(refs.modalBody.querySelector("#detail-star-group"), initialRating);
  syncDetailTierPanelFromCheckbox();
  refs.modal.showModal();
};

const setGames = (newGames) => {
  state.games = newGames.map(normalizeGame);
  saveGames();
  updateGenreFilter();
  renderLists();
};

const addGame = (incoming) => {
  const normalized = normalizeGame(incoming);
  setGames([normalized, ...state.games]);
  triggerAutomation(normalized).catch(() => {});
};

const updateGame = (gameId, patch) => {
  const updated = state.games.map((game) =>
    game.id === gameId ? normalizeGame({ ...game, ...patch }) : game
  );
  setGames(updated);
};

const deleteGame = (gameId) => {
  setGames(state.games.filter((game) => game.id !== gameId));
};

const moveGameToStatusAndPosition = (gameId, nextStatus, beforeGameId = null) => {
  const fromIndex = state.games.findIndex((game) => game.id === gameId);
  if (fromIndex < 0) return;
  const [dragged] = state.games.splice(fromIndex, 1);
  const updated = normalizeGame({ ...dragged, status: nextStatus });

  if (beforeGameId) {
    const beforeIndex = state.games.findIndex((game) => game.id === beforeGameId);
    if (beforeIndex >= 0) {
      state.games.splice(beforeIndex, 0, updated);
      saveGames();
      renderLists();
      return;
    }
  }

  let lastInStatus = -1;
  state.games.forEach((game, index) => {
    if (game.status === nextStatus) {
      lastInStatus = index;
    }
  });

  if (lastInStatus >= 0) {
    state.games.splice(lastInStatus + 1, 0, updated);
  } else {
    state.games.push(updated);
  }

  saveGames();
  renderLists();
};

const clearStatusDropStates = () => {
  Object.values(refs.lists).forEach((listElement) => {
    listElement.classList.remove("drag-over");
  });
  document.querySelectorAll("[data-status-card]").forEach((card) => {
    card.classList.remove("drag-over");
  });
};

const handleStatusDragStart = (event) => {
  const card = event.target.closest("[data-status-card]");
  if (!card) return;
  const gameId = card.getAttribute("data-game-id");
  if (!gameId) return;
  state.draggedGameId = gameId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", gameId);
};

const handleStatusDragEnd = () => {
  clearStatusDropStates();
  state.draggedGameId = null;
};

const handleStatusDragOver = (event) => {
  const dropZone = event.target.closest("[data-status-dropzone]");
  if (!dropZone) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
};

const handleStatusDragEnter = (event) => {
  const dropZone = event.target.closest("[data-status-dropzone]");
  if (dropZone) {
    dropZone.classList.add("drag-over");
  }
  const card = event.target.closest("[data-status-card]");
  if (card) {
    card.classList.add("drag-over");
  }
};

const handleStatusDragLeave = (event) => {
  const dropZone = event.target.closest("[data-status-dropzone]");
  if (dropZone && !dropZone.contains(event.relatedTarget)) {
    dropZone.classList.remove("drag-over");
  }
  const card = event.target.closest("[data-status-card]");
  if (card && !card.contains(event.relatedTarget)) {
    card.classList.remove("drag-over");
  }
};

const handleStatusDrop = (event) => {
  const dropZone = event.target.closest("[data-status-dropzone]");
  if (!dropZone) return;
  event.preventDefault();
  const droppedId = event.dataTransfer.getData("text/plain") || state.draggedGameId;
  if (!droppedId) return;
  const nextStatus = dropZone.getAttribute("data-status");
  if (!nextStatus || !STATUSES.includes(nextStatus)) return;
  const targetCard = event.target.closest("[data-status-card]");
  const beforeGameId = targetCard?.getAttribute("data-game-id") || null;
  if (beforeGameId === droppedId) return;
  moveGameToStatusAndPosition(droppedId, nextStatus, beforeGameId);
  clearStatusDropStates();
};

const safeFetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return response.json();
};

const searchRawg = async (query) => {
  const key = getConfig().rawgApiKey;
  if (!key || query.trim().length < 2) return [];

  const endpoint = `https://api.rawg.io/api/games?key=${encodeURIComponent(
    key
  )}&search=${encodeURIComponent(query)}&page_size=5`;

  const payload = await safeFetchJson(endpoint);
  if (!payload?.results) return [];

  return payload.results.map((item) => ({
    id: String(item.id),
    title: item.name,
    cover: item.background_image || "",
    genre: item.genres?.[0]?.name || "Unknown",
    releaseYear: item.released ? new Date(item.released).getFullYear() : "N/A",
    rawgRating: item.rating ?? null
  }));
};

const fetchSingleRawg = async (title) => {
  const results = await searchRawg(title);
  if (!results.length) return null;
  return results[0];
};

const triggerAutomation = async (game) => {
  const webhook = getConfig().makeWebhookUrl;
  if (!webhook) return;
  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "game_added",
      game,
      addedAtIso: new Date(game.addedAt).toISOString()
    })
  });
};

const setAddModalExpanded = (isOpen) => {
  if (refs.openAddButton) {
    refs.openAddButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
};

const handleCloseAddModal = () => {
  refs.addGameModal?.close();
};

const syncAddTierPanelFromCheckbox = () => {
  const on = Boolean(refs.tierCheckbox?.checked);
  if (refs.addTierPanel) {
    refs.addTierPanel.hidden = !on;
  }
  if (refs.addTierFieldset) {
    refs.addTierFieldset.disabled = !on;
  }
};

const handleTierCheckboxChange = () => {
  syncAddTierPanelFromCheckbox();
};

const handleOpenAddModal = () => {
  if (!refs.addGameModal) return;
  syncStarRatingButtons(refs.addStarGroup, 0);
  syncAddTierPanelFromCheckbox();
  refs.addGameModal.showModal();
  setAddModalExpanded(true);
  refs.titleInput?.focus();
};

const handleAddGame = async (event) => {
  event.preventDefault();
  const title = refs.titleInput.value.trim();
  const platform = refs.platformInput.value.trim();
  const status = refs.statusInput.value;
  if (!title || !platform) return;

  const userRatingRaw = Number(document.querySelector("#add-game-user-rating-value")?.value);
  const userRating =
    Number.isInteger(userRatingRaw) && userRatingRaw >= 1 && userRatingRaw <= 5
      ? userRatingRaw
      : 0;
  const notes = refs.notesInput?.value?.trim() || "";
  const addToTierList = Boolean(refs.tierCheckbox?.checked);
  let tier = null;
  if (addToTierList) {
    const selectedTier = document.querySelector('input[name="add-game-tier"]:checked');
    const value = selectedTier?.value;
    const allowed = ["S", "A", "B", "C", "D", "None"];
    tier = value && allowed.includes(value) ? value : "None";
  }

  const metadata = await fetchSingleRawg(title);
  addGame({
    title,
    platform,
    status,
    genre: metadata?.genre || "Unknown",
    releaseYear: metadata?.releaseYear || "N/A",
    cover: metadata?.cover || "",
    rawgRating: metadata?.rawgRating ?? null,
    userRating,
    notes,
    tier
  });

  handleCloseAddModal();
};

const handleSuggestionSearch = async () => {
  const query = refs.titleInput.value.trim();
  if (query.length < 2) {
    state.suggestions = [];
    renderSuggestions();
    return;
  }

  state.suggestions = await searchRawg(query);
  renderSuggestions();
};

const handleSuggestionSelect = (suggestionId) => {
  const suggestion = state.suggestions.find((item) => item.id === suggestionId);
  if (!suggestion) return;
  refs.titleInput.value = suggestion.title;
  state.suggestions = [];
  renderSuggestions();
};

const handleCardActions = (event) => {
  const openId = event.target.getAttribute("data-open-detail");
  const deleteId = event.target.getAttribute("data-delete");
  const tierId = event.target.getAttribute("data-tier-add");

  if (openId) {
    state.activeGameId = openId;
    renderModal();
    return;
  }

  if (deleteId) {
    deleteGame(deleteId);
    return;
  }

  if (tierId) {
    updateGame(tierId, { tier: "None" });
    return;
  }
};

const handleModalSave = (event) => {
  const saveTrigger = event.target.getAttribute("id") === "save-detail-btn";
  if (!saveTrigger) return;
  const game = state.games.find((item) => item.id === state.activeGameId);
  if (!game) return;

  const title = document.querySelector("#detail-title")?.value?.trim() || game.title;
  const platform = document.querySelector("#detail-platform")?.value?.trim() || game.platform;
  const nextStatus = document.querySelector("#detail-status")?.value || game.status;
  const userRatingRaw = Number(document.querySelector("#detail-user-rating-value")?.value);
  const userRating =
    Number.isInteger(userRatingRaw) && userRatingRaw >= 1 && userRatingRaw <= 5
      ? userRatingRaw
      : 0;
  const notes = document.querySelector("#detail-notes")?.value?.trim() || "";
  const addToTier = Boolean(document.querySelector("#detail-tier-checkbox")?.checked);
  let tier = null;
  if (addToTier) {
    const selectedTier = document.querySelector('input[name="detail-tier"]:checked')?.value;
    const allowed = ["S", "A", "B", "C", "D", "None"];
    tier = selectedTier && allowed.includes(selectedTier) ? selectedTier : "None";
  }

  updateGame(game.id, {
    title,
    platform,
    status: nextStatus,
    userRating,
    notes,
    tier
  });

  refs.modal.close();
};

const setupEvents = () => {
  refs.openAddButton?.addEventListener("click", handleOpenAddModal);
  refs.addForm?.addEventListener("submit", handleAddGame);
  refs.addGameCancel?.addEventListener("click", handleCloseAddModal);
  refs.addGameCloseX?.addEventListener("click", handleCloseAddModal);
  refs.addGameModal?.addEventListener("close", () => {
    setAddModalExpanded(false);
    refs.addForm?.reset();
    syncStarRatingButtons(refs.addStarGroup, 0);
    syncAddTierPanelFromCheckbox();
    state.suggestions = [];
    renderSuggestions();
  });
  refs.tierCheckbox?.addEventListener("change", handleTierCheckboxChange);
  refs.addGameModal?.addEventListener("click", handleStarRatingClick);
  refs.titleInput?.addEventListener("input", handleSuggestionSearch);
  refs.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderLists();
  });
  refs.sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderLists();
  });
  refs.genreFilter.addEventListener("change", (event) => {
    state.genre = event.target.value;
    renderLists();
  });

  refs.suggestionsList.addEventListener("click", (event) => {
    const suggestionId = event.target.getAttribute("data-select-suggestion");
    if (!suggestionId) return;
    handleSuggestionSelect(suggestionId);
  });

  Object.values(refs.lists).forEach((listElement) => {
    listElement.addEventListener("click", handleCardActions);
    listElement.addEventListener("dragstart", handleStatusDragStart);
    listElement.addEventListener("dragend", handleStatusDragEnd);
    listElement.addEventListener("dragover", handleStatusDragOver);
    listElement.addEventListener("dragenter", handleStatusDragEnter);
    listElement.addEventListener("dragleave", handleStatusDragLeave);
    listElement.addEventListener("drop", handleStatusDrop);
  });

  refs.modalBody.addEventListener("click", (event) => {
    handleStarRatingClick(event);
    handleModalSave(event);
  });
  refs.modalBody.addEventListener("change", (event) => {
    if (event.target.getAttribute("id") === "detail-tier-checkbox") {
      syncDetailTierPanelFromCheckbox();
    }
  });
};

const init = () => {
  setGames(loadGames());
  setupEvents();
};

init();
