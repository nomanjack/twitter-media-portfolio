# Twitter Media Portfolio

A visual portfolio generated from your Twitter/X media tab.

## Setup Flow

When a user asks to "set up my portfolio" or "link my Twitter", follow these steps:

1. Ask for their **Twitter handle** (without the @)
2. Ask how many posts they want to show (default: 200)
3. Update `portfolio.config.json` with their handle and maxPosts
4. Run `node sync-media.js` to fetch their media posts and profile info
5. Run `node server.js` to start the local server
6. Tell them to open http://localhost:3000 to preview
7. Explain they can click the **pencil icon** in the toolbar to enter edit mode, then click posts to show/hide them. Changes are saved automatically to `portfolio.config.json`.

## GraphQL Query IDs

Twitter's GraphQL query IDs change when they update their web app. If `sync-media.js` fails:

- `UserByScreenName`: currently `NimuplG1OB7Fd2btCLdBOw`
- `UserMedia`: currently `y4E0HTZKPhAOXewRMqMqgw`

To find current IDs: open Chrome DevTools Network tab on x.com, filter by `graphql`, and look at the request URLs.

## Project Structure

- `portfolio.config.json` — handle, maxPosts, hiddenIds (user config)
- `portfolio-data.json` — fetched posts + profile (generated, gitignored)
- `sync-media.js` — fetches media posts via Twitter GraphQL API
- `server.js` — local dev server with API endpoint for saving hidden IDs
- `app.js` — frontend: masonry/grid/feed layouts, lightbox, edit mode, theming
- `style.css` — styles with light/dark theme support, design system aligned
- `assets/` — custom SVG icons (masonry, grid, feed, edit, theme)

## Requirements

- Node.js 20+
- Chrome logged into x.com (for cookie-based auth)
- macOS (for Keychain cookie decryption)
