# Finbar design system v1

Internal UI primitives live in **`frontend/src/components/ui/`** and are exported from **`frontend/src/components/ui/index.ts`**. Global tokens are in **`frontend/src/styles/tokens.css`** (imported from `style.css`).

## Principles

- **Mobile-first:** default layouts stack; use `sm:` / `md:` for wider breakpoints. Main shell uses `max-w-5xl` (`finbar-main`); large-text mode widens to `max-w-6xl` (see `style.css`).
- **Color:** zinc neutrals + **emerald** for primary actions; **violet** for auth CTAs (`FinbarButton` `accent` variant).
- **Large-text mode:** `html.finbar-large-text` (from Settings) scales root `rem`, line-height, nav padding, and minimum control heights — components should rely on rem-based Tailwind spacing and tokens rather than fixed pixels.

## Tokens (CSS variables)

| Token | Role |
|-------|------|
| `--finbar-radius*` | Border radius (sm / default / lg / xl) |
| `--finbar-space-*` | Reference spacing (field gap, section, page) — large-text overrides in `tokens.css` |
| `--finbar-color-*` | Semantic colors (bg, surface, border, text, accent, danger, warning) |
| `--finbar-text-*` | Reference font sizes for titles / body / labels |
| `--finbar-touch-min` | Minimum touch target (44px) reference |

## Components

| Component | Use for |
|-----------|---------|
| `FinbarButton` | Primary/secondary/ghost/danger/accent actions; `block` for full width |
| `FinbarInput` | Labelled text inputs (`v-model`, `error`, `hint`) |
| `FinbarTextarea` | Multi-line fields |
| `FinbarSelect` | Native `<select>` with slot for `<option>`s |
| `FinbarToggle` | Checkbox row with title + description (e.g. settings) |
| `FinbarCard` | Bordered surface; `padding` none/sm/md |
| `FinbarBadge` | Status chips (`neutral` / `success` / `warning` / `danger`) |
| `FinbarSheet` | Slide-over (`side="bottom" \| "end"`), `v-model`, Escape + backdrop close |
| `FinbarDialog` | Centered modal, optional `title` / `footer` slots |
| `FinbarPageHeader` | Page title + optional `#description` and `#actions` |

## Usage

```ts
import { FinbarButton, FinbarInput, FinbarPageHeader } from "@/components/ui";
```

Prefer these primitives on **new** screens; migrate existing views opportunistically (auth and Settings already use them).

## Non-goals (v1)

- Full token coverage of every Tailwind utility
- Perfect focus trap in dialogs (Escape + backdrop only)
- Design tokens for dark/light theme switch (single dark theme for MVP)
