/**
 * Sends a JSON payload to Make.com for Google Sheets sync.
 * Skips the request when makeWebhookUrl is missing or empty.
 */
const sendGameEventToMake = async (event, game) => {
  const url = (window.PLAYSTACK_CONFIG && window.PLAYSTACK_CONFIG.makeWebhookUrl) || "";
  if (!url || String(url).trim() === "") {
    return;
  }

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        game
      })
    });
  } catch (err) {
    console.error("sendGameEventToMake failed", err);
  }
};
