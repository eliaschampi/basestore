<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Input,
		PageHeader,
		PageSidebar,
		Radio,
		SegmentedControl,
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { formatDate } from '$lib/utils/formatDate';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryPagination, InventorySaleListItem } from '$lib/types/inventory';
	import {
		resolveInventoryBranchCode,
		type InventorySaleChannel,
		type InventorySaleFulfillmentType,
		type InventorySaleStatusFilter,
		type InventorySaleShippingState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 1
	};

	const SHIPPING_FILTER_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los envios' },
		{ value: 'na', label: 'Sin envio' },
		{ value: 'pending', label: 'Pendiente' },
		{ value: 'in_transit', label: 'En camino' },
		{ value: 'delivered', label: 'Entregado' }
	];

	const CHANNEL_FILTER_OPTIONS = [
		{ value: 'all', label: 'Todos los canales' },
		{ value: 'store', label: 'Tienda' },
		{ value: 'web', label: 'Web' }
	] as const;

	const SALE_STATUS_SEGMENT_OPTIONS = [
		{ label: 'Activas', value: 'active', icon: 'checkCircle' },
		{ label: 'Anuladas', value: 'voided', icon: 'xCircle' }
	] as const;
	type SalesStatusFilter = Exclude<InventorySaleStatusFilter, 'all'>;

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let sales = $state<InventorySaleListItem[]>([]);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);
	let branches = $state<BranchCatalogItem[]>([]);

	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterBranchCode = $state('');
	let filterShippingState = $state<'all' | InventorySaleShippingState>('all');
	let filterChannel = $state<'all' | InventorySaleChannel>('all');
	let filterSaleStatus = $state<SalesStatusFilter>('active');
	let showMobileSidebar = $state(false);

	let showDetailDialog = $state(false);
	let detailSale = $state<InventorySaleListItem | null>(null);

	let showVoidDialog = $state(false);
	let submittingVoidSale = $state(false);
	let voidNote = $state('');
	let voidSaleTarget = $state<InventorySaleListItem | null>(null);

	const saleRows = $derived(sales as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);
	const activeBranchLabel = $derived.by(
		() =>
			branches.find((branch) => branch.code === filterBranchCode)?.name ?? 'Sin sede seleccionada'
	);
	const activeStatusLabel = $derived.by(() => {
		if (filterSaleStatus === 'active') return 'Activas';
		return 'Anuladas';
	});
	const branchOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	function branchQuery(branchCode: string): string {
		if (!branchCode) return '';
		const params = new URLSearchParams({ branch_code: branchCode });
		return `?${params.toString()}`;
	}

	function navigateWithBranch(path: '/inventory' | '/inventory/sales/new'): void {
		const destination = `${path}${branchQuery(filterBranchCode)}` as
			| '/inventory'
			| '/inventory/sales/new';
		void goto(resolve(destination));
	}

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		const nextSales = (data.sales ?? []) as InventorySaleListItem[];
		const nextPagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		const nextBranches = (data.branches ?? []) as BranchCatalogItem[];

		sales = nextSales;
		pagination = nextPagination;
		branches = nextBranches;

		const preferredBranch = (data.selectedBranchCode as string | undefined) ?? '';
		if (!filterBranchCode) {
			filterBranchCode = resolveInventoryBranchCode(nextBranches, preferredBranch);
		}
	});

	function shippingStateLabel(state: InventorySaleShippingState): string {
		if (state === 'na') return 'Sin envio';
		if (state === 'pending') return 'Pendiente';
		if (state === 'in_transit') return 'En camino';
		return 'Entregado';
	}

	function shippingStateColor(
		state: InventorySaleShippingState
	): 'primary' | 'warning' | 'info' | 'success' {
		if (state === 'na') return 'primary';
		if (state === 'pending') return 'warning';
		if (state === 'in_transit') return 'info';
		return 'success';
	}

	function nextShippingState(state: InventorySaleShippingState): InventorySaleShippingState | null {
		if (state === 'pending') return 'in_transit';
		if (state === 'in_transit') return 'delivered';
		return null;
	}

	function shippingActionLabel(state: InventorySaleShippingState): string {
		if (state === 'pending') return 'En camino';
		if (state === 'in_transit') return 'Entregado';
		return 'Sin accion';
	}

	function isSaleVoided(sale: InventorySaleListItem): boolean {
		return sale.voided_at !== null;
	}

	function saleStatusLabel(sale: InventorySaleListItem): string {
		return isSaleVoided(sale) ? 'Anulada' : 'Activa';
	}

	function saleStatusColor(sale: InventorySaleListItem): 'success' | 'danger' {
		return isSaleVoided(sale) ? 'danger' : 'success';
	}

	function saleChannelLabel(channel: InventorySaleChannel): string {
		return channel === 'store' ? 'Tienda' : 'Web';
	}

	function fulfillmentLabel(type: InventorySaleFulfillmentType): string {
		return type === 'pickup' ? 'Recojo en tienda' : 'Delivery';
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadSales(1);
		}, 300);
	}

	async function loadSales(page = pagination.page): Promise<void> {
		if (!canRead || !filterBranchCode) return;

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				branch_code: filterBranchCode,
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

			if (filterShippingState !== 'all') {
				params.set('shipping_state', filterShippingState);
			}
			if (filterChannel !== 'all') {
				params.set('sale_channel', filterChannel);
			}
			params.set('status', filterSaleStatus);
			if (searchQuery.trim()) {
				params.set('search', searchQuery.trim());
			}

			const response = await fetch(`/api/inventory/sales?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== fetchId) return;
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudieron cargar las ventas');
			}

			sales = (payload.sales ?? []) as InventorySaleListItem[];
			pagination = (payload.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar ventas';
			}
		} finally {
			if (requestId === fetchId) {
				loading = false;
			}
		}
	}

	function openSaleDetail(sale: InventorySaleListItem): void {
		detailSale = sale;
		showDetailDialog = true;
	}

	async function advanceShippingState(sale: InventorySaleListItem): Promise<void> {
		if (!canUpdate || sale.fulfillment_type !== 'delivery' || isSaleVoided(sale)) return;
		const nextState = nextShippingState(sale.shipping_state);
		if (!nextState) return;

		try {
			const response = await fetch(`/api/inventory/sales/${sale.code}/shipping`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shipping_state: nextState })
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar envio');
			}

			showToast('Estado de envio actualizado', 'success');
			await loadSales(pagination.page);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar envio';
			showToast(message, 'error');
		}
	}

	function openVoidDialog(sale: InventorySaleListItem): void {
		if (!canUpdate || isSaleVoided(sale)) return;
		voidSaleTarget = sale;
		voidNote = '';
		showVoidDialog = true;
	}

	function closeVoidDialog(): void {
		showVoidDialog = false;
		voidNote = '';
		voidSaleTarget = null;
	}

	async function submitVoidSale(): Promise<void> {
		if (submittingVoidSale || !voidSaleTarget || !canUpdate) return;

		submittingVoidSale = true;
		try {
			const response = await fetch(`/api/inventory/sales/${voidSaleTarget.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note: voidNote.trim() })
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo anular la venta');
			}

			showToast('Venta anulada y stock restituido', 'success');
			closeVoidDialog();
			await loadSales(pagination.page);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al anular venta';
			showToast(message, 'error');
		} finally {
			submittingVoidSale = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Ventas"
		subtitle="Panel lateral unificado para filtros y operación rápida"
		icon="creditCard"
	>
		{#snippet actions()}
			<div
				class="lumi-flex lumi-flex--gap-sm lumi-align-items--center lumi-page-sidebar__header-actions"
			>
				<Button
					type="ghost"
					size="sm"
					icon="slidersHorizontal"
					class="lumi-page-sidebar__mobile-trigger"
					onclick={() => (showMobileSidebar = true)}
					aria-label="Abrir filtros de ventas"
				/>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={() => navigateWithBranch('/inventory/sales/new')}
					disabled={!canCreate}
				>
					Nueva venta
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns lumi-page-sidebar-layout inventory-sales__layout">
		<PageSidebar
			bind:mobileOpen={showMobileSidebar}
			variant="inventory-sales"
			mobileTitle="Panel de ventas"
			mobileAriaLabel="Cerrar filtros de ventas"
		>
			{#snippet sidebar()}
				{@render salesSidebar()}
			{/snippet}
		</PageSidebar>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--sm">
				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar ventas.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card spaced>
						<div class="inventory-sales__active-context">
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Sede activa</p>
							<p class="lumi-margin--none lumi-font--semibold">
								{activeBranchLabel} · {activeStatusLabel} · {pagination.total} registros
							</p>
						</div>
					</Card>

					<Card>
						<Table
							data={saleRows}
							hover
							{loading}
							pagination={false}
							class="inventory-table inventory-table--sales"
						>
							{#snippet thead()}
								<th>Items</th>
								<th>Cliente</th>
								<th>Unidades</th>
								<th>Total</th>
								<th>Utilidad</th>
								<th>Canal</th>
								<th>Envio</th>
								<th>Estado</th>
								<th>Fecha</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const sale = row as unknown as InventorySaleListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{sale.products_summary || 'Sin items'}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{sale.item_count}
											{sale.item_count === 1 ? 'item' : 'items'}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span>{sale.customer_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{sale.customer_phone || 'Sin telefono'}
										</span>
									</div>
								</td>
								<td>{sale.total_quantity}</td>
								<td>{formatProductPrice(sale.total_amount)}</td>
								<td>{formatProductPrice(sale.profit_amount)}</td>
								<td>
									<Chip size="sm" color={sale.sale_channel === 'store' ? 'primary' : 'info'}>
										{saleChannelLabel(sale.sale_channel)}
									</Chip>
								</td>
								<td>
									<Chip color={shippingStateColor(sale.shipping_state)} size="sm">
										{shippingStateLabel(sale.shipping_state)}
									</Chip>
								</td>
								<td>
									<Chip color={saleStatusColor(sale)} size="sm">{saleStatusLabel(sale)}</Chip>
								</td>
								<td>{formatDate(sale.sold_at)}</td>
								<td>
									<div class="lumi-flex lumi-flex--gap-2xs inventory-sales__actions">
										<Button
											type="border"
											size="sm"
											icon="eye"
											color="info"
											aria-label="Ver detalle de venta"
											onclick={() => openSaleDetail(sale)}
										>
											Detalle
										</Button>
										{#if sale.fulfillment_type === 'delivery' && nextShippingState(sale.shipping_state) && !isSaleVoided(sale)}
											<Button
												type="flat"
												size="sm"
												icon="arrowRight"
												color="info"
												aria-label="Avanzar estado de envio"
												disabled={!canUpdate}
												onclick={() => void advanceShippingState(sale)}
											>
												{shippingActionLabel(sale.shipping_state)}
											</Button>
										{/if}
										<Button
											type="flat"
											size="sm"
											icon="xCircle"
											color="danger"
											aria-label="Anular venta"
											disabled={!canUpdate || isSaleVoided(sale)}
											onclick={() => openVoidDialog(sale)}
										>
											Anular
										</Button>
									</div>
								</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-sales__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Pagina {pagination.page} de {pagination.total_pages} · {pagination.total} registros
							</p>
							<div class="lumi-flex lumi-flex--gap-sm">
								<Button
									type="border"
									size="sm"
									icon="chevronLeft"
									disabled={!canGoPrev || loading}
									onclick={() => void loadSales(pagination.page - 1)}
								>
									Anterior
								</Button>
								<Button
									type="border"
									size="sm"
									iconAfter
									icon="chevronRight"
									disabled={!canGoNext || loading}
									onclick={() => void loadSales(pagination.page + 1)}
								>
									Siguiente
								</Button>
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</section>
	</div>
</div>

{#snippet salesSidebar()}
	<div class="lumi-stack lumi-space--sm">
		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Filtros</p>
			<div>
				<p class="lumi-text--xs lumi-text--muted lumi-margin-bottom--xs">Estado de venta</p>
				<SegmentedControl
					value={filterSaleStatus}
					options={SALE_STATUS_SEGMENT_OPTIONS as unknown as {
						label: string;
						value: string;
						icon?: string;
					}[]}
					fullWidth
					onchange={async (value) => {
						filterSaleStatus = (typeof value === 'string' ? value : 'active') as SalesStatusFilter;
						await loadSales(1);
						showMobileSidebar = false;
					}}
				/>
			</div>
			<Select
				size="md"
				label="Sede"
				value={filterBranchCode}
				options={branchOptions}
				clearable={false}
				onchange={async (value) => {
					filterBranchCode = typeof value === 'string' ? value : filterBranchCode;
					await loadSales(1);
					showMobileSidebar = false;
				}}
			/>
			<Select
				size="md"
				label="Envio"
				value={filterShippingState}
				options={SHIPPING_FILTER_OPTIONS}
				clearable={false}
				onchange={async (value) => {
					filterShippingState = (
						typeof value === 'string' ? value : 'all'
					) as typeof filterShippingState;
					await loadSales(1);
					showMobileSidebar = false;
				}}
			/>
			<Input
				size="md"
				label="Buscar producto / cliente / referencia"
				placeholder="Ej: polo, SKU-100"
				icon="search"
				value={searchQuery}
				oninput={(event) =>
					handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
			/>
		</div>

		<div class="lumi-page-sidebar__section">
			<p class="lumi-page-sidebar__label">Canales</p>
			<div class="lumi-page-sidebar__radio-group">
				{#each CHANNEL_FILTER_OPTIONS as option (option.value)}
					<Radio
						name="sales-channel-filter"
						group={filterChannel}
						value={option.value}
						label={option.label}
						onchange={async (value) => {
							filterChannel = (typeof value === 'string' ? value : 'all') as typeof filterChannel;
							await loadSales(1);
							showMobileSidebar = false;
						}}
					/>
				{/each}
			</div>
		</div>
	</div>
{/snippet}

<Dialog bind:open={showDetailDialog} title="Detalle de venta" size="md">
	{#if detailSale}
		<div class="inventory-sales__detail-grid">
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Resumen items</p>
				<p class="inventory-sales__detail-value">{detailSale.products_summary || 'Sin items'}</p>
				<p class="inventory-sales__detail-meta">
					{detailSale.item_count}
					{detailSale.item_count === 1 ? 'item' : 'items'}
				</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Cliente</p>
				<p class="inventory-sales__detail-value">{detailSale.customer_name}</p>
				<p class="inventory-sales__detail-meta">{detailSale.customer_phone || 'Sin telefono'}</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Canal / Entrega</p>
				<p class="inventory-sales__detail-value">{saleChannelLabel(detailSale.sale_channel)}</p>
				<p class="inventory-sales__detail-meta">{fulfillmentLabel(detailSale.fulfillment_type)}</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Envio</p>
				<p class="inventory-sales__detail-value">{shippingStateLabel(detailSale.shipping_state)}</p>
				<p class="inventory-sales__detail-meta">{detailSale.order_reference || 'Sin referencia'}</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Estado venta</p>
				<p class="inventory-sales__detail-value">{saleStatusLabel(detailSale)}</p>
				<p class="inventory-sales__detail-meta">
					{#if detailSale.voided_at}
						Anulada: {formatDate(detailSale.voided_at)}
					{:else}
						Operativa
					{/if}
				</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Monto</p>
				<p class="inventory-sales__detail-value">
					Total: {formatProductPrice(detailSale.total_amount)}
				</p>
				<p class="inventory-sales__detail-meta">
					Utilidad: {formatProductPrice(detailSale.profit_amount)}
				</p>
			</div>
			<div class="inventory-sales__detail-item">
				<p class="inventory-sales__detail-label">Fecha / Sede</p>
				<p class="inventory-sales__detail-value">{formatDate(detailSale.sold_at)}</p>
				<p class="inventory-sales__detail-meta">{detailSale.branch_name}</p>
			</div>
		</div>

		{#if detailSale.items.length > 0}
			<div class="inventory-sales__detail-extra">
				<p class="lumi-margin--none"><strong>Items</strong></p>
				<div class="lumi-stack lumi-space--2xs">
					{#each detailSale.items as line (line.code)}
						<div class="inventory-sales__line-item">
							<span>{line.product_name}</span>
							<span>{line.quantity} x {formatProductPrice(line.unit_price)}</span>
							<span>{formatProductPrice(line.total_amount)}</span>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<div class="inventory-sales__detail-extra">
			{#if detailSale.delivery_address}
				<p class="lumi-margin--none">
					<strong>Direccion:</strong>
					{detailSale.delivery_address}
				</p>
			{/if}
			{#if detailSale.note}
				<p class="lumi-margin--none">
					<strong>Nota:</strong>
					{detailSale.note}
				</p>
			{/if}
			{#if detailSale.void_note}
				<p class="lumi-margin--none">
					<strong>Motivo anulacion:</strong>
					{detailSale.void_note}
				</p>
			{/if}
		</div>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showDetailDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showVoidDialog} title="Confirmar anulacion" size="sm">
	{#if voidSaleTarget}
		<p class="lumi-margin--none">
			Se anulara la venta de <strong
				>{voidSaleTarget.products_summary || 'items seleccionados'}</strong
			>. El stock volvera a inventario.
		</p>
		<Textarea
			label="Motivo (opcional)"
			rows={3}
			value={voidNote}
			oninput={(event) => (voidNote = (event.currentTarget as HTMLTextAreaElement).value)}
		/>
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={closeVoidDialog}>Cancelar</Button>
		<Button
			type="filled"
			color="danger"
			loading={submittingVoidSale}
			disabled={!canUpdate || !voidSaleTarget}
			onclick={() => void submitVoidSale()}
		>
			Anular venta
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-sales__layout {
		align-items: start;
	}

	.inventory-sales__active-context {
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
	}

	.inventory-sales__actions {
		flex-wrap: wrap;
	}

	.inventory-sales__detail-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--lumi-space-sm);
	}

	.inventory-sales__detail-item {
		padding: var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
	}

	.inventory-sales__detail-label,
	.inventory-sales__detail-value,
	.inventory-sales__detail-meta {
		margin: 0;
	}

	.inventory-sales__detail-label {
		font-size: var(--lumi-font-size-2xs);
		font-weight: var(--lumi-font-weight-semibold);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--lumi-color-text-muted);
	}

	.inventory-sales__detail-value {
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
	}

	.inventory-sales__detail-meta {
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.inventory-sales__detail-extra {
		margin-top: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-md);
		background: color-mix(in srgb, var(--lumi-color-surface) 94%, transparent);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-sales__line-item {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.inventory-sales__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	:global(.inventory-table--sales .lumi-table__content) {
		min-width: 72rem;
	}

	@media (max-width: 1024px) {
		.inventory-sales__detail-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
