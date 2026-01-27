# LUMI UI & FAZTORE: TECHNICAL CODEX | CLAUDE | GEMINI & AGENT GUIDE

**Version:** 2.0.0 | **Framework:** Svelte 5 (Runes) | **Style:** CSS Variables & Pure Utility Classes

This is the **SINGLE SOURCE OF TRUTH** for the Faztore/Lumi UI project. It combines all technical guidelines into one definitive guide. Follow these rules strictly.

---

## it is important to consider using clean code, do not add redundant code, or incompatible code. inspect the code carefully, and follow the rules strictly. always keep the code clean, and consistent, check if functions or something resuable block are defined to use properly.

## 1. 🌟 PROJECT OVERVIEW

### About Faztore

Faztore is a modern, high-performance, secure, and scalable web application designed for efficiency.
**Key Features:**

- **Authentication & Authorization:** Secure user management.
- **Drive & Storage:** Interactive file upload and storage system for products.
- **Product Management:** Complete CRUD for categories, brands, and products.
- **Dashboard:** Advanced reporting and charting for administrators.
- **Finance:** Income, expense tracking, and balance sheet management.

### About Lumi UI

Lumi UI is the custom design system built specifically for Faztore using Svelte 5.

- **Philosophy:** Modern, interactive, and consistent (inspired by Glassmorphism, HeroUI, Vuesax).
- **Theming:** Powered exclusively by CSS variables in `src/lib/styles/tokens.css` and utilities in `src/lib/styles/lumi-core.css`.
- **Configuration:** `src/lib/config.ts` handles application-level configuration (API endpoints, etc.).
- **Components:** All components are located in `src/lib/components`.

Rules

- Lumi UI is Wip currently. Some components are not yet implemented and some are in progress.
- All card components must have rounded corners defined in `--lumi-radius-2xl`. and shadow defined in `--lumi-shadow-md`. and spacing defined in `--lumi-space-md`. Consistency, beautiful, and perfect.

---

## 2. 🧠 SYSTEM PROMPT (Mandatory Context)

**Act as a Senior Svelte 5 Architect and Lumi UI Expert.**

**Unbreakable Rules:**

1.  **Svelte 5 Runes Only:** NEVER use `export let` or Svelte 4 syntax.
    - Use `$state`, `$derived`, `$props`, `$effect`.
    - Use `{@render children()}` for slots.
    - Use `children?: Snippet` in props interfaces.
2.  **Design Tokens:** NEVER hardcode values (px, hex, rem). Use `var(--lumi-...)`.
3.  **Imports:** Import components from `$lib/components` (e.g., `import { Button } from '$lib/components';`).
4.  **Icons:** Use `<Icon icon="name" />` (Lucide wrapper). No manual SVGs.
5.  **Classes:** Use Lumi BEM (`.lumi-button`) and utilities (`.lumi-flex`).
6.  **Accessibility:** Mandatory `aria-label`, keyboard nav, focus management.
7.  **No Dependencies:** Keep dependencies minimal (only `lucide-svelte`, `@floating-ui/dom`, `kysely`).

---

## 3. 🎨 DESIGN SYSTEM (The Source of Truth)

Based on `src/lib/styles/tokens.css`.

### Golden Rules

- **Consistency:** All components must share the same rounded corners, shadows, and transitions.
- **Defaults:**
  - Radius: `--lumi-radius-md` (inputs/buttons) or `--lumi-radius-2xl` (cards/modals).
  - Shadow: `--lumi-shadow-md` by default.
  - Spacing: `--lumi-space-md` (16px) is the standard unit.

### Color System (Semantic & Palette)

Each semantic color has a full scale (50-950).

| Semantic      | Token Base               | Usage                  |
| :------------ | :----------------------- | :--------------------- |
| **Primary**   | `--lumi-color-primary`   | Brand, Primary Actions |
| **Secondary** | `--lumi-color-secondary` | Accents, Decoration    |
| **Success**   | `--lumi-color-success`   | Success states         |
| **Warning**   | `--lumi-color-warning`   | Alerts                 |
| **Danger**    | `--lumi-color-danger`    | Errors, Destructive    |
| **Info**      | `--lumi-color-info`      | Information            |

**Surfaces & Text:**

- `--lumi-color-background`: Page bg (`#f4f4f5` Light / `#09090b` Dark).
- `--lumi-color-surface`: Card/Container bg.
- `--lumi-color-text`: Main text.
- `--lumi-color-text-muted`: Secondary text.
- `--lumi-color-border`: Subtle borders.

### Spacing System (4px Base)

| Token              | Value | Use                           |
| :----------------- | :---- | :---------------------------- |
| `--lumi-space-2xs` | 4px   | Micro gaps                    |
| `--lumi-space-xs`  | 8px   | Tight grouping                |
| `--lumi-space-sm`  | 12px  | Small padding                 |
| `--lumi-space-md`  | 16px  | **STANDARD** (Gaps, Paddings) |
| `--lumi-space-lg`  | 24px  | Sections                      |
| `--lumi-space-xl`  | 32px  | Major separation              |
| `--lumi-space-2xl` | 40px  | Layouts                       |
| `--lumi-space-3xl` | 48px  | Hero sections                 |

### Radius & Shadows

- **Radius:**
  - `--lumi-radius-md` (8px): Inputs, Buttons.
  - `--lumi-radius-2xl` (24px): **Standard** for Cards, Modals, Sidebars.
  - `--lumi-radius-full` (9999px): Pills, Avatars.
- **Shadows:**
  - `--lumi-shadow-sm`: Subtle.
  - `--lumi-shadow-md`: Standard Cards.
  - `--lumi-shadow-lg`: Dropdowns.
  - `--lumi-shadow-xl`: Modals.

### Transitions

- `--lumi-transition-all`: `all 0.25s cubic-bezier(0.4, 0, 0.2, 1)`

---

## 4. 🏗️ ARCHITECTURE & STACK

- **Frontend:** Svelte 5 (Runes), Vite 7.
- **Language:** TypeScript 5.9.
- **Backend:** PostgreSQL 16, Kysely (Query Builder).
- **Security:** `bcryptjs`, `jsonwebtoken`, `cookie`.
- **Environment:** Local Postgres (No Docker required for dev).

### File Structure

```
src/
├── lib/
│   ├── auth/            # JWT, Session, Password logic
│   ├── components/      # UI Catalog (40+ components)
│   ├── config/          # Server config
│   ├── database/        # DB Types & connection
│   ├── permissions/     # RBAC definitions
│   ├── stores/          # Svelte stores (Toast, Permissions, Theme)
│   ├── styles/          # tokens.css, lumi-core.css
│   ├── types/           # Global types
│   ├── utils/           # Icons, formatting, floating-ui
│   ├── config.ts        # App configuration (API URLs)
│   └── index.ts         # Lib exports
├── routes/              # SvelteKit App
└── database/            # Scripts and Migrations
```

---

## 5. 🚀 QUICK START & COMMANDS

### Prerequisites

- Node.js & pnpm (see `package.json`).
- PostgreSQL 16 (Homebrew recommended).

### Setup (Local)

```bash
cp .env.example .env
brew services start postgresql@16
createdb faztore
pnpm db:setup  # Init DB + generate types
```

### Development Commands

- **Dev Server:** `pnpm dev`
- **Build:** `pnpm build`
- **Preview:** `pnpm preview`
- **Lint:** `pnpm lint` / `pnpm lint:fix`
- **Format:** `pnpm format` / `pnpm format:fix`
- **Type Check:** `pnpm check`

### Database Commands

- **Migrate:** `pnpm db:migrate`
- **Create Migration:** `pnpm db:create <name>`
- **Generate Types:** `pnpm db:generate` (Run after schema changes)
- **Reset DB:** `pnpm db:reset`
- **Status:** `pnpm db:status`

---

## 6. 🧩 COMPONENT CATALOG (Technical Specs)

All components implement `class` prop and native events.

### A. Form Components

1.  **Button**: `type` (filled/border/flat/gradient), `color`, `size`, `loading`.
2.  **Input**: `value` ($bindable), `label`, `icon`, `success/danger` states.
3.  **Select**: Floating UI, autocomplete, clearable, multiple.
4.  **Textarea**: Auto-size, char count.
5.  **Checkbox**: Indeterminate support.
6.  **Radio**: Animated scale.
7.  **Switch**: Loading state, icons inside thumb.
8.  **FileUpload**: Drag & Drop, progress, validation.
9.  **Slider**: Min/max, step.

### B. Layout & Structure

10. **Card**: Radius 2xl, Shadow md. Snippets: `header`, `footer`.
11. **Navbar**: Responsive toggle.
12. **Sidebar**: Collapsible (260px -> 80px), overlay on mobile.
13. **PageHeader**: With breadcrumbs and actions.
14. **QuickAccessCard**: Shortcut dashboard element.
15. **StatCard**: Dashboard statistic display.
16. **Title**: Standardized typography.

### C. Feedback & Overlay

17. **Alert**: Closable, variants.
18. **Dialog (Modal)**: Focus trap, backdrop blur, `size` prop.
19. **Notification (Toast)**: Auto-dismiss, stackable.
20. **Progress**: Striped/animated CSS.
21. **PermissionsModal**: RBAC management UI.

### D. Navigation

22. **Tabs**: Keyboard nav, panels.
23. **Dropdown**: Floating UI, trigger (click/hover).
24. **DropdownItem**: With icons/danger style.
25. **Context**: Right-click menu.
26. **Fieldset**: Semantic grouping.

### E. Data Display

27. **Table**: Pagination, search, sort, selection, hover. Snippets: `thead`, `row`.
28. **Avatar**: Initials fallback, status indicator.
29. **Chip**: Closable, colors.
30. **TagIndicator**: Compact status.
31. **StatusIndicator**: Pulse dot.
32. **SegmentedControl**: Glider animation.
33. **List / ListItem / ListHeader**: Standard list patterns.
34. **Image**: Lazy load, skeleton, zoom.
35. **InfoItem**: Key-value display.
36. **EmptyState**: Visual placeholder.

### F. Utilities

37. **Icon**: Lucide wrapper.
38. **Loading**: Spinner/Pulse.
39. **Divider**: Horizontal line.
40. **Tooltip**: Floating UI.
41. **Collapse**: Accordion.

---

## 7. 📐 CSS UTILITIES & LAYOUTS

Use `src/lib/styles/lumi-core.css` classes instead of custom CSS.

- **Flexbox:**
  - `.lumi-flex`: `display: flex; gap: 16px;`
  - `.lumi-flex--center`: Center align/justify.
  - `.lumi-flex--between`: Space between.
  - `.lumi-stack`: Column flex + gap.

- **Grid:**
  - `.lumi-grid`: `display: grid; gap: 16px;`
  - `.lumi-grid--responsive`: Auto-fit columns (min 280px).

- **Layout Patterns:**
  - **Dashboard:** Sidebar + Navbar + Content.
  - **Centered:** `.lumi-centered-layout` for auth/errors.

---

## 8. 💻 CODE STYLE & CONVENTIONS

### Svelte 5 Patterns

```svelte
<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);
	let { title, open = $bindable() }: Props = $props();

	$effect(() => {
		console.log(count);
	});
</script>

<!-- Snippets over Slots -->
{@render children()}
```

### Dynamic Classes

```ts
const classes = $derived(
	['lumi-button', `lumi-button--${type}`, disabled && 'lumi-button--disabled']
		.filter(Boolean)
		.join(' ')
);
```

### Permissions (RBAC)

```ts
import { can } from '$lib/stores/permissions';
const canDelete = $derived(can('users:delete'));
```

### ESLint & Formatting

- **Prettier:** Tabs, single quotes, no trailing commas.
- **ESLint:** `prefer-const`, `no-var`, `no-console` (warns).
- **Naming:**
  - Components: `PascalCase`
  - Files: `Component/Component.svelte`
  - Vars/Funcs: `camelCase`

---

## 9. ✅ DEVELOPER CHECKLIST

1.  [ ] **Runes Only:** Are you using `$state`? (No `export let`).
2.  [ ] **Tokens:** Are all colors/spacings using `var(--lumi-...)`?
3.  [ ] **Imports:** Are components imported from `$lib/components`?
4.  [ ] **Accessibility:** Do inputs/buttons have labels?
5.  [ ] **Cleanliness:** No `console.log`? Code formatted?
6.  [ ] **Visuals:** Checked Light AND Dark mode?

---

**This document replaces all previous guides.**
