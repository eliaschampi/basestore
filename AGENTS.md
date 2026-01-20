# AGENTS.md

This repo is a SvelteKit + Svelte 5 (Runes) app with a custom design system (Lumi UI) and a Postgres/Kysely backend. Use pnpm with local Postgres (Homebrew). Follow the rules below strictly.

## Quick Start

- Package manager: pnpm (see package.json and PNPM-SETUP.md).
- SvelteKit app, Vite build, TypeScript strict mode.
- Database: Postgres via Kysely. Local .env drives DB connection.

## Build, Lint, Test, Check

### Local (pnpm)

- Dev server: `pnpm dev`
- Build: `pnpm build`
- Preview build: `pnpm preview`
- Type check: `pnpm check`
- Lint: `pnpm lint`
- Lint fix: `pnpm lint:fix`
- Format check: `pnpm format`
- Format fix: `pnpm format:fix`

### Local database setup

- Copy env: `cp .env.example .env`
- Ensure Postgres is running: `brew services start postgresql@16`
- Create DB (first time): `createdb faztore`
- Initialize DB + generate types: `pnpm db:setup`

### Database commands

- Setup (init + types): `pnpm db:setup`
- Status: `pnpm db:status`
- Reset (drop schema): `pnpm db:reset`
- Initialize DB (init SQL only): `pnpm db:init`
- Migrate: `pnpm db:migrate`
- Rollback: `pnpm db:rollback`
- Connectivity check: `pnpm db:check`
- Create migration: `pnpm db:create <name>`
- Generate types: `pnpm db:generate`

### Tests

- No test runner is configured in package.json (no `test` script). If you add tests, document them here and prefer a single-test command.
- No Docker workflow is required for local development.

## Code Style and Conventions

### Formatting

- Prettier: tabs, single quotes, no trailing commas, print width 100, semicolons.
- Use `pnpm format` before committing formatting changes.

### ESLint rules (key points)

- `prefer-const` enforced except in .svelte $props destructuring.
- `no-var` enforced.
- `no-console` warns; only `console.warn`/`console.error` allowed.
- `@typescript-eslint/no-unused-vars` ignores `_` prefix for args/vars/errors.
- `@typescript-eslint/no-explicit-any` warns.

### Svelte 5 Runes only

- Never use Svelte 4 syntax like `export let`.
- Use runes: `$state`, `$derived`, `$props`, `$effect`.
- For slots, use snippets: `{@render children()}` and `children?: Snippet`.

### Imports

- UI components: import from `$lib/components` or component index.
- Utilities: `$lib/utils`.
- Icons: use `<Icon icon="lucide-name" />` from Lumi UI, do not import SVGs manually.

### Types

- TypeScript strict mode is enabled; type everything.
- Use `type` imports when only types are needed.
- Prefer explicit return types on exported functions.

### Naming conventions

- Variables/functions: `camelCase`.
- Components: `PascalCase`.
- Files: match component name (e.g., `Button/Button.svelte`).
- CSS classes: Lumi BEM-style, e.g. `.lumi-button`, `.lumi-button--primary`, `.lumi-button__icon`.

### Design system rules (Lumi UI)

- Never hardcode colors, spacing, radii, or shadows. Use `var(--lumi-...)` tokens.
- Use layout utilities from `src/lib/styles/lumi-core.css` (e.g., `lumi-flex`, `lumi-grid`, `lumi-stack`).
- Maintain consistent visual language across components and pages.
- Dark mode is already handled by tokens; do not implement custom theme switches.

### Component structure

- Each component has a folder with:
  - `Component.svelte`
  - `types.ts`
  - `index.ts`
- Export via `$lib/components/index.ts`.

### Error handling patterns

- SvelteKit server actions: validate input early and return `fail(...)` with messages.
- Throw `redirect(...)` for navigation after successful actions.
- Catch and rethrow `Response` errors; log unexpected errors with `console.error`.

### Database patterns

- Kysely is the query builder; keep SQL in queries, no raw SQL unless necessary.
- Use `locals.db` in SvelteKit server load/actions.
- Prefer `executeTakeFirst()` when you expect a single row.

## Additional Rules from LLMS-GUIDE.md (must follow)

- All visual values must come from design tokens (no px, rem, hex, rgba directly).
- Always import components from `$lib/components`.
- Use Svelte 5 runes and snippets only; never `<slot>`.
- Accessibility is mandatory: `aria-label`, keyboard navigation, focus handling.
- Keep dependencies minimal: only use existing dependencies unless approved.
- Use Lucide icons via the `Icon` component.

## File Layout Reference

- `src/lib/components`: Lumi UI components.
- `src/lib/styles`: tokens and utility classes.
- `src/lib/utils`: shared utilities.
- `src/lib/stores`: Svelte stores.
- `src/routes`: SvelteKit routes and server actions.
- `database`: migration tooling and scripts.

## Development Notes

- Use Homebrew Postgres for local DB environment.
- If you change tokens or core styles, revalidate UI consistency.
- Avoid adding console logs; remove before commit.

## Docker artifacts

- Docker files live in `docker/` for archival/reference only.
- The app should run fully without Docker.

## When updating AGENTS.md

- Keep it concise and actionable.
- Update commands and rules if tooling changes.
