# LUMI UI: TECHNICAL CODEX & AGENT GUIDE

**Version:** 2.0.0 | **Framework:** Svelte 5 (Runes) | **Style:** CSS Variables & Pure Utility Classes

This is the **SINGLE SOURCE OF TRUTH** for the Faztore/Lumi UI project. It combines the previous `AGENTS.md` and `LLMS-GUIDE.md` into one definitive guide. Follow these rules strictly.

---
Lumi Ui is a modern, interactive, and consistent UI library for Svelte 5. Created by Faztore for the Faztore project.
Lumi Ui must have a consistent theming system. The theming system must be based on the tokens defined in `src/lib/styles/tokens.css`. and `src/lib/styles/lumi-core.css`
Also `src/lib/config.ts` is the configuration file for the Lumi Ui project.

Golden Rules
* All components must have same rounded corners, shadow, and transition as defined in `src/lib/styles/tokens.css`.
By default, all components must have rounded corners and shadow defined in `--lumi-shadow-md`.
* All components must have same spacing, padding margin in md size defined in `--lumi-spacing-md`. 
* Ui must be modern, interactive, and consistent. without errors, inspired in glassmorphism, heroui, vuesax etc.
---


---
About faztore: 

Faztore, made with ❤️, will be a modern, extremely fast, and secure, efficient and scalable web application.
Its main features will be:
* User authentication and authorization.
* User profile management.
* File upload and storage, interactive drive for upload images, for the products.
* Category, brand, and product management. with CRUD operations. extremely beautiful and interactive UI.
* Manage reports and charts for the admin dashboard.
* Also will have incomes and expenses and a balance sheet  management, interactive and perfect.


In tecnical terms, the project will be built with Svelte 5, using the Runes feature. The project will have a consistent theming system based on the tokens defined in `src/lib/styles/tokens.css`. and `src/lib/styles/lumi-core.css` without using any external libraries for theming, or redundant code, instead using pure utility classes.
---

## 1. 🧠 SYSTEM PROMPT (Mandatory Context)

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

## 2. 🚀 QUICK START & COMMANDS

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

## 3. 🎨 DESIGN SYSTEM (The Source of Truth)

Based on `src/lib/styles/tokens.css`.

### Color System (Semantic & Palette)
Each semantic color has a full scale (50-950).

| Semantic | Token Base | Hex Ref | Usage |
| :--- | :--- | :--- | :--- |
| **Primary** | `--lumi-color-primary` | Blue | Brand, Primary Actions |
| **Secondary** | `--lumi-color-secondary` | Coral | Accents, Decoration |
| **Success** | `--lumi-color-success` | Green | Success states |
| **Warning** | `--lumi-color-warning` | Amber | Alerts |
| **Danger** | `--lumi-color-danger` | Red | Errors, Destructive |
| **Info** | `--lumi-color-info` | Sky | Information |

**Surfaces & Text:**
- `--lumi-color-background`: Page bg (`#f4f4f5` Light / `#09090b` Dark).
- `--lumi-color-surface`: Card/Container bg.
- `--lumi-color-text`: Main text.
- `--lumi-color-text-muted`: Secondary text.
- `--lumi-color-border`: Subtle borders.

### Spacing System (4px Base)
| Token | Value | Use |
| :--- | :--- | :--- |
| `--lumi-space-2xs` | 4px | Micro gaps |
| `--lumi-space-xs` | 8px | Tight grouping |
| `--lumi-space-sm` | 12px | Small padding |
| `--lumi-space-md` | 16px | **STANDARD** (Gaps, Paddings) |
| `--lumi-space-lg` | 24px | Sections |
| `--lumi-space-xl` | 32px | Major separation |
| `--lumi-space-2xl` | 40px | Layouts |
| `--lumi-space-3xl` | 48px | Hero sections |

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
│   ├── components/      # UI Catalog (40 components)
│   ├── styles/          # tokens.css, lumi-core.css
│   ├── utils/           # icons.ts, floating.svelte.ts
│   ├── stores/          # permissions.ts, toast.ts
│   └── permissions/     # definitions.ts
├── routes/              # SvelteKit App
└── database/            # Scripts and Migrations
```

---

## 5. 🧩 COMPONENT CATALOG (Technical Specs)

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

### C. Feedback & Overlay
14. **Alert**: Closable, variants.
15. **Dialog (Modal)**: Focus trap, backdrop blur, `size` prop.
16. **Notification (Toast)**: Auto-dismiss, stackable.
17. **Progress**: Striped/animated CSS.

### D. Navigation
18. **Tabs**: Keyboard nav, panels.
19. **Dropdown**: Floating UI, trigger (click/hover).
20. **DropdownItem**: With icons/danger style.
21. **Context**: Right-click menu.
22. **Fieldset**: Semantic grouping.

### E. Data Display
24. **Table**: Pagination, search, sort, selection, hover. Snippets: `thead`, `row`.
25. **Avatar**: Initials fallback, status indicator.
26. **Chip**: Closable, colors.
27. **TagIndicator**: Compact status.
28. **StatusIndicator**: Pulse dot.
29. **SegmentedControl**: Glider animation.
30. **List / ListItem / ListHeader**: Standard list patterns.
34. **Image**: Lazy load, skeleton, zoom.

### F. Utilities
35. **Icon**: Lucide wrapper.
36. **Loading**: Spinner/Pulse.
37. **Divider**: Horizontal line.
38. **Tooltip**: Floating UI.
39. **Collapse**: Accordion.
40. **EmptyState**: Visual placeholder.

---

## 6. 📐 CSS UTILITIES & LAYOUTS

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

## 7. 💻 CODE STYLE & CONVENTIONS

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
const classes = $derived([
  'lumi-button',
  `lumi-button--${type}`,
  disabled && 'lumi-button--disabled'
].filter(Boolean).join(' '));
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

## 8. ✅ DEVELOPER CHECKLIST

1.  [ ] **Runes Only:** Are you using `$state`? (No `export let`).
2.  [ ] **Tokens:** Are all colors/spacings using `var(--lumi-...)`?
3.  [ ] **Imports:** Are components imported from `$lib/components`?
4.  [ ] **Accessibility:** Do inputs/buttons have labels?
5.  [ ] **Cleanliness:** No `console.log`? Code formatted?
6.  [ ] **Visuals:** Checked Light AND Dark mode?

---

**This document replaces all previous guides.**
