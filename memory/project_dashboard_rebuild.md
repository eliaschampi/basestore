---
name: Dashboard rebuild — fixes and architecture
description: Dashboard was rebuilt after three bugs: sales trend empty (timezone key mismatch), inventory chart no tooltip/wrong type, activity feed mixing raw movements. SQL functions moved to 07-dashboard.sql.
type: project
---

## What was fixed and why

**Root cause 1 — Sales trend always empty**
The old `buildTrendSeries` generated skeleton keys using `new Date().toISOString().slice(0,10)` (UTC). The DB query used `TO_CHAR(sold_at::date, 'YYYY-MM-DD')` which depends on the DB server timezone. In non-UTC environments the keys never matched → all points stayed at 0 → `hasValues` was false → empty state shown even with real sales data.

**Fix:** New `dashboard_sales_trend(p_branch_code, p_range_days)` SQL function generates the date series entirely on the DB side with `generate_series` and `CURRENT_DATE`. The repository calls this function and maps rows directly to points — no JS-generated skeleton needed.

**Root cause 2 — Inventory state chart: no tooltip, wrong chart type**
The `BarChart` from layerchart had `tooltip={false}` explicitly set. User wanted a donut chart to show stock state distribution.

**Fix:** Created `DashboardDonutChart.svelte` — pure SVG, no external deps, using `stroke-dasharray` circles for segments with `position:fixed` CSS tooltip on hover. 5 segments: healthy (success), low (warning), emergency (orange-red mix), out_of_stock (danger), in_transit_only (info).

**Root cause 3 — Recent activity polluted with raw movements**
`mergeActivity` included `recentMovements` from `inventory_movements` table. These records ARE the underlying records that drive sales/purchases/transfers — showing them alongside the parent records created duplicate, confusing entries.

**Fix:** New `dashboard_recent_activity(p_branch_code, p_limit)` SQL function UNIONs sales + purchases + transfers only (no movements). Repository calls this single function instead of 4 separate queries + client-side merge.

**SQL architecture**
All dashboard SQL moved to `database/init/07-dashboard.sql`:

- `dashboard_sales_trend(branch_code UUID, range_days INT)` → day_key, total_amount, total_count
- `dashboard_purchases_trend(branch_code UUID, range_days INT)` → day_key, total_amount, total_count
- `dashboard_recent_activity(branch_code UUID, limit INT)` → activity_key, kind, title, description, occurred_at, amount, total_quantity, products_summary, href
- `dashboard_count_drive_links()` → integer

**Why:** applies to future conversations, per user's architectural preference for moving SQL out of TypeScript files.
