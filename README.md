# PlayStack - Game Backlog Tracker

PlayStack is a clean, interactive backlog tracker for organizing games into `Wishlist`, `Playing`, and `Completed`, with personal ratings, notes, and a shareable tier system.

## Features

- Add games manually (`title + platform + status`) and instantly render cards
- Suggested game results from RAWG as you type
- Auto-fill game metadata (cover, genre, release year, RAWG rating) when adding
- Move games between status categories
- Detail view with:
  - User rating (1-5)
  - Notes / mini-review
  - Status updates
  - RAWG community rating
- Search and filter by title, sort by recent/rating/alphabetical, and filter by genre
- Tier List page with S/A/B/C/D/None tiers and shareable link export
- Make.com webhook trigger on game add event (for automation workflows like weekly email summaries)

## Tech Stack

- HTML
- CSS
- JavaScript (vanilla)
- RAWG API
- Make.com webhook integration

## Project Structure

- `index.html` - main library page
- `tier.html` - tier list page
- `styles.css` - shared styles
- `app.js` - library app logic
- `tier.js` - tier page logic

## Setup

1. Clone the repository:
   - `git clone https://github.com/bec-hans/Week14_Assignment4_PlayStack.git`
2. Open the project folder.
3. In `index.html`, update:
   - `window.PLAYSTACK_CONFIG.rawgApiKey`
   - `window.PLAYSTACK_CONFIG.makeWebhookUrl` (optional)
4. Launch with a local static server (recommended), for example:
   - `python -m http.server 5500`
5. Open:
   - `http://localhost:5500/index.html`

## Make.com Automation Example

When a user adds a game, the app posts:

- `event: "game_added"`
- game object payload
- timestamp

to your Make.com webhook URL. In Make, you can:

- receive the payload
- query RAWG or enrich data
- store in Airtable/Notion/Sheets
- send weekly "Your Gaming Summary" emails

## Design Notes

- Questrial Google Font
- Black/white foundation with cyan accent color
- Geometric lines, borders, and cards for a curated collection feel
- Mobile-first responsive layout
