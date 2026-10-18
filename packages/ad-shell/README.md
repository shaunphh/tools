# @ad/shell — the shell and the UI kit

What every Alternative Dublin tool wears (19 October 2026), so the three read as products from one place.

- `shell.css` + `shell.ts`: the masthead (`masthead(current, { tool, actions, title })`) and `applyUiTokens()`, which puts the `ui` tokens on the page as `--ad-ui-*`.
- `ui.css` + `ui.ts`: the kit below, and three helpers: `toast(message, error?)`, `dialog({ title, body, foot, eyebrow })`, `bindSegmented(group, pick)`.

Every value comes from the `ui` family in `packages/ad-tape/src/ad-tokens.json`; change it there and the three tools and the board follow. The kit page, `/tape-type/board/ui.html`, shows every primitive in every state.

## The parts

| Class | What it is |
| --- | --- |
| `.ad-btn` + `--primary` (the one yellow action) `--dark` `--quiet` `--icon` `--sm` `--danger` `--link` | buttons |
| `.ad-field` (a label wrapping `span` + `input`/`textarea`/`select` + `small` hint), `--locked`, `--big`; `.ad-field-pair`; `.ad-label`; `.ad-input` | fields |
| `.ad-range` (label: `span` with an `output`, then `input[type=range]`) | ranges with a readout |
| `.ad-switch` (label: text, `input[type=checkbox]`, `span.ad-switch__track`), `.ad-check` | switches and checkboxes |
| `.ad-segmented` (buttons with `.active`), `.ad-chips` / `.ad-chip` | one-of-many |
| `.ad-rail` `.ad-stage` `.ad-inspector`, `.ad-rail-head`, `.ad-inspector-head`, `.ad-panel`, `.ad-section`, `.ad-rule`, `.ad-eyebrow` | surfaces and headings |
| `.ad-hint` (+ `--ok` `--warn` `--bad`), `.ad-muted`, `.ad-note` (+ states), `.ad-status` (+ states), `.ad-count` (+ `--over`), `.ad-tag`, `.ad-empty`, `.ad-list` | words for a state |
| `.ad-dialog` (`__head` `__body` `__foot`), `.ad-toast` (+ `--error`) | dialogs and toasts |

## The conventions

- **Layout**: the rail on the left (pages, or the source), the pages in the middle on the stage, the inspector on the right. The Event Guide has no inspector; its controls are its rail.
- **The one yellow**: `--primary` is for the action the screen is for (Export, Save to team, Load the Sheet). Everything else is dark, secondary or quiet.
- **Export**: the same words in every tool. The strip says **Export** with **1×** / **2×** beside it; files are `01-name.png` and `01-name@2x.png`; a ZIP carries the same names.
- **States, in the same words**: *Saved on this browser* · *Saving…* · *Exporting…* · *Exported* · *Couldn't …* (an error always says what to do next). A fit is *Everything fits*; an overflow says which page and how far.
- **Sentence case** for every label and button. Capitals only in eyebrows and tags.
- **Keyboard**: ⌘S saves where there is a save; ⌘Z / ⇧⌘Z undo and redo; ↑ ↓ move between pages; Esc closes a dialog.
- **Dialogs** for decisions, **toasts** for outcomes, **notes** (`.ad-note`) for things to read before acting. Never a browser alert.
