import { sql } from 'kysely';
import type { Database } from '$lib/database';
import type { BranchCatalogItem, InventoryOverviewItem } from '$lib/types/inventory';
import type {
	DashboardActivityItem,
	DashboardColor,
	DashboardHomeData,
	DashboardInventoryPanel,
	DashboardInventorySummary,
	DashboardMetric,
	DashboardQuickAction,
	DashboardRangeDays,
	DashboardSeriesPoint,
	DashboardStats,
	DashboardTrendSeries
} from '$lib/types/dashboard';
import { resolveInventoryBranchCode } from '$lib/utils/inventory';
import { InventoryRepository } from './inventory.repository';

export type DashboardPermissionChecker = (permissionKey: string) => boolean | Promise<boolean>;

interface DashboardLoadOptions {
	branchCode?: string | null;
	rangeDays?: number | string | null;
}

// ─── Row types (SQL function return shapes) ──────────────────────────────────

interface TrendRow {
	day_key: string;
	total_amount: number | string;
	total_profit: number | string;
	total_count: number | string;
}

interface ActivityRow {
	activity_key: string;
	kind: string;
	title: string;
	description: string;
	occurred_at: string | Date;
	amount: number | string | null;
	total_quantity: number | string | null;
	products_summary: string | null;
	href: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DASHBOARD_TITLE = 'Dashboard';
const DASHBOARD_RECENT_LIMIT = 15;
const DEFAULT_RANGE_DAYS: DashboardRangeDays = 7;

const DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('es-PE', {
	day: '2-digit',
	month: 'short'
});

const QUICK_ACTIONS: readonly DashboardQuickAction[] = [
	{
		key: 'users:create',
		permission: 'users:create',
		title: 'Nuevo usuario',
		description: 'Crear una cuenta del sistema',
		icon: 'users',
		color: 'primary',
		href: '/users'
	},
	{
		key: 'branches:create',
		permission: 'branches:create',
		title: 'Nueva sede',
		description: 'Registrar una ubicación',
		icon: 'building',
		color: 'secondary',
		href: '/branches'
	},
	{
		key: 'categories:create',
		permission: 'categories:create',
		title: 'Nueva categoría',
		description: 'Ordenar el catálogo',
		icon: 'tag',
		color: 'success',
		href: '/categories'
	},
	{
		key: 'brands:create',
		permission: 'brands:create',
		title: 'Nueva marca',
		description: 'Ampliar el catálogo',
		icon: 'award',
		color: 'info',
		href: '/brands'
	},
	{
		key: 'products:create',
		permission: 'products:create',
		title: 'Nuevo producto',
		description: 'Agregar un producto',
		icon: 'package',
		color: 'warning',
		href: '/products'
	},
	{
		key: 'inventory:purchases:create',
		permission: 'inventory:create',
		title: 'Registrar compra',
		description: 'Ingresar inventario',
		icon: 'shoppingBag',
		color: 'warning',
		href: '/inventory/purchases/new'
	},
	{
		key: 'inventory:sales:create',
		permission: 'inventory:create',
		title: 'Registrar venta',
		description: 'Registrar salida de stock',
		icon: 'creditCard',
		color: 'success',
		href: '/inventory/sales/new'
	},
	{
		key: 'inventory:transfers:create',
		permission: 'product_transfers:create',
		title: 'Mover stock',
		description: 'Transferir entre sedes',
		icon: 'arrowLeftRight',
		color: 'info',
		href: '/inventory/transfers/new'
	},
	{
		key: 'drive:create',
		permission: 'drive:create',
		title: 'Subir archivo',
		description: 'Cargar archivos al Drive',
		icon: 'hardDrive',
		color: 'primary',
		href: '/drive'
	}
];

const ACTIVITY_ICONS: Record<string, string> = {
	sale: 'creditCard',
	purchase: 'shoppingBag',
	transfer: 'arrowLeftRight'
};

const ACTIVITY_COLORS: Record<string, DashboardColor> = {
	sale: 'success',
	purchase: 'warning',
	transfer: 'info'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toNumber(value: number | string | bigint | null | undefined): number {
	if (typeof value === 'bigint') return Number(value);
	if (typeof value === 'number') return value;
	const parsed = Number(value ?? 0);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRangeDays(value: DashboardLoadOptions['rangeDays']): DashboardRangeDays {
	return Number(value) === 30 ? 30 : DEFAULT_RANGE_DAYS;
}

function buildTrendFromRows(rows: TrendRow[]): DashboardTrendSeries {
	const points: DashboardSeriesPoint[] = rows.map((row) => ({
		key: row.day_key,
		label: DAY_LABEL_FORMATTER.format(new Date(`${row.day_key}T12:00:00Z`)),
		value: toNumber(row.total_amount)
	}));

	return {
		points,
		totalAmount: points.reduce((sum, p) => sum + p.value, 0),
		totalProfit: rows.reduce((sum, r) => sum + toNumber(r.total_profit), 0),
		totalCount: rows.reduce((sum, r) => sum + toNumber(r.total_count), 0)
	};
}

function mapActivityRow(row: ActivityRow): DashboardActivityItem {
	const kind = row.kind as DashboardActivityItem['kind'];
	return {
		key: row.activity_key,
		kind,
		title: row.title,
		description: row.description,
		occurredAt: row.occurred_at,
		icon: ACTIVITY_ICONS[kind] ?? 'activity',
		color: ACTIVITY_COLORS[kind] ?? 'secondary',
		href: row.href,
		amount: row.amount != null ? toNumber(row.amount) : undefined,
		quantity: row.total_quantity != null ? toNumber(row.total_quantity) : undefined,
		meta: row.products_summary || undefined
	};
}

async function hasPermission(can: DashboardPermissionChecker, key: string): Promise<boolean> {
	return Boolean(await Promise.resolve(can(key)));
}

async function loadPermissionMap(
	can: DashboardPermissionChecker,
	keys: readonly string[]
): Promise<Record<string, boolean>> {
	const entries = await Promise.all(
		keys.map(async (key) => [key, await hasPermission(can, key)] as const)
	);
	return Object.fromEntries(entries);
}

// ─── SQL function wrappers ───────────────────────────────────────────────────

async function loadSalesTrend(
	db: Database,
	branchCode: string,
	rangeDays: DashboardRangeDays
): Promise<DashboardTrendSeries> {
	const result = await sql<TrendRow>`
		SELECT * FROM public.dashboard_sales_trend(${branchCode}, ${rangeDays}::integer)
	`.execute(db);
	return buildTrendFromRows(result.rows);
}

async function loadRecentActivity(
	db: Database,
	branchCode: string
): Promise<DashboardActivityItem[]> {
	const result = await sql<ActivityRow>`
		SELECT * FROM public.dashboard_recent_activity(${branchCode}, ${DASHBOARD_RECENT_LIMIT}::integer)
	`.execute(db);
	return result.rows.map(mapActivityRow);
}

// ─── Builder functions ───────────────────────────────────────────────────────

function buildInventorySummary(overviewSummary: {
	total_products: number;
	healthy_count: number;
	low_count: number;
	emergency_count: number;
	out_of_stock_count: number;
	in_transit_only_count: number;
	total_available: number;
	total_inbound: number;
}): DashboardInventorySummary {
	return {
		lineCount: overviewSummary.total_products,
		healthyCount: overviewSummary.healthy_count,
		lowCount: overviewSummary.low_count,
		emergencyCount: overviewSummary.emergency_count,
		outOfStockCount: overviewSummary.out_of_stock_count,
		inTransitOnlyCount: overviewSummary.in_transit_only_count,
		totalAvailable: overviewSummary.total_available,
		totalInbound: overviewSummary.total_inbound,
		criticalCount: overviewSummary.emergency_count + overviewSummary.out_of_stock_count
	};
}

function buildStockSeries(summary: DashboardInventorySummary): DashboardSeriesPoint[] {
	return [
		{ key: 'healthy', label: 'Saludable', value: summary.healthyCount },
		{ key: 'low', label: 'Stock bajo', value: summary.lowCount },
		{ key: 'emergency', label: 'Crítico', value: summary.emergencyCount },
		{ key: 'out_of_stock', label: 'Sin stock', value: summary.outOfStockCount },
		{ key: 'in_transit_only', label: 'En camino', value: summary.inTransitOnlyCount }
	];
}

function buildInventoryMetrics(summary: DashboardInventorySummary): DashboardMetric[] {
	return [
		{
			key: 'inventory-available',
			title: 'Disponibles',
			value: summary.totalAvailable,
			icon: 'package',
			color: 'success',
			subtitle: 'Unidades listas para venta',
			href: '/inventory'
		},
		{
			key: 'inventory-inbound',
			title: 'En camino',
			value: summary.totalInbound,
			icon: 'truck',
			color: 'info',
			subtitle: 'Unidades inbound',
			href: '/inventory/purchases'
		},
		{
			key: 'inventory-critical',
			title: 'Alertas',
			value: summary.criticalCount,
			icon: 'alertTriangle',
			color: 'danger',
			subtitle: 'Productos críticos en la sede',
			href: '/inventory'
		},
		{
			key: 'inventory-lines',
			title: 'Líneas activas',
			value: summary.lineCount,
			icon: 'boxes',
			color: 'primary',
			subtitle: 'Productos con stock registrado',
			href: '/inventory'
		}
	];
}

function filterQuickActions(
	permissions: Record<string, boolean>,
	filter?: (action: DashboardQuickAction) => boolean
): DashboardQuickAction[] {
	return QUICK_ACTIONS.filter((a) => permissions[a.permission]).filter((a) =>
		filter ? filter(a) : true
	);
}

// ─── Main loader ─────────────────────────────────────────────────────────────

const EMPTY_OVERVIEW_SUMMARY = {
	total_products: 0,
	healthy_count: 0,
	low_count: 0,
	emergency_count: 0,
	out_of_stock_count: 0,
	in_transit_only_count: 0,
	total_available: 0,
	total_inbound: 0
};

export class DashboardRepository {
	static async loadHome(
		db: Database,
		can: DashboardPermissionChecker,
		options: DashboardLoadOptions = {}
	): Promise<DashboardHomeData> {
		const permissionKeys = [
			'dashboard:read',
			'users:read',
			'users:create',
			'branches:read',
			'branches:create',
			'categories:read',
			'categories:create',
			'brands:read',
			'brands:create',
			'products:read',
			'products:create',
			'inventory:read',
			'inventory:create',
			'product_transfers:read',
			'product_transfers:create',
			'drive:read',
			'drive:create'
		] as const;

		const permissions = await loadPermissionMap(can, permissionKeys);
		const rangeDays = normalizeRangeDays(options.rangeDays);
		const canReadInventory = permissions['inventory:read'];

		// Resolve which branch to show inventory data for.
		const inventoryBranches = canReadInventory
			? await db
					.selectFrom('branches')
					.select(['code', 'name', 'state'])
					.orderBy('name', 'asc')
					.execute()
			: [];
		const selectedBranchCode = canReadInventory
			? resolveInventoryBranchCode(inventoryBranches, options.branchCode)
			: '';
		const selectedBranch = inventoryBranches.find((b) => b.code === selectedBranchCode) ?? null;
		const hasBranch = canReadInventory && !!selectedBranchCode;

		const emptyOverview = {
			items: [] as InventoryOverviewItem[],
			summary: EMPTY_OVERVIEW_SUMMARY,
			pagination: { page: 1, page_size: 8, total: 0, total_pages: 1 }
		};

		// Only fire queries the dashboard page actually renders.
		// Catalog counts, drive queries, and purchases trend are
		// intentionally omitted — the page never displays them.
		const [inventoryOverview, inventoryAlerts, salesTrend, recentActivity] = await Promise.all([
			hasBranch
				? InventoryRepository.listOverview(db, {
						branchCode: selectedBranchCode,
						includeInactive: false,
						stock: 'all',
						page: 1,
						pageSize: 8
					})
				: Promise.resolve(emptyOverview),
			hasBranch
				? InventoryRepository.listOverview(db, {
						branchCode: selectedBranchCode,
						includeInactive: false,
						stock: 'critical',
						page: 1,
						pageSize: 6
					})
				: Promise.resolve({
						...emptyOverview,
						pagination: { page: 1, page_size: 6, total: 0, total_pages: 1 }
					}),
			hasBranch
				? loadSalesTrend(db, selectedBranchCode, rangeDays)
				: Promise.resolve(buildTrendFromRows([])),
			hasBranch ? loadRecentActivity(db, selectedBranchCode) : Promise.resolve([])
		]);

		const inventorySummary = buildInventorySummary(inventoryOverview.summary);
		const quickActions = filterQuickActions(permissions);
		const canViewDashboard =
			permissions['dashboard:read'] ||
			Object.values(permissions).some(Boolean) ||
			quickActions.length > 0;

		const stats: DashboardStats = {
			users: 0,
			branches: inventoryBranches.length,
			categories: 0,
			brands: 0,
			products: 0,
			customers: 0,
			driveFiles: 0,
			driveLinks: 0,
			inventoryLines: inventoryOverview.summary.total_products
		};

		const inventoryPanel: DashboardInventoryPanel | null = canReadInventory
			? {
					branches: inventoryBranches as BranchCatalogItem[],
					selectedBranchCode,
					selectedBranchName: selectedBranch?.name ?? null,
					rangeDays,
					metrics: buildInventoryMetrics(inventorySummary),
					summary: inventorySummary,
					trends: {
						sales: salesTrend,
						purchases: buildTrendFromRows([]),
						stock: buildStockSeries(inventorySummary)
					},
					alerts: inventoryAlerts.items as InventoryOverviewItem[],
					recentActivity,
					quickActions: filterQuickActions(permissions, (a) =>
						['inventory:create', 'product_transfers:create'].includes(a.permission)
					)
				}
			: null;

		return {
			title: DASHBOARD_TITLE,
			generatedAt: new Date().toISOString(),
			canViewDashboard,
			stats,
			panels: { catalog: null, inventory: inventoryPanel, drive: null },
			quickActions
		};
	}
}
