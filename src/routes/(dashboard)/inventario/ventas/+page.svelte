<script lang="ts">
	import { resolve } from '$app/paths';
	import { onDestroy } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Dialog,
		Icon,
		Input,
		List,
		ListHeader,
		ListItem,
		PageHeader,
		Progress,
		SegmentedControl,
		Select,
		Switch,
		Table,
		Textarea
	} from '$lib/components';
	import type { SelectOption, TableRow } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import { formatDate } from '$lib/utils/formatDate';
	import { formatProductPrice } from '$lib/utils/products';
	import type {
		InventoryCustomerRecord,
		InventoryPagination,
		InventorySaleListItem
	} from '$lib/types/inventory';
	import type {
		InventorySaleChannel,
		InventorySaleFulfillmentType,
		InventorySaleShippingState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	interface BranchCatalogItem {
		code: string;
		name: string;
		state: boolean;
	}

	interface ProductCatalogItem {
		code: string;
		name: string;
		category_code: string | null;
		is_active: boolean;
		price: string;
	}

	const { data }: { data: PageData } = $props();

	const EMPTY_PAGINATION: InventoryPagination = {
		page: 1,
		page_size: 20,
		total: 0,
		total_pages: 1
	};

	const SHIPPING_FILTER_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los envíos' },
		{ value: 'na', label: 'Sin envío' },
		{ value: 'pending', label: 'Pendiente' },
		{ value: 'in_transit', label: 'En camino' },
		{ value: 'delivered', label: 'Entregado' }
	];

	const CHANNEL_FILTER_OPTIONS: SelectOption[] = [
		{ value: 'all', label: 'Todos los canales' },
		{ value: 'store', label: 'Tienda' },
		{ value: 'web', label: 'Web' }
	];

	const SHIPPING_STATE_OPTIONS: SelectOption[] = [
		{ value: 'na', label: 'Sin envío' },
		{ value: 'pending', label: 'Pendiente' },
		{ value: 'in_transit', label: 'En camino' },
		{ value: 'delivered', label: 'Entregado' }
	];

	const canRead = $derived(can('inventory:read'));
	const canCreate = $derived(can('inventory:create'));
	const canUpdate = $derived(can('inventory:update'));

	let sales = $state<InventorySaleListItem[]>([]);
	let pagination = $state<InventoryPagination>(EMPTY_PAGINATION);
	let branches = $state<BranchCatalogItem[]>([]);
	let products = $state<ProductCatalogItem[]>([]);
	let favoriteCustomers = $state<InventoryCustomerRecord[]>([]);
	let customerOptions = $state<InventoryCustomerRecord[]>([]);

	let loading = $state(false);
	let errorMessage = $state('');
	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;
	let fetchId = 0;

	let filterBranchCode = $state('all');
	let filterShippingState = $state<'all' | InventorySaleShippingState>('all');
	let filterChannel = $state<'all' | InventorySaleChannel>('all');

	let showCreateDialog = $state(false);
	let submittingCreate = $state(false);
	let createProductCode = $state('');
	let createBranchCode = $state('');
	let createQuantity = $state('1');
	let createUnitPrice = $state('');
	let createSaleChannel = $state<InventorySaleChannel>('store');
	let createFulfillmentType = $state<InventorySaleFulfillmentType>('pickup');
	let createShippingState = $state<InventorySaleShippingState>('na');
	let createDeliveryAddress = $state('');
	let createOrderReference = $state('');
	let createSoldAt = $state(new Date().toISOString().slice(0, 10));
	let createCustomerCode = $state('');
	let createCustomerName = $state('');
	let createCustomerPhone = $state('');
	let createMarkCustomerFavorite = $state(false);
	let createNote = $state('');

	const saleRows = $derived(sales as unknown as TableRow[]);
	const canGoPrev = $derived(pagination.page > 1);
	const canGoNext = $derived(pagination.page < pagination.total_pages);

	const branchFilterOptions = $derived(
		[{ value: 'all', label: 'Todas las sedes' } as SelectOption].concat(
			branches.map((branch) => ({ value: branch.code, label: branch.name }))
		)
	);

	const branchCreateOptions = $derived(
		branches
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const productCreateOptions = $derived(
		products
			.filter((product) => product.is_active)
			.map((product) => ({ value: product.code, label: product.name }) as SelectOption)
	);

	const customerSelectOptions = $derived([
		{ value: '', label: 'Registrar cliente manualmente' } as SelectOption,
		...customerOptions.map((customer) => ({
			value: customer.code,
			label: `${customer.full_name}${customer.is_favorite ? ' ★' : ''}`
		}))
	]);

	const channelSegmentOptions = $derived([
		{ label: 'Tienda', value: 'store', icon: 'store' },
		{ label: 'Web', value: 'web', icon: 'globe' }
	]);

	const fulfillmentSegmentOptions = $derived([
		{ label: 'Recojo', value: 'pickup', icon: 'packageCheck' },
		{ label: 'Delivery', value: 'delivery', icon: 'truck' }
	]);

	const filteredShippingStateOptions = $derived.by(() => {
		if (createFulfillmentType === 'pickup') {
			return SHIPPING_STATE_OPTIONS.filter((option) => option.value === 'na');
		}

		return SHIPPING_STATE_OPTIONS.filter((option) => option.value !== 'na');
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	$effect(() => {
		sales = (data.sales ?? []) as InventorySaleListItem[];
		pagination = (data.pagination ?? EMPTY_PAGINATION) as InventoryPagination;
		branches = (data.branches ?? []) as BranchCatalogItem[];
		products = (data.products ?? []) as ProductCatalogItem[];
		favoriteCustomers = (data.favoriteCustomers ?? []) as InventoryCustomerRecord[];
	});

	function shippingStateLabel(state: InventorySaleShippingState): string {
		if (state === 'na') return 'Sin envío';
		if (state === 'pending') return 'Pendiente';
		if (state === 'in_transit') return 'En camino';
		return 'Entregado';
	}

	function shippingStateColor(
		state: InventorySaleShippingState
	): 'primary' | 'info' | 'warning' | 'success' {
		if (state === 'na') return 'primary';
		if (state === 'pending') return 'warning';
		if (state === 'in_transit') return 'info';
		return 'success';
	}

	function shippingProgress(state: InventorySaleShippingState): number {
		if (state === 'na') return 100;
		if (state === 'pending') return 25;
		if (state === 'in_transit') return 60;
		return 100;
	}

	function nextShippingState(state: InventorySaleShippingState): InventorySaleShippingState | null {
		if (state === 'pending') return 'in_transit';
		if (state === 'in_transit') return 'delivered';
		return null;
	}

	function shippingStateActionLabel(state: InventorySaleShippingState): string {
		if (state === 'pending') return 'Marcar en camino';
		if (state === 'in_transit') return 'Marcar entregado';
		return 'Sin acción';
	}

	function handleFulfillmentChange(next: InventorySaleFulfillmentType): void {
		createFulfillmentType = next;
		if (next === 'pickup') {
			createShippingState = 'na';
			createDeliveryAddress = '';
		} else if (createShippingState === 'na') {
			createShippingState = 'pending';
		}
	}

	async function loadSales(page = pagination.page): Promise<void> {
		if (!canRead) return;

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const params = new SvelteURLSearchParams({
				page: String(page),
				page_size: String(pagination.page_size || 20)
			});

			if (filterBranchCode !== 'all') {
				params.set('branch_code', filterBranchCode);
			}
			if (filterShippingState !== 'all') {
				params.set('shipping_state', filterShippingState);
			}
			if (filterChannel !== 'all') {
				params.set('sale_channel', filterChannel);
			}
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

	async function loadFavoriteCustomers(): Promise<void> {
		try {
			const response = await fetch(
				'/api/inventory/customers?favorites_only=true&page=1&page_size=40'
			);
			if (!response.ok) {
				return;
			}
			const payload = await response.json();
			favoriteCustomers = (payload.customers ?? []) as InventoryCustomerRecord[];
		} catch {
			// Non-critical list refresh
		}
	}

	async function loadCustomerOptions(search = ''): Promise<void> {
		try {
			const params = new SvelteURLSearchParams({ page: '1', page_size: '60' });
			if (search.trim()) {
				params.set('search', search.trim());
			}

			const response = await fetch(`/api/inventory/customers?${params.toString()}`);
			if (!response.ok) {
				return;
			}
			const payload = await response.json();
			customerOptions = (payload.customers ?? []) as InventoryCustomerRecord[];
		} catch {
			// Non-critical options fetch
		}
	}

	function handleSearchInput(value: string): void {
		searchQuery = value;
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			void loadSales(1);
		}, 320);
	}

	async function openCreateDialog(): Promise<void> {
		if (!canCreate) return;

		createProductCode = '';
		createBranchCode = filterBranchCode !== 'all' ? filterBranchCode : '';
		createQuantity = '1';
		createUnitPrice = '';
		createSaleChannel = 'store';
		createFulfillmentType = 'pickup';
		createShippingState = 'na';
		createDeliveryAddress = '';
		createOrderReference = '';
		createSoldAt = new Date().toISOString().slice(0, 10);
		createCustomerCode = '';
		createCustomerName = '';
		createCustomerPhone = '';
		createMarkCustomerFavorite = false;
		createNote = '';
		showCreateDialog = true;
		await loadCustomerOptions();
	}

	async function submitCreateSale(): Promise<void> {
		if (submittingCreate) return;

		const quantity = Number.parseInt(createQuantity, 10);
		const unitPrice = Number.parseFloat(createUnitPrice);

		if (!createProductCode || !createBranchCode || !Number.isInteger(quantity) || quantity <= 0) {
			showToast('Completa producto, sede y cantidad válida', 'error');
			return;
		}

		if (!Number.isFinite(unitPrice) || unitPrice < 0) {
			showToast('El precio unitario es obligatorio', 'error');
			return;
		}

		if (!createCustomerCode && !createCustomerName.trim()) {
			showToast('Debes seleccionar o registrar un cliente', 'error');
			return;
		}

		if (createFulfillmentType === 'delivery' && !createDeliveryAddress.trim()) {
			showToast('La dirección es obligatoria para delivery', 'error');
			return;
		}

		submittingCreate = true;
		try {
			const response = await fetch('/api/inventory/sales', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: createProductCode,
					branch_code: createBranchCode,
					quantity,
					unit_price: unitPrice,
					sale_channel: createSaleChannel,
					fulfillment_type: createFulfillmentType,
					shipping_state: createShippingState,
					delivery_address:
						createFulfillmentType === 'delivery' ? createDeliveryAddress.trim() : null,
					order_reference: createOrderReference.trim(),
					customer_code: createCustomerCode || null,
					customer_name: createCustomerCode ? null : createCustomerName.trim(),
					customer_phone: createCustomerCode ? null : createCustomerPhone.trim(),
					mark_customer_favorite: createMarkCustomerFavorite,
					sold_at: createSoldAt,
					note: createNote.trim()
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la venta');
			}

			showCreateDialog = false;
			showToast('Venta registrada', 'success');
			await Promise.all([loadSales(1), loadFavoriteCustomers()]);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al registrar venta';
			showToast(message, 'error');
		} finally {
			submittingCreate = false;
		}
	}

	async function advanceShippingState(sale: InventorySaleListItem): Promise<void> {
		if (!canUpdate || sale.fulfillment_type !== 'delivery') return;
		const nextState = nextShippingState(sale.shipping_state);
		if (!nextState) return;

		try {
			const response = await fetch(`/api/inventory/sales/${sale.code}/shipping`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipping_state: nextState
				})
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar el envío');
			}

			showToast('Estado de envío actualizado', 'success');
			await loadSales(pagination.page);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar envío';
			showToast(message, 'error');
		}
	}

	async function toggleFavoriteCustomer(customer: InventoryCustomerRecord): Promise<void> {
		if (!canUpdate) return;
		try {
			const response = await fetch(`/api/inventory/customers/${customer.code}/favorite`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_favorite: !customer.is_favorite })
			});

			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo actualizar favorito');
			}

			await Promise.all([loadFavoriteCustomers(), loadCustomerOptions()]);
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'Error al actualizar favorito';
			showToast(message, 'error');
		}
	}

	function deriveProductPrice(productCode: string): void {
		const product = products.find((item) => item.code === productCode);
		if (!product) return;
		createUnitPrice = String(product.price);
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Ventas"
		subtitle="Ventas rápidas con precio, canal, delivery y clientes favoritos"
		icon="creditCard"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<a href={resolve('/inventario')} class="inventory-sales__action-link">
					<Icon icon="boxes" size="sm" />
					<span>Ver Stock</span>
				</a>
				<Button
					type="filled"
					color="primary"
					icon="plus"
					onclick={() => void openCreateDialog()}
					disabled={!canCreate}
				>
					Nueva venta
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<div class="lumi-layout--two-columns inventory-sales__layout">
		<aside class="lumi-layout--sidebar-left">
			<div class="lumi-stack lumi-space--sm">
				<Card spaced>
					<div class="lumi-stack lumi-space--sm">
						<ListHeader title="Sedes" icon="building" color="info" />
						<List size="sm" color="info">
							{#each branchFilterOptions as branch (String(branch.value))}
								<ListItem
									title={branch.label}
									icon="building"
									clickable
									active={filterBranchCode === String(branch.value)}
									onclick={async () => {
										filterBranchCode = String(branch.value);
										await loadSales(1);
									}}
								/>
							{/each}
						</List>
					</div>
				</Card>

				<Card spaced>
					<div class="lumi-stack lumi-space--sm">
						<div class="lumi-flex lumi-justify--between lumi-align-items--center">
							<ListHeader title="Clientes Favoritos" icon="star" color="warning" />
							<Button
								type="flat"
								size="sm"
								icon="refreshCw"
								onclick={() => void loadFavoriteCustomers()}
							/>
						</div>

						{#if favoriteCustomers.length === 0}
							<p class="lumi-text--xs lumi-text--muted lumi-margin--none">No hay favoritos aún.</p>
						{:else}
							<div class="inventory-sales__favorite-list">
								{#each favoriteCustomers as customer (customer.code)}
									<div class="inventory-sales__favorite-item">
										<div class="inventory-sales__favorite-content">
											<p class="lumi-margin--none lumi-font--medium">{customer.full_name}</p>
											<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
												{customer.phone || 'Sin teléfono'}
											</p>
										</div>
										<Button
											type="flat"
											size="sm"
											icon={customer.is_favorite ? 'starOff' : 'star'}
											color={customer.is_favorite ? 'warning' : 'primary'}
											disabled={!canUpdate}
											onclick={() => void toggleFavoriteCustomer(customer)}
										/>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</Card>
			</div>
		</aside>

		<section class="lumi-layout--content-right">
			<div class="lumi-stack lumi-space--md">
				<Card spaced>
					<div class="lumi-flex lumi-flex--gap-sm lumi-flex--wrap inventory-sales__toolbar">
						<div class="inventory-sales__toolbar-field">
							<Select
								label="Envío"
								value={filterShippingState}
								options={SHIPPING_FILTER_OPTIONS}
								clearable={false}
								onchange={async (value) => {
									filterShippingState = (typeof value === 'string' ? value : 'all') as
										| 'all'
										| InventorySaleShippingState;
									await loadSales(1);
								}}
							/>
						</div>
						<div class="inventory-sales__toolbar-field">
							<Select
								label="Canal"
								value={filterChannel}
								options={CHANNEL_FILTER_OPTIONS}
								clearable={false}
								onchange={async (value) => {
									filterChannel = (typeof value === 'string' ? value : 'all') as
										| 'all'
										| InventorySaleChannel;
									await loadSales(1);
								}}
							/>
						</div>
						<div class="inventory-sales__toolbar-search">
							<Input
								label="Buscar por producto / cliente / referencia"
								icon="search"
								value={searchQuery}
								oninput={(event) =>
									handleSearchInput((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
							/>
						</div>
					</div>
				</Card>

				{#if !canRead}
					<Alert type="warning" closable>No tienes permisos para consultar ventas.</Alert>
				{:else}
					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<Card>
						<Table data={saleRows} hover {loading} pagination={false}>
							{#snippet thead()}
								<th>Producto</th>
								<th>Cliente</th>
								<th>Cantidad</th>
								<th>Precio</th>
								<th>Canal</th>
								<th>Entrega</th>
								<th>Envío</th>
								<th>Fecha</th>
								<th>Acciones</th>
							{/snippet}

							{#snippet row({ row })}
								{@const sale = row as unknown as InventorySaleListItem}
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<a
											href={resolve(`/products/${sale.product_code}`)}
											class="inventory-sales__product-link"
										>
											{sale.product_name}
										</a>
										<span class="lumi-text--xs lumi-text--muted">
											{sale.branch_name} · {sale.product_sku || 'Sin SKU'}
										</span>
									</div>
								</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span>{sale.customer_name}</span>
										<span class="lumi-text--xs lumi-text--muted">
											{sale.customer_phone || 'Sin teléfono'}
											{#if sale.customer_is_favorite}
												<span class="inventory-sales__favorite-badge">★ favorito</span>
											{/if}
										</span>
									</div>
								</td>
								<td>{sale.quantity}</td>
								<td>
									<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
										<span>{formatProductPrice(sale.unit_price)}</span>
										<span class="lumi-text--xs lumi-text--muted">
											Total {formatProductPrice(sale.total_amount)}
										</span>
									</div>
								</td>
								<td>
									<Chip size="sm" color={sale.sale_channel === 'store' ? 'primary' : 'info'}>
										{sale.sale_channel === 'store' ? 'Tienda' : 'Web'}
									</Chip>
								</td>
								<td>
									<Chip
										size="sm"
										color={sale.fulfillment_type === 'pickup' ? 'success' : 'warning'}
									>
										{sale.fulfillment_type === 'pickup' ? 'Recojo' : 'Delivery'}
									</Chip>
								</td>
								<td>
									<div class="inventory-sales__shipping-cell">
										<Progress
											value={shippingProgress(sale.shipping_state)}
											color={shippingStateColor(sale.shipping_state)}
											size="sm"
										/>
										<Chip color={shippingStateColor(sale.shipping_state)} size="sm">
											{shippingStateLabel(sale.shipping_state)}
										</Chip>
									</div>
								</td>
								<td>{formatDate(sale.sold_at)}</td>
								<td>
									{#if sale.fulfillment_type === 'delivery' && nextShippingState(sale.shipping_state)}
										<Button
											type="flat"
											size="sm"
											icon="truck"
											color="info"
											disabled={!canUpdate}
											onclick={() => void advanceShippingState(sale)}
										>
											{shippingStateActionLabel(sale.shipping_state)}
										</Button>
									{:else}
										<span class="lumi-text--xs lumi-text--muted">Sin acción</span>
									{/if}
								</td>
							{/snippet}
						</Table>
					</Card>

					<Card spaced>
						<div class="inventory-sales__pagination">
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Página {pagination.page} de {pagination.total_pages} · {pagination.total} registros
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

<Dialog bind:open={showCreateDialog} title="Registrar venta" size="lg">
	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Producto"
			value={createProductCode}
			options={productCreateOptions}
			placeholder="Selecciona producto"
			onchange={(value) => {
				createProductCode = typeof value === 'string' ? value : '';
				deriveProductPrice(createProductCode);
			}}
		/>
		<Select
			label="Sede"
			value={createBranchCode}
			options={branchCreateOptions}
			placeholder="Selecciona sede"
			onchange={(value) => {
				createBranchCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Input
			label="Cantidad"
			type="number"
			value={createQuantity}
			oninput={(event) => (createQuantity = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Precio unitario"
			type="number"
			value={createUnitPrice}
			oninput={(event) => (createUnitPrice = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Fecha de venta"
			type="date"
			value={createSoldAt}
			oninput={(event) => (createSoldAt = (event.currentTarget as HTMLInputElement).value)}
		/>
		<Input
			label="Referencia pedido (opcional)"
			value={createOrderReference}
			oninput={(event) => (createOrderReference = (event.currentTarget as HTMLInputElement).value)}
		/>
	</div>

	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md inventory-sales__dialog-segments">
		<div>
			<p class="lumi-text--xs lumi-text--muted lumi-margin-bottom--xs">Canal</p>
			<SegmentedControl
				value={createSaleChannel}
				options={channelSegmentOptions}
				fullWidth
				onchange={(value) => {
					createSaleChannel = (value as InventorySaleChannel) ?? 'store';
				}}
			/>
		</div>
		<div>
			<p class="lumi-text--xs lumi-text--muted lumi-margin-bottom--xs">Entrega</p>
			<SegmentedControl
				value={createFulfillmentType}
				options={fulfillmentSegmentOptions}
				fullWidth
				onchange={(value) => {
					handleFulfillmentChange((value as InventorySaleFulfillmentType) ?? 'pickup');
				}}
			/>
		</div>
	</div>

	<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
		<Select
			label="Cliente favorito o existente"
			value={createCustomerCode}
			options={customerSelectOptions}
			clearable={false}
			onsearch={(query) => void loadCustomerOptions(query)}
			onchange={(value) => {
				createCustomerCode = typeof value === 'string' ? value : '';
			}}
		/>
		<Select
			label="Estado de envío"
			value={createShippingState}
			options={filteredShippingStateOptions}
			clearable={false}
			onchange={(value) => {
				createShippingState = (
					typeof value === 'string' ? value : 'na'
				) as InventorySaleShippingState;
			}}
		/>
	</div>

	{#if !createCustomerCode}
		<div class="lumi-grid lumi-grid--columns-2 lumi-grid--gap-md">
			<Input
				label="Cliente"
				value={createCustomerName}
				oninput={(event) => (createCustomerName = (event.currentTarget as HTMLInputElement).value)}
			/>
			<Input
				label="Teléfono (opcional)"
				value={createCustomerPhone}
				oninput={(event) => (createCustomerPhone = (event.currentTarget as HTMLInputElement).value)}
			/>
		</div>
		<Switch
			label="Guardar cliente en favoritos"
			checked={createMarkCustomerFavorite}
			onchange={(checked) => {
				createMarkCustomerFavorite = checked;
			}}
		/>
	{/if}

	{#if createFulfillmentType === 'delivery'}
		<Input
			label="Dirección de delivery"
			value={createDeliveryAddress}
			oninput={(event) => (createDeliveryAddress = (event.currentTarget as HTMLInputElement).value)}
		/>
	{/if}

	<Textarea
		label="Nota (opcional)"
		rows={3}
		value={createNote}
		oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
	/>

	{#snippet footer()}
		<Button type="border" onclick={() => (showCreateDialog = false)}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			loading={submittingCreate}
			onclick={() => void submitCreateSale()}
		>
			Registrar venta
		</Button>
	{/snippet}
</Dialog>

<style>
	.inventory-sales__layout {
		align-items: stretch;
	}

	.inventory-sales__toolbar {
		align-items: flex-end;
	}

	.inventory-sales__toolbar-field {
		flex: 1 1 220px;
		min-width: 200px;
	}

	.inventory-sales__toolbar-search {
		flex: 1 1 360px;
		min-width: 280px;
	}

	.inventory-sales__pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--lumi-space-sm);
		flex-wrap: wrap;
	}

	.inventory-sales__action-link {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		color: var(--lumi-color-text);
		text-decoration: none;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
	}

	.inventory-sales__action-link:hover {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 40%, var(--lumi-color-border-light));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.inventory-sales__favorite-list {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.inventory-sales__favorite-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-xs);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
	}

	.inventory-sales__favorite-content {
		flex: 1;
		min-width: 0;
	}

	.inventory-sales__product-link {
		color: var(--lumi-color-primary);
		text-decoration: none;
		font-weight: var(--lumi-font-weight-semibold);
	}

	.inventory-sales__product-link:hover {
		text-decoration: underline;
	}

	.inventory-sales__favorite-badge {
		margin-left: var(--lumi-space-2xs);
		color: var(--lumi-color-warning);
	}

	.inventory-sales__shipping-cell {
		min-width: 150px;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.inventory-sales__dialog-segments {
		margin-top: var(--lumi-space-xs);
	}

	@media (max-width: 1024px) {
		.inventory-sales__toolbar {
			align-items: stretch;
		}

		.inventory-sales__toolbar-field,
		.inventory-sales__toolbar-search {
			flex-basis: 100%;
			min-width: 100%;
		}
	}
</style>
