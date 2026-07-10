---
name: verify
description: How to launch and drive this app to verify a change end-to-end (dev server + Playwright).
---

# Verifying Piano Tutor changes

Browser app (Vite + Svelte 5, hash router). Verify UI changes by driving the
real app, not by re-running vitest.

## Launch

```bash
npm run dev > /tmp/dev.log 2>&1 &   # port 5173, or next free — grep the log
grep -o "http://localhost:[0-9]*/piano-tutor/" /tmp/dev.log | head -1
```

The app is served under the `/piano-tutor/` base path (GitHub Pages deploy);
the bare origin shows a Vite hint page, not the app.

## Drive

Playwright is in the root repo's node_modules. From a worktree, import it by
absolute path (NODE_PATH does not apply to ESM):

```js
import { chromium } from '/Users/steli/src/piano-tutor/node_modules/playwright/index.mjs'
```

- Routes are hash-based: `http://localhost:PORT/piano-tutor/#/circle?key=Gb`.
- **Hash-only `page.goto` does NOT remount the current screen** — screens read
  deep-link params once at mount. To test a deep link, load a different route
  first (or a fresh page), then navigate.
- GuideScreen's expanded-stages state is module-level and survives in-page
  navigation: clicking a stage header twice closes it again.
- Collect `pageerror`/console errors on every run; screenshots to the scratchpad.

## Gotchas

- Mic/voice flows can't be driven headless (no getUserMedia in headless shell);
  the pure layers (parser/dispatcher/detection) are the vitest-covered surface
  for those — see CLAUDE.md conventions.
- Kill the server afterwards: `lsof -ti :PORT | xargs kill`.
