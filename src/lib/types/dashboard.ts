import type { BranchCatalogItem, InventoryOverviewItem } from './inventory';

export type DashboardColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type DashboardRangeDays = 7 | 30;

export interface DashboardMetric {
	key: string;
	title: string;
	value: number | string;
	icon: string;
	color: DashboardColor;
	subtitle?: string;
	href?: string;
}

export interface DashboardSeriesPoint {
	key: string;
	label: string;
	value: number;
}

export interface DashboardTrendSeries {
	points: DashboardSeriesPoint[];
	totalAmount: number;
	totalProfit: number;
	totalCount: number;
}

export interface DashboardInventorySummary {
	lineCount: number;
	healthyCount: number;
	lowCount: number;
	emergencyCount: number;
	outOfStockCount: number;
	inTransitOnlyCount: number;
	totalAvailable: number;
	totalInbound: number;
	criticalCount: number;
}

export interface DashboardQuickAction {
	key: string;
	title: string;
	description: string;
	icon: string;
	color: DashboardColor;
	href: string;
	permission: string;
}

export interface DashboardActivityItem {
	key: string;
	kind: 'sale' | 'purchase' | 'transfer' | 'movement' | 'drive';
	title: string;
	description: string;
	occurredAt: string | Date;
	icon: string;
	color: DashboardColor;
	href?: string;
	amount?: number;
	quantity?: number;
	meta?: string;
}

export interface DashboardCatalogPanel {
	metrics: DashboardMetric[];
	quickActions: DashboardQuickAction[];
}

export interface DashboardInventoryPanel {
	branches: BranchCatalogItem[];
	selectedBranchCode: string;
	selectedBranchName: string | null;
	rangeDays: DashboardRangeDays;
	summary: DashboardInventorySummary;
	metrics: DashboardMetric[];
	trends: {
		sales: DashboardTrendSeries;
		purchases: DashboardTrendSeries;
		stock: DashboardSeriesPoint[];
	};
	alerts: InventoryOverviewItem[];
	recentActivity: DashboardActivityItem[];
	quickActions: DashboardQuickAction[];
}

export interface DashboardDrivePanel {
	metrics: DashboardMetric[];
	recentFiles: DashboardActivityItem[];
	quickActions: DashboardQuickAction[];
}

export interface DashboardPanels {
	catalog: DashboardCatalogPanel | null;
	inventory: DashboardInventoryPanel | null;
	drive: DashboardDrivePanel | null;
}

export interface DashboardStats {
	users: number;
	branches: number;
	categories: number;
	brands: number;
	products: number;
	customers: number;
	driveFiles: number;
	driveLinks: number;
	inventoryLines: number;
}

export interface DashboardHomeData {
	title: string;
	generatedAt: string;
	canViewDashboard: boolean;
	stats: DashboardStats;
	panels: DashboardPanels;
	quickActions: DashboardQuickAction[];
}
