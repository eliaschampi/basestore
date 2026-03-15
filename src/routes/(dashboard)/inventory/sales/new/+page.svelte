<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Button,
		Card,
		Fieldset,
		Input,
		NumberInput,
		PageHeader,
		SegmentedControl,
		Select,
		Table,
		Textarea
	} from '$lib/components';
	import type { SegmentedControlOption, SelectOption, TableRow } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryCustomerRecord } from '$lib/types/inventory';
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
		cost_price: string;
	}

	interface SaleDraftItem {
		product_code: string;
		product_name: string;
		quantity: number;
		unit_price: number;
		unit_cost: number;
	}

	interface SaleStockSnapshot {
		product_code: string;
		available: number;
	}

	function todayLocalDate(): string {
		const now = new Date();
		const offsetMilliseconds = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
	}

	const { data }: { data: PageData } = $props();

	const CHANNEL_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'Tienda', value: 'store', icon: 'store' },
		{ label: 'Web', value: 'web', icon: 'globe' }
	];

	const FULFILLMENT_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'Recojo', value: 'pickup', icon: 'package' },
		{ label: 'Delivery', value: 'delivery', icon: 'package' }
	];

	const DELIVERY_SHIPPING_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'Pendiente', value: 'pending', icon: 'clock' },
		{ label: 'En camino', value: 'in_transit', icon: 'arrowRight' },
		{ label: 'Entregado', value: 'delivered', icon: 'checkCircle' }
	];

	let submitting = $state(false);
	let draftStockLoading = $state(false);
	let draftProductStock = $state<SaleStockSnapshot | null>(null);
	let stockRequestId = 0;
	let customerSearchOptions = $state<InventoryCustomerRecord[]>([]);

	let createBranchCode = $state('');
	let createSaleChannel = $state<InventorySaleChannel>('store');
	let createFulfillmentType = $state<InventorySaleFulfillmentType>('pickup');
	let createShippingState = $state<InventorySaleShippingState>('na');
	let createDeliveryAddress = $state('');
	let createOrderReference = $state('');
	let createSoldAt = $state(todayLocalDate());
	let createCustomerCode = $state('');
	let createCustomerName = $state('');
	let createCustomerPhone = $state('');
	let createNote = $state('');

	let draftProductCode = $state('');
	let draftQuantity = $state(1);
	let draftUnitPrice = $state(0);
	let draftItems = $state<SaleDraftItem[]>([]);

	onMount(() => {
		if (!createBranchCode) {
			createBranchCode = (data.selectedBranchCode as string | null) || '';
		}

		if (customerSearchOptions.length === 0) {
			customerSearchOptions = (data.customers ?? []) as InventoryCustomerRecord[];
		}

		if (createBranchCode && draftProductCode) {
			void loadDraftProductStock(draftProductCode);
		}
	});

	const branchOptions = $derived(
		((data.branches ?? []) as BranchCatalogItem[])
			.filter((branch) => branch.state)
			.map((branch) => ({ value: branch.code, label: branch.name }) as SelectOption)
	);

	const products = $derived(
		((data.products ?? []) as ProductCatalogItem[]).filter((product) => product.is_active)
	);

	const productOptions = $derived(
		products.map((product) => ({ value: product.code, label: product.name }) as SelectOption)
	);

	const customerSelectOptions = $derived([
		{ value: '', label: 'Registrar cliente manualmente' } as SelectOption,
		...customerSearchOptions.map((customer) => ({
			value: customer.code,
			label: customer.phone ? `${customer.full_name} · ${customer.phone}` : customer.full_name
		}))
	]);

	const itemRows = $derived(draftItems as unknown as TableRow[]);
	const itemCount = $derived(draftItems.length);
	const totalQuantity = $derived(draftItems.reduce((total, item) => total + item.quantity, 0));
	const saleTotal = $derived(
		draftItems.reduce((total, item) => total + item.quantity * item.unit_price, 0)
	);
	const estimatedCost = $derived(
		draftItems.reduce((total, item) => total + item.quantity * item.unit_cost, 0)
	);
	const estimatedProfit = $derived(saleTotal - estimatedCost);
	const selectedProductLabel = $derived.by(() => {
		const product = products.find((item) => item.code === draftProductCode);
		return product?.name ?? 'Selecciona un producto';
	});

	async function loadDraftProductStock(productCode = draftProductCode): Promise<void> {
		if (!createBranchCode || !productCode) {
			draftProductStock = null;
			return;
		}

		const requestId = ++stockRequestId;
		draftStockLoading = true;
		try {
			const params = new SvelteURLSearchParams({
				branch_code: createBranchCode,
				product_code: productCode
			});

			const response = await fetch(`/api/inventory/sales/stock?${params.toString()}`);
			const payload = await response.json();

			if (requestId !== stockRequestId) return;
			if (!response.ok) {
				throw new Error(
					(payload?.message as string) || 'No se pudo consultar el stock del producto'
				);
			}

			draftProductStock = payload.stock as SaleStockSnapshot;
		} catch (caught) {
			if (requestId === stockRequestId) {
				draftProductStock = null;
				showToast(
					caught instanceof Error ? caught.message : 'Error al consultar stock del producto',
					'error'
				);
			}
		} finally {
			if (requestId === stockRequestId) {
				draftStockLoading = false;
			}
		}
	}

	function branchQuery(branchCode: string): string {
		if (!branchCode) return '';
		const params = new URLSearchParams({ branch_code: branchCode });
		return `?${params.toString()}`;
	}

	function selectedDraftProduct(): ProductCatalogItem | null {
		if (!draftProductCode) return null;
		return products.find((product) => product.code === draftProductCode) ?? null;
	}

	function syncDraftPrice(productCode: string): void {
		const product = products.find((item) => item.code === productCode);
		if (product) {
			draftUnitPrice = Number(product.price ?? '0') || 0;
		}
	}

	function addDraftItem(): void {
		const product = selectedDraftProduct();
		const quantity = Number(draftQuantity);
		const unitPrice = Number(draftUnitPrice);

		if (!product) {
			showToast('Selecciona un producto para agregar a la venta.', 'error');
			return;
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			showToast('La cantidad del item debe ser un entero mayor a 0.', 'error');
			return;
		}

		if (!Number.isFinite(unitPrice) || unitPrice < 0) {
			showToast('El precio unitario del item debe ser válido y mayor o igual a 0.', 'error');
			return;
		}

		if (draftProductStock && draftProductStock.product_code === product.code) {
			const currentQuantity =
				draftItems.find((item) => item.product_code === product.code)?.quantity ?? 0;
			const remainingAvailable = draftProductStock.available - currentQuantity;
			if (remainingAvailable <= 0) {
				showToast('No hay stock disponible en la sede para este producto.', 'error');
				return;
			}
			if (quantity > remainingAvailable) {
				showToast(`Solo hay ${remainingAvailable} unidades disponibles de este producto.`, 'error');
				return;
			}
		}

		const unitCost = Number(product.cost_price ?? '0') || 0;
		const existing = draftItems.find((item) => item.product_code === product.code);
		if (existing) {
			draftItems = draftItems.map((item) =>
				item.product_code === product.code
					? {
							...item,
							quantity: item.quantity + quantity,
							unit_price: unitPrice,
							unit_cost: unitCost
						}
					: item
			);
		} else {
			draftItems = [
				...draftItems,
				{
					product_code: product.code,
					product_name: product.name,
					quantity,
					unit_price: unitPrice,
					unit_cost: unitCost
				}
			];
		}

		draftProductCode = '';
		draftQuantity = 1;
		draftUnitPrice = 0;
	}

	function removeDraftItem(productCode: string): void {
		draftItems = draftItems.filter((item) => item.product_code !== productCode);
	}

	function setDraftItemQuantity(productCode: string, quantity: number): void {
		const normalizedQuantity = Math.max(1, Math.floor(quantity));
		draftItems = draftItems.map((item) =>
			item.product_code === productCode
				? {
						...item,
						quantity: normalizedQuantity
					}
				: item
		);
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

	function selectedCustomerOption(): InventoryCustomerRecord | null {
		if (!createCustomerCode) return null;
		return customerSearchOptions.find((customer) => customer.code === createCustomerCode) ?? null;
	}

	async function goToSalesList(): Promise<void> {
		const destination = `/inventory/sales${branchQuery(createBranchCode)}` as '/inventory/sales';
		await goto(resolve(destination));
	}

	async function loadCustomers(search = ''): Promise<void> {
		try {
			const params = new SvelteURLSearchParams({
				page: '1',
				page_size: '80'
			});
			if (search.trim()) {
				params.set('search', search.trim());
			}

			const response = await fetch(`/api/inventory/customers?${params.toString()}`);
			if (!response.ok) return;
			const payload = await response.json();
			customerSearchOptions = (payload.customers ?? []) as InventoryCustomerRecord[];
		} catch {
			// non-critical
		}
	}

	async function submitCreateSale(): Promise<void> {
		if (submitting) return;

		if (!createBranchCode) {
			showToast('Selecciona la sede de la venta.', 'error');
			return;
		}

		if (draftItems.length === 0) {
			showToast('Agrega al menos un item antes de registrar la venta.', 'error');
			return;
		}

		if (createFulfillmentType === 'delivery' && !createDeliveryAddress.trim()) {
			showToast('La dirección es obligatoria para delivery.', 'error');
			return;
		}

		if (!createCustomerCode && !createCustomerName.trim()) {
			showToast('Debes seleccionar o registrar cliente.', 'error');
			return;
		}

		const selectedCustomer = selectedCustomerOption();
		const customerNameForPayload = (
			createCustomerCode ? selectedCustomer?.full_name || createCustomerName : createCustomerName
		).trim();
		const customerPhoneForPayload = (
			createCustomerCode ? selectedCustomer?.phone || createCustomerPhone : createCustomerPhone
		).trim();

		if (!customerNameForPayload) {
			showToast('El cliente seleccionado no tiene nombre válido.', 'error');
			return;
		}

		submitting = true;
		try {
			const response = await fetch('/api/inventory/sales', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					branch_code: createBranchCode,
					sale_channel: createSaleChannel,
					fulfillment_type: createFulfillmentType,
					shipping_state: createShippingState,
					delivery_address:
						createFulfillmentType === 'delivery' ? createDeliveryAddress.trim() : null,
					order_reference: createOrderReference.trim(),
					customer_code: createCustomerCode || null,
					customer_name: customerNameForPayload,
					customer_phone: customerPhoneForPayload || null,
					sold_at: createSoldAt,
					note: createNote.trim(),
					items: draftItems.map((item) => ({
						product_code: item.product_code,
						quantity: item.quantity,
						unit_price: item.unit_price
					}))
				})
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la venta');
			}

			showToast('Venta registrada', 'success');
			await goToSalesList();
		} catch (caught) {
			showToast(caught instanceof Error ? caught.message : 'Error al registrar venta', 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="lumi-stack lumi-stack--md">
	<PageHeader
		title="Nueva venta"
		subtitle="Configura la venta, el cliente y los ítems en un solo flujo"
		icon="creditCard"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" icon="chevronLeft" onclick={goToSalesList}>Volver</Button>
				<Button
					type="flat"
					color="success"
					icon="checkCircle"
					loading={submitting}
					onclick={() => void submitCreateSale()}
				>
					Registrar
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	<Card spaced>
		<div class="lumi-stack lumi-stack--md">
			<Fieldset legend="Venta">
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<Select
						label="Sede"
						value={createBranchCode}
						options={branchOptions}
						placeholder="Selecciona sede"
						onchange={async (value) => {
							createBranchCode = typeof value === 'string' ? value : '';
							draftProductStock = null;
							if (draftProductCode) await loadDraftProductStock(draftProductCode);
						}}
					/>
					<Input
						label="Fecha venta"
						type="date"
						value={createSoldAt}
						oninput={(event) => (createSoldAt = (event.currentTarget as HTMLInputElement).value)}
					/>
					<Input
						label="Referencia (opcional)"
						value={createOrderReference}
						oninput={(event) =>
							(createOrderReference = (event.currentTarget as HTMLInputElement).value)}
					/>
				</div>
				<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
					<div class="lumi-stack lumi-stack--xs">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Canal</p>
						<SegmentedControl
							value={createSaleChannel}
							options={CHANNEL_SEGMENT_OPTIONS}
							fullWidth
							onchange={(value) => {
								createSaleChannel = (value as InventorySaleChannel) ?? 'store';
							}}
						/>
					</div>
					<div class="lumi-stack lumi-stack--xs">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Entrega</p>
						<SegmentedControl
							value={createFulfillmentType}
							options={FULFILLMENT_SEGMENT_OPTIONS}
							fullWidth
							onchange={(value) => {
								handleFulfillmentChange((value as InventorySaleFulfillmentType) ?? 'pickup');
							}}
						/>
					</div>
				</div>
			</Fieldset>

			{#if createFulfillmentType === 'delivery'}
				<Fieldset legend="Delivery">
					<div class="lumi-stack lumi-stack--sm">
						<div class="lumi-stack lumi-stack--xs">
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Estado de envío</p>
							<SegmentedControl
								value={createShippingState}
								options={DELIVERY_SHIPPING_SEGMENT_OPTIONS}
								fullWidth
								onchange={(value) => {
									createShippingState = (
										typeof value === 'string' ? value : 'pending'
									) as InventorySaleShippingState;
								}}
							/>
						</div>
						<Input
							label="Dirección delivery"
							value={createDeliveryAddress}
							oninput={(event) =>
								(createDeliveryAddress = (event.currentTarget as HTMLInputElement).value)}
						/>
					</div>
				</Fieldset>
			{/if}

			<Fieldset legend="Cliente">
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					Selecciona uno registrado o ingrésalo manualmente.
				</p>
				<Select
					label="Cliente registrado (opcional)"
					value={createCustomerCode}
					options={customerSelectOptions}
					autocomplete
					clearable={false}
					noDataText="No hay clientes registrados"
					onsearch={(query) => void loadCustomers(query)}
					onchange={(value) => {
						createCustomerCode = typeof value === 'string' ? value : '';
						if (createCustomerCode) {
							const selected = selectedCustomerOption();
							createCustomerName = selected?.full_name ?? '';
							createCustomerPhone = selected?.phone ?? '';
						}
					}}
				/>
				{#if !createCustomerCode}
					<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
						<Input
							label="Cliente"
							value={createCustomerName}
							oninput={(event) =>
								(createCustomerName = (event.currentTarget as HTMLInputElement).value)}
						/>
						<Input
							label="Teléfono (opcional)"
							value={createCustomerPhone}
							oninput={(event) =>
								(createCustomerPhone = (event.currentTarget as HTMLInputElement).value)}
						/>
					</div>
				{/if}
			</Fieldset>

			<Fieldset legend="Items">
				<form
					class="lumi-stack lumi-stack--sm"
					onsubmit={(event) => {
						event.preventDefault();
						addDraftItem();
					}}
				>
					<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
						<Select
							label="Producto"
							value={draftProductCode}
							options={productOptions}
							placeholder="Selecciona producto"
							onchange={async (value) => {
								draftProductCode = typeof value === 'string' ? value : '';
								syncDraftPrice(draftProductCode);
								await loadDraftProductStock(draftProductCode);
							}}
						/>
						<NumberInput
							label="Cantidad"
							value={draftQuantity}
							min={1}
							max={100000}
							step={1}
							onchange={(value) => {
								draftQuantity = value;
							}}
						/>
						<NumberInput
							label="Precio unitario"
							value={draftUnitPrice}
							min={0}
							max={1000000}
							step={0.5}
							onchange={(value) => {
								draftUnitPrice = value;
							}}
						/>
					</div>
					<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
						<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
							Presiona Enter para agregar rapidamente.
						</p>
						<Button type="flat" color="primary" icon="plus" button="submit">Agregar item</Button>
					</div>
				</form>
				{#if draftProductCode}
					<div class="sale-create__stock-preview">
						{#if !createBranchCode}
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">
								Selecciona una sede para ver el stock disponible.
							</p>
						{:else if draftStockLoading}
							<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
								Consultando stock de {selectedProductLabel}...
							</p>
						{:else if draftProductStock}
							<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Stock disponible</p>
							<p class="lumi-margin--none lumi-font--semibold">{selectedProductLabel}</p>
							<p class="lumi-margin--none lumi-text--sm">{draftProductStock.available} unidades</p>
						{/if}
					</div>
				{/if}
				<p class="lumi-margin--none lumi-text--sm lumi-text--muted">
					{itemCount}
					{itemCount === 1 ? 'item' : 'items'} · {totalQuantity} unidades ·
					{formatProductPrice(saleTotal)} venta · {formatProductPrice(estimatedProfit)} utilidad
				</p>
				{#if draftItems.length !== 0}
					<Table data={itemRows} pagination={false}>
						{#snippet thead()}
							<th>Producto</th>
							<th>Cantidad</th>
							<th>Precio unitario</th>
							<th>Subtotal</th>
							<th>Margen estimado</th>
							<th>Acciones</th>
						{/snippet}
						{#snippet row({ row })}
							{@const item = row as unknown as SaleDraftItem}
							<td>{item.product_name}</td>
							<td>
								<NumberInput
									size="sm"
									value={item.quantity}
									min={1}
									max={100000}
									step={1}
									onchange={(value) => setDraftItemQuantity(item.product_code, value)}
								/>
							</td>
							<td>{formatProductPrice(item.unit_price)}</td>
							<td>{formatProductPrice(item.quantity * item.unit_price)}</td>
							<td>
								{formatProductPrice(item.quantity * (item.unit_price - item.unit_cost))}
							</td>
							<td>
								<Button
									type="flat"
									size="sm"
									icon="trash"
									color="danger"
									onclick={() => removeDraftItem(item.product_code)}
								>
									Quitar
								</Button>
							</td>
						{/snippet}
					</Table>
				{/if}
			</Fieldset>

			<Fieldset legend="Nota">
				<Textarea
					placeholder="Contexto operativo opcional para el equipo..."
					rows={3}
					value={createNote}
					oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
				/>
			</Fieldset>
		</div>
	</Card>
</div>

<style>
	.sale-create__stock-preview {
		padding: var(--lumi-space-md);
		border-radius: var(--lumi-radius-lg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 92%, transparent);
	}
</style>
