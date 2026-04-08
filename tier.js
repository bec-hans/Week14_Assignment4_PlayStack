const STORAGE_KEY = "playstack.games";
const TIERS = ["S", "A", "B", "C", "D", "None"];

const refs = {
  board: document.querySelector("#tier-board"),
  copyButton: document.querySelector("#copy-tier-link"),
  resetButton: document.querySelector("#reset-tier-link")
};

let games = [];
let isSharedView = false;

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

const getTierGroups = () => {
  return TIERS.reduce((acc, tier) => {
    acc[tier] = games.filter((game) => (game.tier || "None") === tier);
    return acc;
  }, {});
};

const renderBoard = () => {
  const tierGroups = getTierGroups();
  refs.board.innerHTML = TIERS.map((tier) => {
    const cards = tierGroups[tier]
      .map(
        (game) => `
      <article class="game-card">
        <div class="game-card-header">
          <div>
            <h4>${game.title}</h4>
            <p class="muted">${game.platform || "Unknown platform"}</p>
          </div>
          <span class="pill">${game.genre || "Unknown"}</span>
        </div>
        <label>
          <span>Change Tier</span>
          <select data-tier-change="${game.id}">
            ${TIERS.map((value) => `<option value="${value}" ${value === (game.tier || "None") ? "selected" : ""}>${value}</option>`).join("")}
          </select>
        </label>
      </article>
    `
      )
      .join("");

    return `
      <section class="tier-row">
        <h3><span class="tier-tag">${tier}</span> Tier</h3>
        <div class="game-list">
          ${cards || '<p class="muted">No games in this tier yet.</p>'}
        </div>
      </section>
    `;
  }).join("");
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

const handleTierChange = (event) => {
  const id = event.target.getAttribute("data-tier-change");
  if (!id || isSharedView) return;
  games = games.map((game) =>
    game.id === id ? { ...game, tier: event.target.value } : game
  );
  saveGames();
  renderBoard();
};

const copyLink = async () => {
  const url = `${window.location.origin}${window.location.pathname}?data=${encodeSharedData()}`;
  await navigator.clipboard.writeText(url);
  refs.copyButton.textContent = "Link Copied";
  setTimeout(() => {
    refs.copyButton.textContent = "Copy Share Link";
  }, 1200);
};

const resetSharedView = () => {
  if (!isSharedView) return;
  window.location.href = `${window.location.origin}${window.location.pathname}`;
};

const init = () => {
  const sharedData = decodeSharedData();
  if (sharedData) {
    isSharedView = true;
    games = sharedData;
  } else {
    games = loadSavedGames();
  }

  renderBoard();
  refs.board.addEventListener("change", handleTierChange);
  refs.copyButton.addEventListener("click", copyLink);
  refs.resetButton.addEventListener("click", resetSharedView);
};

init();
