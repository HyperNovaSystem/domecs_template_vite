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

## Static Deployment

`npm run build` writes a static Vite build to `dist/`. For subdirectory hosts
such as GitHub Pages or itch.io, set Vite's `base` option before building.
