const STORAGE_KEY = "playstack.games";
const STATUSES = ["Wishlist", "Playing", "Completed"];

const state = {
  games: [],
  suggestions: [],
  activeGameId: null,
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
  userRatingInput: document.querySelector("#add-game-user-rating"),
  notesInput: document.querySelector("#add-game-notes"),
  tierCheckbox: document.querySelector("#add-game-tier-checkbox"),
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
  <article class="game-card">
    ${
      game.cover
        ? `<img class="game-cover" src="${game.cover}" alt="${game.title} cover artwork" />`
        : ""
    }
    <div class="game-card-header">
      <div>
        <h4>${game.title}</h4>
        <p class="muted">${game.platform}</p>
      </div>
      <span class="pill">${game.genre || "Unknown"}</span>
    </div>
    <div class="stars" aria-label="User rating">${formatStars(game.userRating)}</div>
    <div class="card-actions">
      <button class="btn btn-small" data-open-detail="${game.id}" aria-label="Open details for ${game.title}">Details</button>
      <button class="btn btn-small" data-move="${game.id}" data-direction="prev" aria-label="Move ${game.title} to previous status">Prev</button>
      <button class="btn btn-small" data-move="${game.id}" data-direction="next" aria-label="Move ${game.title} to next status">Next</button>
      <button class="btn btn-small" data-tier-add="${game.id}" aria-label="Add ${game.title} to tier list">Add to Tier</button>
      <button class="btn btn-small" data-delete="${game.id}" aria-label="Delete ${game.title}">Delete</button>
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
    refs.lists[status].innerHTML = gamesInStatus.map(renderCard).join("");
  });
};

const renderModal = () => {
  const game = state.games.find((item) => item.id === state.activeGameId);
  if (!game) return;

  refs.modalBody.innerHTML = `
    <section class="detail-grid">
      <h2 id="modal-title">${game.title}</h2>
      <p class="muted">${game.platform} · ${game.genre} · ${game.releaseYear}</p>
      <label>
        <span>Status</span>
        <select id="detail-status">
          ${STATUSES.map((status) => `<option value="${status}" ${status === game.status ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </label>
      <label>
        <span>Your Rating (1-5)</span>
        <input id="detail-user-rating" type="number" min="1" max="5" value="${game.userRating || ""}" />
      </label>
      <p><strong>RAWG Rating:</strong> ${game.rawgRating ?? "Not available yet"}</p>
      <label>
        <span>Notes / Mini Review</span>
        <textarea id="detail-notes" rows="5" placeholder="Your experience...">${game.notes || ""}</textarea>
      </label>
      <button id="save-detail-btn" class="btn btn-solid" aria-label="Save game details">Save Details</button>
    </section>
  `;

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

const moveStatus = (gameId, direction) => {
  const game = state.games.find((item) => item.id === gameId);
  if (!game) return;

  const currentIndex = STATUSES.indexOf(game.status);
  if (currentIndex < 0) return;

  const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
  if (nextIndex < 0 || nextIndex >= STATUSES.length) return;

  updateGame(gameId, { status: STATUSES[nextIndex] });
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

const handleOpenAddModal = () => {
  if (!refs.addGameModal) return;
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

  const userRatingRaw = Number(refs.userRatingInput?.value);
  const userRating =
    Number.isInteger(userRatingRaw) && userRatingRaw >= 1 && userRatingRaw <= 5
      ? userRatingRaw
      : 0;
  const notes = refs.notesInput?.value?.trim() || "";
  const addToTierList = Boolean(refs.tierCheckbox?.checked);

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
    tier: addToTierList ? "None" : null
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
  const moveId = event.target.getAttribute("data-move");

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

  if (moveId) {
    const direction = event.target.getAttribute("data-direction");
    moveStatus(moveId, direction);
  }
};

const handleModalSave = (event) => {
  const saveTrigger = event.target.getAttribute("id") === "save-detail-btn";
  if (!saveTrigger) return;
  const game = state.games.find((item) => item.id === state.activeGameId);
  if (!game) return;

  const nextStatus = document.querySelector("#detail-status")?.value || game.status;
  const userRatingRaw = Number(document.querySelector("#detail-user-rating")?.value);
  const userRating =
    Number.isInteger(userRatingRaw) && userRatingRaw >= 1 && userRatingRaw <= 5
      ? userRatingRaw
      : 0;
  const notes = document.querySelector("#detail-notes")?.value?.trim() || "";

  updateGame(game.id, {
    status: nextStatus,
    userRating,
    notes
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
    state.suggestions = [];
    renderSuggestions();
  });
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
  });

  refs.modalBody.addEventListener("click", handleModalSave);
};

const init = () => {
  setGames(loadGames());
  setupEvents();
};

init();
