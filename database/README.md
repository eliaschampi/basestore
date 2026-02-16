# Database Architecture

This project uses a **snapshot + incremental migrations** model:

1. `database/init/*.sql`: current full schema snapshot for fast bootstrap.
2. `database/migrations/*.sql`: historical incremental changes.
3. `database/init/BASELINE_MIGRATION`: latest migration timestamp included in `init`.

## Bootstrap Flow

`pnpm db:setup` executes:

1. `init` only if the DB has no tables.
2. `migrate` always (applies pending migrations only).
3. `db:generate` for Kysely types.

During `init`, baseline migrations are auto-recorded with batch `0`, so `migrate` does not replay historical migrations already represented in `init`.

## Team Rules

1. Add new schema changes as a migration in `database/migrations`.
2. Keep migration files immutable after merge.
3. Periodically refresh `database/init/*.sql` to match current schema.
4. After refreshing `init`, update `database/init/BASELINE_MIGRATION` to the latest migration id included in the snapshot.
5. Validate with:
   - `pnpm db:setup`
   - `pnpm db:status`
   - `pnpm check`
   - `pnpm lint`
