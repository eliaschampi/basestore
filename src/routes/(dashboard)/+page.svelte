<script lang="ts">
	import {
		Chip,
		DashboardChart,
		DashboardDonutChart,
		DashboardSection,
		EmptyState,
		PageHeader,
		StatCard,
		type DonutSegment
	} from '$lib/components';
	import type { DashboardActivityItem, DashboardColor } from '$lib/types/dashboard';
	import type { InventoryOverviewItem } from '$lib/types/inventory';
	import { formatDate } from '$lib/utils/formatDate';
	import { formatProductPrice } from '$lib/utils/products';
	import type { PageData } from './$types';

	const { data }: { data: PageData } = $props();

	const inventoryPanel = $derived(data.panels.inventory);
	const rangeDays = $derived(inventoryPanel?.rangeDays ?? 7);

	// ─── KPI cards ────────────────────────────────────────────────────────────

	const kpiCards = $derived([
		{
			key: 'sales',
			title: 'Ventas',
			value: formatProductPrice(inventoryPanel?.trends.sales.totalAmount ?? 0),
			icon: 'creditCard',
			color: 'primary' as const,
			subtitle: `Últimos ${rangeDays} días`,
			href: '/inventory/sales'
		},
		{
			key: 'profit',
			title: 'Ganancia',
			value: formatProductPrice(inventoryPanel?.trends.sales.totalProfit ?? 0),
			icon: 'trendingUp',
			color: 'success' as const,
			subtitle: `Últimos ${rangeDays} días`,
			href: '/inventory/sales'
		},
		{
			key: 'inventory',
			title: 'Disponibles',
			value: inventoryPanel?.summary.totalAvailable ?? 0,
			icon: 'boxes',
			color: 'info' as const,
			subtitle: 'Unidades en stock',
			href: '/inventory'
		},
		{
			key: 'alerts',
			title: 'Stock crítico',
			value: inventoryPanel?.summary.criticalCount ?? 0,
			icon: 'alertTriangle',
			color: 'danger' as const,
			subtitle: 'Productos en alerta',
			href: '/inventory'
		}
	]);

	// ─── Sales trend chart ────────────────────────────────────────────────────

	const salesTrendPoints = $derived(inventoryPanel?.trends.sales.points ?? []);

	// ─── Inventory state donut ────────────────────────────────────────────────

	// Each stock state is mapped to a distinct color for the donut chart.
	// emergency and out_of_stock intentionally share the red spectrum;
	// emergency uses a mixed orange-red to remain visually distinct.
	const stockDonutSegments = $derived<DonutSegment[]>(
		inventoryPanel
			? [
					{
						key: 'healthy',
						label: 'Saludable',
						value: inventoryPanel.summary.healthyCount,
						color: 'var(--lumi-color-success)'
					},
					{
						key: 'low',
						label: 'Stock bajo',
						value: inventoryPanel.summary.lowCount,
						color: 'var(--lumi-color-warning)'
					},
					{
						key: 'emergency',
						label: 'Crítico',
						value: inventoryPanel.summary.emergencyCount,
						color: 'color-mix(in srgb, var(--lumi-color-danger) 65%, var(--lumi-color-warning) 35%)'
					},
					{
						key: 'out_of_stock',
						label: 'Sin stock',
						value: inventoryPanel.summary.outOfStockCount,
						color: 'var(--lumi-color-danger)'
					},
					{
						key: 'in_transit_only',
						label: 'En camino',
						value: inventoryPanel.summary.inTransitOnlyCount,
						color: 'var(--lumi-color-info)'
					}
				]
			: []
	);

	// ─── Recent activity ──────────────────────────────────────────────────────

	const recentActivity = $derived(
		inventoryPanel?.recentActivity ?? ([] as DashboardActivityItem[])
	);

	function activityKindColor(kind: DashboardActivityItem['kind']): DashboardColor {
		if (kind === 'sale') return 'success';
		if (kind === 'purchase') return 'warning';
		if (kind === 'transfer') return 'info';
		return 'secondary';
	}

	function activityKindLabel(kind: DashboardActivityItem['kind']): string {
		if (kind === 'sale') return 'Venta';
		if (kind === 'purchase') return 'Compra';
		if (kind === 'transfer') return 'Transferencia';
		return 'Actividad';
	}

	// ─── Stock alerts ─────────────────────────────────────────────────────────

	const stockAlerts = $derived(inventoryPanel?.alerts ?? ([] as InventoryOverviewItem[]));

	function stockStateColor(state: InventoryOverviewItem['stock_state']): DashboardColor {
		if (state === 'out_of_stock' || state === 'emergency') return 'danger';
		if (state === 'low') return 'warning';
		return 'info';
	}

	function stockStateLabel(state: InventoryOverviewItem['stock_state']): string {
		if (state === 'out_of_stock') return 'Sin stock';
		if (state === 'emergency') return 'Crítico';
		if (state === 'low') return 'Bajo';
		if (state === 'in_transit_only') return 'En camino';
		return state;
	}
</script>

<div class="lumi-stack lumi-stack--xl">
	<PageHeader title="Dashboard" subtitle="Bienvenido a Faztore" size="xl" icon="house" />

	<!-- KPI row -->
	<div class="lumi-grid lumi-grid--auto-fit lumi-grid--gap-lg">
		{#each kpiCards as card (card.key)}
			<StatCard
				title={card.title}
				value={card.value}
				icon={card.icon}
				color={card.color}
				subtitle={card.subtitle}
				href={card.href}
			/>
		{/each}
	</div>

	{#if inventoryPanel}
		<!-- Charts row -->
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-lg">
			<DashboardSection
				title="Tendencia de ventas"
				subtitle="Últimos {rangeDays} días · {inventoryPanel.selectedBranchName ??
					'Todas las sedes'}"
				icon="trendingUp"
			>
				<DashboardChart
					data={salesTrendPoints}
					color="primary"
					valueFormat="currency"
					aria-label="Tendencia de ventas en los últimos {rangeDays} días"
				/>
			</DashboardSection>

			<DashboardSection
				title="Estado del inventario"
				subtitle="Distribución de líneas por salud de stock · {inventoryPanel.selectedBranchName ??
					'Todas las sedes'}"
				icon="pieChart"
			>
				<DashboardDonutChart
					data={stockDonutSegments}
					emptyMessage="No hay líneas de inventario registradas para esta sede."
				/>
			</DashboardSection>
		</div>

		<!-- Activity + Alerts row -->
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-lg">
			<DashboardSection
				title="Actividad reciente"
				subtitle="Ventas, compras y transferencias · {inventoryPanel.selectedBranchName ??
					'Todas las sedes'}"
				icon="activity"
			>
				{#if recentActivity.length > 0}
					<div class="lumi-stack lumi-stack--xs dashboard__scroll">
						{#each recentActivity as item (item.key)}
							<div class="dashboard__row">
								<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--start">
									<div class="lumi-flex-item--shrink">
										<Chip size="sm" color={activityKindColor(item.kind)}>
											{activityKindLabel(item.kind)}
										</Chip>
									</div>
									<div class="lumi-flex-item--grow lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-text--sm lumi-font--medium">{item.title}</span>
										<span class="lumi-text--xs lumi-text--muted">{item.description}</span>
										{#if item.meta}
											<span class="lumi-text--xs lumi-text--muted dashboard__meta">{item.meta}</span
											>
										{/if}
									</div>
									<div
										class="lumi-flex-item--shrink lumi-flex lumi-flex--column lumi-flex--gap-2xs dashboard__row-end"
									>
										{#if item.amount !== undefined}
											<span class="lumi-text--sm lumi-font--semibold">
												{formatProductPrice(item.amount)}
											</span>
										{/if}
										{#if item.quantity !== undefined}
											<span class="lumi-text--xs lumi-text--muted">{item.quantity} uds.</span>
										{/if}
										<span class="lumi-text--xs lumi-text--muted">{formatDate(item.occurredAt)}</span
										>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="activity"
						title="Sin actividad reciente"
						description="Las ventas, compras y transferencias aparecerán aquí."
					/>
				{/if}
			</DashboardSection>

			<DashboardSection
				title="Alertas de stock"
				subtitle="Productos en estado crítico o sin disponibilidad"
				icon="alertTriangle"
				titleColor="danger"
			>
				{#if stockAlerts.length > 0}
					<div class="lumi-stack lumi-stack--xs dashboard__scroll">
						{#each stockAlerts as alert (`${alert.product_code}:${alert.branch_code}`)}
							<div class="dashboard__row">
								<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--center">
									<div class="lumi-flex-item--grow lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-text--sm lumi-font--medium">{alert.product_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{alert.sku ?? 'Sin SKU'} · {alert.branch_name}
										</span>
									</div>
									<div
										class="lumi-flex-item--shrink lumi-flex lumi-flex--column lumi-flex--gap-2xs lumi-align-items--end"
									>
										<Chip size="sm" color={stockStateColor(alert.stock_state)}>
											{stockStateLabel(alert.stock_state)}
										</Chip>
										<span class="lumi-text--xs lumi-text--muted">{alert.available} disponibles</span
										>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<EmptyState
						icon="checkCircle"
						iconColor="success"
						title="Sin alertas"
						description="Todos los productos tienen stock suficiente."
					/>
				{/if}
			</DashboardSection>
		</div>
	{/if}
</div>

<style>
	.dashboard__row {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.dashboard__row-end {
		text-align: right;
	}

	.dashboard__scroll {
		max-height: 420px;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.dashboard__scroll::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.dashboard__scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.dashboard__scroll::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	.dashboard__scroll::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-gray-400);
	}

	.dashboard__meta {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 200px;
	}
</style>
