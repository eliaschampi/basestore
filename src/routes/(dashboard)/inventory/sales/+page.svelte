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
		Context,
		ContextItem,
		Dialog,
		InfoItem,
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

	type SaleDetailLine = InventorySaleListItem['items'][number];

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
	let salesContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
		  }
		| undefined = $state();
	let contextSale = $state<InventorySaleListItem | null>(null);

	let showVoidDialog = $state(false);
	let submittingVoidSale = $state(false);
	let voidNote = $state('');
	let voidSaleTarget = $state<InventorySaleListItem | null>(null);

	const saleRows = $derived(sales as unknown as TableRow[]);
	const detailSaleItemRows = $derived((detailSale?.items ?? []) as unknown as TableRow[]);
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

	function primarySaleItemLabel(sale: InventorySaleListItem): string {
		const primaryName = sale.primary_product_name?.trim();
		if (primaryName) return primaryName;

		const firstLineName = sale.items.find((item) => item.product_name.trim())?.product_name?.trim();
		if (firstLineName) return firstLineName;

		return 'Sin items';
	}

	function saleItemsMetaLabel(sale: InventorySaleListItem): string {
		if (sale.item_count <= 0) return 'Sin items';

		const extraItems = Math.max(sale.item_count - 1, 0);
		if (extraItems > 0) {
			return `+${extraItems} ${extraItems === 1 ? 'item' : 'items'}`;
		}

		return '1 item';
	}

	function salePreviewLabel(sale: InventorySaleListItem): string {
		if (sale.item_count <= 0) return 'items seleccionados';

		const primary = primarySaleItemLabel(sale);
		const extraItems = Math.max(sale.item_count - 1, 0);
		if (extraItems <= 0) return primary;

		return `${primary} +${extraItems}`;
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

	function openSalesContextMenu(event: MouseEvent, row: TableRow): void {
		const sale = row as unknown as InventorySaleListItem;
		contextSale = sale;
		salesContextMenu?.open(event, sale);
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
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
								Click derecho sobre una fila para ver acciones.
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
							onrow-click={(row) => openSaleDetail(row as unknown as InventorySaleListItem)}
							onrow-contextmenu={openSalesContextMenu}
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
							{/snippet}

							{#snippet row({ row })}
								{@const sale = row as unknown as InventorySaleListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span class="lumi-font--medium">{primarySaleItemLabel(sale)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{saleItemsMetaLabel(sale)}
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

<Context bind:this={salesContextMenu} aria-label="Acciones de venta">
	{#snippet children({ data })}
		{@const sale = (data as InventorySaleListItem | null) ?? contextSale}
		{#if sale}
			<ContextItem title="Ver detalle" icon="eye" onclick={() => openSaleDetail(sale)} />
			{#if sale.fulfillment_type === 'delivery' && nextShippingState(sale.shipping_state) && !isSaleVoided(sale)}
				<ContextItem
					title={shippingActionLabel(sale.shipping_state)}
					icon="arrowRight"
					disabled={!canUpdate}
					onclick={() => void advanceShippingState(sale)}
				/>
			{/if}
			<ContextItem
				title="Anular venta"
				icon="xCircle"
				danger
				disabled={!canUpdate || isSaleVoided(sale)}
				onclick={() => openVoidDialog(sale)}
			/>
		{/if}
	{/snippet}
</Context>

<Dialog bind:open={showDetailDialog} title="Detalle de venta" size="lg" scrollable>
	{#if detailSale}
		<div class="lumi-stack lumi-space--sm">
			<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
				<InfoItem
					layout="vertical"
					label="Cliente"
					value={`${detailSale.customer_name} · ${detailSale.customer_phone || 'Sin telefono'}`}
				/>
				<InfoItem
					layout="vertical"
					label="Estado venta"
					value={detailSale.voided_at
						? `Anulada: ${formatDate(detailSale.voided_at)}`
						: 'Operativa'}
				/>
				<InfoItem
					layout="vertical"
					label="Canal / entrega"
					value={`${saleChannelLabel(detailSale.sale_channel)} · ${fulfillmentLabel(detailSale.fulfillment_type)}`}
				/>
				<InfoItem
					layout="vertical"
					label="Envio"
					value={`${shippingStateLabel(detailSale.shipping_state)} · ${detailSale.order_reference || 'Sin referencia'}`}
				/>
				<InfoItem
					layout="vertical"
					label="Items / unidades"
					value={`${detailSale.item_count} ${detailSale.item_count === 1 ? 'item' : 'items'} · ${detailSale.total_quantity} unidades`}
				/>
				<InfoItem
					layout="vertical"
					label="Item principal"
					value={primarySaleItemLabel(detailSale)}
				/>
				<InfoItem
					layout="vertical"
					label="Monto"
					value={`Total: ${formatProductPrice(detailSale.total_amount)} · Utilidad: ${formatProductPrice(detailSale.profit_amount)}`}
				/>
				<InfoItem
					layout="vertical"
					label="Fecha / sede"
					value={`${formatDate(detailSale.sold_at)} · ${detailSale.branch_name}`}
				/>
			</div>
		</div>

		<div class="lumi-stack lumi-space--2xs">
			<p class="lumi-margin--none"><strong>Items</strong></p>
			{#if detailSale.items.length > 0}
				<Table
					data={detailSaleItemRows}
					pagination={false}
					class="inventory-table inventory-table--sale-detail"
				>
					{#snippet thead()}
						<th>Producto</th>
						<th>SKU</th>
						<th>Cantidad</th>
						<th>Precio unitario</th>
						<th>Subtotal</th>
					{/snippet}
					{#snippet row({ row })}
						{@const line = row as unknown as SaleDetailLine}
						<td>{line.product_name}</td>
						<td>{line.product_sku || '-'}</td>
						<td>{line.quantity}</td>
						<td>{formatProductPrice(line.unit_price)}</td>
						<td>{formatProductPrice(line.total_amount)}</td>
					{/snippet}
				</Table>
			{:else}
				<Alert type="info" closable={false}>No hay items para mostrar en esta venta.</Alert>
			{/if}
		</div>

		{#if detailSale.delivery_address || detailSale.note || detailSale.void_note}
			<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
				{#if detailSale.delivery_address}
					<InfoItem layout="vertical" label="Direccion" value={detailSale.delivery_address} />
				{/if}
				{#if detailSale.note}
					<InfoItem layout="vertical" label="Nota" value={detailSale.note} />
				{/if}
				{#if detailSale.void_note}
					<InfoItem layout="vertical" label="Motivo anulacion" value={detailSale.void_note} />
				{/if}
			</div>
		{/if}
	{/if}

	{#snippet footer()}
		<Button type="border" onclick={() => (showDetailDialog = false)}>Cerrar</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showVoidDialog} title="Confirmar anulacion" size="sm">
	{#if voidSaleTarget}
		<p class="lumi-margin--none">
			Se anulara la venta de <strong>{salePreviewLabel(voidSaleTarget)}</strong>. El stock volvera a
			inventario.
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

	:global(.inventory-table--sale-detail .lumi-table__content) {
		min-width: 38rem;
	}
</style>
