# ProdTag Project Progress

## Current Context

ProdTag is a Wails v2 desktop app with a Go backend/helper direction and a React + Tailwind frontend. The agreed product shape is a local control center for developer terminal sound tags, with shell integrations and a small background helper planned later.

## Completed

- Phase 1: Skeleton app foundation.
  - Wails app runs.
  - React + Tailwind frontend is wired.
  - Dashboard, Sounds, Rules, Hotkeys, Integrations, and Settings pages exist.
  - Go config service loads and saves local JSON config.
  - App data folders are created for config, matcher cache, sounds, processed sounds, and logs.
- Phase 1.1: Cleanup and UI foundation.
  - Main UI was split into reusable components and page-level components.
  - Design tokens and consistent component classes were added.
  - Settings copy now clearly distinguishes Listening from Muted behavior.
  - Loading state now uses ProdTag-specific copy.
  - Path rows now wrap long paths and include disabled Copy/Open placeholders.

## Current UX Direction

- Keep the dark sidebar, warm off-white app background, soft white cards, rounded corners, subtle badges, and clean local-control-center feel.
- Keep beginner-friendly copy in the UI.
- Avoid building sound import, helper, playback, hotkeys, or shell integrations before their roadmap phases.

## Process Notes

- After each implementation prompt, update this file with completed work, decisions, and next-step notes.
- Also update `docs/ROADMAP.md` with checkboxes or completion notes when a phase/subphase changes.
- When a dev server is started for verification, stop it before finishing unless the user explicitly asks to leave it running.
- Final responses should include what changed, what to test, build/test results, and a brief retrospective with suggestions or risks.

## Next Up

- Phase 2: Sound Library.
- Start with drag-and-drop import UI and the sound record flow, but avoid audio playback/helper work until later phases.
