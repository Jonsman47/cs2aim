# Midlane Reaction Lab

A browser-based tactical reaction trainer built with React, TypeScript, Vite, and a custom Canvas scene. It is inspired by holding a center-lane angle with double doors, but it uses only original visuals, code, and synthesized audio.

## Features

- First-person mouse aim with pointer lock and fallback hover aim
- Randomized peeks: fast cross, slow cross, jiggle, wide swing, shoulder bait, partial body, stop-and-go, fake peek, re-peek, crouch peek, and door hold
- Valid reaction timing only on successful hits against eligible targets
- Door penetration system for wallbang practice through designated door surfaces only
- Head/body hit regions with hitscan ray casting against actual hitboxes
- Visible peek, door-cross, wallbang, mixed, accuracy, session, and endless modes
- Session stats, summary, recent reaction list, local history, and persistent settings
- Raw mode for minimal-UI practice
- Lightweight custom synth audio with no external copyrighted assets

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser, start a session, then click inside the viewport to lock the cursor.

## Build

```bash
npm run build
npm run lint
```

## Controls

- `Mouse move`: aim
- `Left click`: fire
- `Esc`: release pointer lock
- UI buttons: start, reset, next rep, mode/settings changes

## Notes

- Reaction time starts when the active target first becomes visibly targetable.
- Reaction time stops only when a valid shot hits that target.
- Misses never create a reaction-time result.
- Failed reps also never create a reaction-time result.
- Door shots can count as valid wallbang hits when the bullet path passes through a designated door panel and still intersects the enemy hitbox.

## Project layout

- `src/game/engine.ts`: rep state machine, timing, shot resolution, session flow
- `src/game/hitDetection.ts`: hitboxes, visibility tests, ray casting, door penetration
- `src/game/patterns.ts`: randomized peek behavior generation
- `src/game/renderer.ts`: first-person Canvas scene rendering
- `src/components/`: menu, HUD, settings, and summary UI
