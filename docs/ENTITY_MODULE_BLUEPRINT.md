# Faztore Entity Module Blueprint

Version: 1.0
Scope: Mandatory implementation pattern for all future modules and entities.

This document defines the non-negotiable pattern for building entities such as `drive`, `products`, `compras`, `ventas`, `transferencias_productos`, `inventario`, `caja`, `gastos`, `ingresos`, and `transferencias_efectivo`.

## 1. Base Principles

1. Security first: every read/write path must be permission-gated server-side.
2. Single source of auth truth: use `locals.user`, `locals.userPermissions`, and `locals.can(...)` only.
3. Super user bypass is centralized. Never duplicate bypass logic in feature code.
4. Prefer simple, explicit CRUD flows over over-abstracted code.
5. Keep UI and server action names aligned (`create`, `update`, `delete`, etc.).
6. No inline styles in pages/components.
7. All mutating multi-step operations must run in a DB transaction.

## 2. Routing Decision Rule

Use `+page.server.ts` when:

- the action is specific to one page/form workflow,
- responses are form/action-based,
- logic is tightly coupled to that page's UI.

Use `src/routes/api/.../+server.ts` when:

- endpoints are consumed by `fetch` from multiple pages,
- reusable JSON APIs are needed,
- integration/external clients may consume the endpoint.

If both apply, keep write logic in a shared server function/repository and call from both.

## 3. Mandatory Backend Flow

For every entity route (`+page.server.ts` or `+server.ts`):

1. Authorization

- `if (!(await locals.can('<entity>:read'))) ...`
- `if (!(await locals.can('<entity>:create'))) ...`
- `if (!(await locals.can('<entity>:update'))) ...`
- `if (!(await locals.can('<entity>:delete'))) ...`

2. Input normalization

- Use a helper like `readFormField(formData, 'name')`.
- Trim strings and normalize emails/codes when applicable.

3. Validation

- Validate required fields before DB calls.
- Validate IDs/codes before update/delete.

4. DB execution and integrity checks

- `update/delete` must verify affected row count.
- Return `404` when target record does not exist.

5. Transaction for multi-step writes

- Use `locals.db.transaction().execute(...)` when deleting/reassigning related records or any multi-query write.

6. Error handling

- Return `fail(400/403/404, { error })` for expected errors.
- Return generic 500 only for unknown/unhandled failures.

## 4. Mandatory Frontend Flow (`+page.svelte`)

1. Permission derived state

- `const canCreate = $derived(can('<entity>:create'));`
- `const canUpdate = $derived(can('<entity>:update'));`
- `const canDelete = $derived(can('<entity>:delete'));`

2. Form/action consistency

- Main form action: `?/create` or `?/update`.
- Delete form action: `?/delete`.
- Form `id` must be explicit (`<entity>-form`, `delete-<entity>-form`).
- Submit using `document.getElementById(...).requestSubmit()`; do not use generic `querySelector('form')`.

3. Progressive enhancement

- Always use `use:enhance` with clear success/failure UX.
- Invalidate using stable keys (e.g., `invalidate('<entity>:load')`).

4. No style inconsistencies

- No inline `style="..."` for page-level UI states.

## 5. Permission Definitions Standard

Each new entity must register at least:

- `<entity>:read`
- `<entity>:create`
- `<entity>:update`
- `<entity>:delete`

Add optional keys only when justified (e.g., `approve`, `export`, `manage_permissions`).

## 6. Session and Auth Safety Rules

1. Session user shape must never include `password_hash`.
2. JWT secret rules:

- Development: fallback allowed.
- Production: secret is mandatory, strong, and non-default.

3. API routes are authenticated by default via hooks.
4. Do not bypass auth in route handlers unless explicitly public.

## 7. Performance Rules

1. Select only required columns in list/load queries.
2. Avoid extra DB reads when row counts can confirm operation results.
3. Use derived/computed state in UI instead of redundant stores.
4. Keep permission checks O(1) and centralized.

## 8. Standard Checklist Before Merge

1. `+page.server.ts` (or `+server.ts`) includes explicit permission checks.
2. `create/update/delete` names are aligned between frontend form actions and server actions.
3. Update/delete validate target identity and affected rows.
4. Multi-step writes are transactional.
5. `pnpm check` passes.
6. `pnpm lint` passes.
7. No inline styles introduced.
8. No sensitive fields leaked to `PageData`.

## 9. Future Entities Mapping

Use this naming convention for upcoming modules:

- Drive: `drive:read/create/update/delete`
- Products: `products:read/create/update/delete`
- Compras: `purchases:read/create/update/delete`
- Ventas: `sales:read/create/update/delete`
- Transferencias de productos: `product_transfers:read/create/update/delete`
- Inventario: `inventory:read/create/update/delete`
- Caja: `cashbox:read/create/update/delete`
- Gastos: `expenses:read/create/update/delete`
- Ingresos: `income:read/create/update/delete`
- Transferencia de efectivo: `cash_transfers:read/create/update/delete`

Keep keys in English snake case for consistency and migration safety.
