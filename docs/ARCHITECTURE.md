# ProdTag Architecture

## Product Summary

ProdTag is a lightweight desktop app that lets developers assign short producer-tag-style audio clips to terminal events.

The app should feel like a modern control center: users import sounds, preview them, create playlists, assign them to command rules, manage integrations, configure hotkeys, and control whether ProdTag is listening.

The core behavior must work even when the desktop UI is closed.

## Final Stack

- Desktop app: Wails v2
- Backend/helper language: Go
- Frontend: React + Tailwind CSS
- Local storage: JSON config + local app data sound library
- Audio normalization/conversion: FFmpeg
- Audio playback: Go helper using an audio playback abstraction
- Shell integrations: zsh, bash, PowerShell
- Git hooks: skipped in v1

## High-Level Architecture

```text
Terminal shell integration
        ↓
Reports completed matching commands
        ↓
ProdTag background helper
        ↓
Loads rules, checks command + exit code
        ↓
Plays assigned sound asynchronously

Desktop UI
        ↓
Manages sounds, playlists, rules, hotkeys, integrations, settings
        ↓
Writes config and lightweight matcher cache
```

## Components

### 1. Desktop UI

The Wails app is the main user-facing control panel.

Pages:

- Dashboard
- Sounds
- Rules / Events
- Hotkeys
- Integrations
- Settings

The UI should be clean, obvious, and beginner-friendly. Users should not need to edit config files manually.

### 2. Background Helper

The helper is a small Go process that can run without the UI.

Responsibilities:

- Start at login if enabled.
- Receive terminal events from shell integrations.
- Match commands against rules.
- Play audio asynchronously.
- Respect listening/mute state.
- Handle global hotkeys where possible.
- Keep resource usage low while idle.

Target behavior:

- UI closed: sounds still work.
- Helper idle: near-zero CPU usage.
- Command execution: no noticeable terminal delay.

### 3. Shell Integrations

Shell integrations detect completed commands and send events to the helper.

Supported in v1:

- zsh: primary macOS/Linux target
- bash: common Linux/macOS fallback
- PowerShell: primary Windows target

A terminal event contains:

```json
{
  "command": "npm test",
  "exitCode": 0,
  "durationMs": 8400,
  "shell": "zsh"
}
```

The shell integration should use a generated matcher cache so it only calls the helper for commands that might match a user rule. This avoids running ProdTag logic after every tiny command like `ls`, `cd`, or `pwd`.

### 4. Config and App Data

ProdTag stores all settings locally.

Suggested app data locations:

- macOS: `~/Library/Application Support/ProdTag/`
- Windows: `%APPDATA%/ProdTag/`
- Linux: `~/.config/prodtag/` and `~/.local/share/prodtag/`

Main files:

```text
config.json
matcher-cache.json
sounds/
  originals/
  processed/
logs/
```

The UI should be the source of truth for edits. Manual config editing is optional/debug-only.

## Audio Strategy

Users may import common formats such as MP3, WAV, M4A, FLAC, or OGG.

For v1, keep the original file and create a normalized internal playback copy.

Recommended v1 internal format:

```text
Normalized WAV
```

Reason:

- Fast and simple playback.
- Easier cross-platform reliability.
- Less codec pain in the helper.
- Storage cost is acceptable for short producer tags.

Later versions can support normalized MP3/OGG storage if needed.

Import pipeline:

```text
User drops file
↓
Copy original
↓
Read metadata
↓
Normalize loudness
↓
Convert to internal playback WAV
↓
Save sound record
↓
Update UI
```

The UI must show real progress steps, not only a generic spinner.

Example statuses:

- Importing file...
- Reading metadata...
- Normalizing volume...
- Creating playback copy...
- Saving sound...
- Done

## Rules / Events Model

Events are command-rule presets, not Git hooks.

Rule fields:

- Name
- Enabled/disabled
- Pattern
- Match type: exact, startsWith, contains, regex
- Condition: success, failure, any
- Assigned sound or playlist
- Optional cooldown
- Optional chance/probability

Built-in presets:

- Git commit success/fail
- Git push attempt/success/fail
- Test success/fail
- Build success/fail
- Custom command success/fail

Examples:

```text
Rule: Git push success
Match: startsWith `git push`
Condition: success
Playlist: Git Success Tags
```

```text
Rule: npm test fail
Match: exact `npm test`
Condition: failure
Playlist: Test Failure Tags
```

## Listening and Mute States

Use clear states:

- Listening On: events are processed and sounds play.
- Listening Paused: terminal events are ignored.
- Muted: events are logged but audio does not play.
- Stop Audio: immediately stops current playback.

## Hotkeys

V1 hotkeys:

- Stop current audio
- Toggle listening on/off
- Mute/unmute
- Open app

Hotkeys should be configurable from the UI because OS-level shortcuts can conflict.

## Git Hooks Decision

Git hooks are skipped in v1.

Reason:

- ProdTag detects commands through shell integrations.
- `git commit` and `git push` are handled as normal command rules.
- Hooks add repo-specific complexity.
- Hooks are only needed later for Git actions triggered outside the terminal, such as VS Code Git UI or GitHub Desktop.

Possible later feature:

- Optional Git hook mode for GUI Git clients.

## Performance Rules

ProdTag must stay lightweight.

Rules:

- The UI must not be required for playback.
- The helper must be idle most of the time.
- The shell integration must pre-filter commands using a small matcher cache.
- Audio playback must be async/non-blocking.
- Normalization happens only during import, not during playback.
- Avoid heavy parsing after every terminal command.

## Non-Goals for v1

- Cloud sync
- Accounts/login
- Marketplace
- Built-in AI audio generation
- Git GUI detection
- Per-repo profiles
- AI agent completion detection
- Advanced analytics
