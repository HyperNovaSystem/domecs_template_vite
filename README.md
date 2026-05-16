# DOMECS Vite Template

Official Vite app template for DOMECS.

This template starts on an interactive app screen, not a landing page. The demo
is intentionally small and shows the core DOMECS system fx in one world:

- `once` boots one-time scene state.
- `fixed` advances deterministic pulse lifetimes.
- `tick` moves entities from time and input.
- `event` turns user actions into world events.
- `reactive` observes `Changed(Position)` after systems mutate components.

## Scripts

```sh
npm install
npm run dev
npm test
npm run build
```

## Notes

The app uses `@domecs/core`, `@domecs/dom`, and `@domecs/input`. Pressing the
Pulse button or clicking the stage emits a `SpawnPulse` event; holding movement
keys moves the player entity through the tick system.

## Testing

Vitest runs in the **node** environment by default — pure-logic specs stay
fast and need no DOM shim. Tests that touch the DOM should be named
`*.dom.test.ts`; the Vite config switches those files to **happy-dom** via
`environmentMatchGlobs`. Keep DOM coverage scoped: prefer extracting logic
into pure modules and asserting on those instead.

## Deployment

`npm run build` writes a static Vite bundle to `dist/`. Pick the recipe that
matches your host:

### Generic static host (Netlify, Vercel, Cloudflare Pages, S3, nginx)

The default `base: './'` produces relative asset URLs that work from any path:

```sh
npm run build
# upload dist/ to the host
```

### GitHub Pages — project site (`https://<user>.github.io/<repo>/`)

Project sites are served from a subdirectory, so the bundle needs an absolute
`base` that matches the repo name:

```sh
BASE_PATH=/my-game/ npm run build
# publish dist/ to the gh-pages branch, or use actions/upload-pages-artifact
```

If you deploy from `gh-pages`, add an empty `.nojekyll` file at the root of
`dist/` so Pages serves the Vite chunk filenames verbatim:

```sh
BASE_PATH=/my-game/ npm run build && type nul > dist/.nojekyll   # Windows
BASE_PATH=/my-game/ npm run build && touch dist/.nojekyll        # macOS/Linux
```

### GitHub Pages — user/organization site (`https://<user>.github.io/`)

User sites are served from the domain root, so the default base works:

```sh
npm run build
```

### itch.io

itch.io extracts the uploaded zip into an opaque subdirectory and serves it
through an iframe. Relative URLs are required — keep the default base:

```sh
npm run build
# zip the contents of dist/ (not the dist/ folder itself) and upload as "HTML"
```

Set the "This file will be played in the browser" project option and point
itch.io at `index.html`.

### Subdirectory on an existing site

Build with the absolute deploy path and copy `dist/` underneath the site root:

```sh
BASE_PATH=/games/my-game/ npm run build
rsync -a dist/ user@host:/var/www/site/games/my-game/
```

### Verifying a built bundle

`npm run preview` serves `dist/` locally on the same `base`, which catches
broken asset URLs before the bundle hits a real host.
