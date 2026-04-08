# twitter-media-portfolio

Turn your Twitter/X media posts into a visual portfolio. Clone, connect your profile, and get an instant media grid you can curate and share.

## Quick Start

Requires **Node.js 20+** and **Chrome logged into x.com** (macOS).

```bash
git clone https://github.com/Nomanjack/twitter-media-portfolio.git
cd twitter-media-portfolio
npm install
```

### With Claude Code

Open the project in [Claude Code](https://claude.com/claude-code) and say:

> Set up my portfolio for @yourusername

Claude will configure everything, sync your posts, and start the preview.

### Manual Setup

1. Edit `portfolio.config.json` — set your handle
2. Sync your media:
   ```bash
   node sync-media.js
   ```
3. Start the server:
   ```bash
   node server.js
   ```
4. Open **http://localhost:3000**

## Features

- **3 layouts** — Masonry (infinite pan), Grid, Feed — all with 360° vertical looping
- **Edit mode** — Click the pencil to toggle. Click posts to show/hide. Saved to config automatically.
- **Light/Dark theme** — Respects system preference, toggleable
- **Lightbox** — Click any post to view full-size with a link to the original tweet
- **Infinite pan** — Drag to explore your media in any direction

## Configuration

`portfolio.config.json`:

```json
{
  "handle": "yourusername",
  "maxPosts": 200,
  "hiddenIds": []
}
```

| Key | Description |
|-----|-------------|
| `handle` | Your Twitter/X username (without @) |
| `maxPosts` | How many posts to fetch (default 200) |
| `hiddenIds` | Tweet IDs hidden from portfolio (managed via edit mode) |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Query not found" | Twitter's GraphQL query IDs change. Open x.com in Chrome DevTools → Network → filter `graphql` → update IDs in `sync-media.js` |
| "No ct0 cookie found" | Log into x.com in Chrome first |
| Port 3000 in use | `PORT=3001 node server.js` |

## Tech

- Vanilla JS — no framework
- [Motion One](https://motion.dev) for spring animations
- DOM pooling (~500 elements) for smooth virtualized rendering
- Twitter GraphQL API with Chrome cookie auth

## Credits

Built on top of [@daniel__designs](https://twitter.com/daniel__designs)' twitter-bookmarks-grid.

## License

MIT
