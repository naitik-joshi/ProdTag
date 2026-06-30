# ProdTag Project Status

## Current Decision Summary

ProdTag is a modern desktop app for developers that plays short producer-tag-style audio clips after selected terminal commands succeed or fail.

The project started as a fun idea inspired by developer-themed rap producer tags like:

- "Hunter on the code bruh"
- "We got Landon on the stack"
- "GPT made it"

The agreed product direction is now broader:

> A desktop control center where users import sounds, group them into playlists, assign them to terminal command events, and let a tiny helper play those sounds in the background.

## Locked Product Direction

- Name: ProdTag
- Primary experience: desktop UI, not config files
- Install style: global-first
- Works when UI is closed: yes
- Core trigger system: shell integrations
- Git hooks: skipped in v1
- Target platforms from day one: macOS, Windows, Linux

## Locked Tech Stack

- Wails v2
- Go backend/helper
- React + Tailwind frontend
- FFmpeg for normalization/conversion
- Local JSON config
- Local app data sound library

## Why Wails + Go

Chosen because the app needs:

- Modern desktop UI
- Cross-platform builds
- Low-latency helper process
- Lightweight background behavior
- Easier native OS integration than a pure web app

Python was considered because it is familiar, but packaging and native-feeling cross-platform desktop behavior are weaker for this use case.

Electron/Node was considered because it is familiar and UI-friendly, but it is heavier than necessary.

Go is new to the project owner, but acceptable because Codex/AI coding will be used and Go fits the performance/background-helper requirements.

## Audio Decision

Users can import common audio files, including MP3.

Internally, v1 should keep the original file but create a normalized WAV playback copy.

Reason:

- Producer tags are short, so storage is acceptable.
- WAV playback is simpler and reliable.
- Normalization happens once at import time.
- Runtime playback should be fast and boring.

## V1 Feature Scope

V1 should include:

- Modern desktop UI
- Sound import via drag/drop
- Sound preview
- Sound rename/delete
- Sound groups/playlists
- Automatic normalization on import
- Visible import progress steps
- Rule/event manager
- Custom command rules
- Success/failure matching
- Git commit/push presets
- Test/build presets
- zsh integration
- bash integration
- PowerShell integration
- Background helper
- Works when UI is closed
- Startup helper option
- Hotkey management
- Stop-current-audio hotkey
- Toggle listening/mute hotkeys
- Integration doctor

## Important Architecture Agreement

The desktop app does not directly watch every terminal command.

Instead:

```text
Shell integration detects completed commands
↓
Shell sends command + exit code + duration to helper
↓
Helper matches rule
↓
Helper plays assigned sound
```

The shell integration should use a lightweight generated matcher cache so it does not call the helper after every command.

## Git Hooks Decision

Git hooks are not needed for v1.

Reason:

- `git commit` and `git push` can be detected as normal terminal commands.
- Hooks make setup more complicated.
- Hooks are mostly useful for Git actions triggered outside the terminal, such as VS Code Git UI or GitHub Desktop.

Possible later feature:

- Optional Git hook mode for GUI Git clients.

## UX Priorities

ProdTag should feel simple and obvious.

Important UX rules:

- No manual config editing required.
- Drag/drop sounds should feel instant and clear.
- Long import work should show actual progress text.
- Rules should be understandable by non-experts.
- Hotkeys should be configurable.
- Dashboard should clearly show helper/listening/integration status.
- The app should not noticeably slow terminal commands.
- the app should have user centric UX elements/QOL like hover tooltips, hint messages and guides(eg: the audio import may say with a muted text "drag and drop file or multiple file), error messages with reasons, progress messages to keep users hooked like what is happening when a certain process is doing it's work showing some messages with spinners.

## Main Risk Areas

- Cross-platform shell integration differences.
- Global hotkey behavior across OSes.
- Audio playback reliability in background helper.
- Packaging FFmpeg or requiring FFmpeg installation.
- Startup helper registration across macOS, Windows, and Linux.

## Build Philosophy

Build the real v1 quickly, but avoid unnecessary extras.

This is allowed to be fun and meme-like, but the underlying tool should be reliable enough that friends can install it and immediately understand how to use it.
