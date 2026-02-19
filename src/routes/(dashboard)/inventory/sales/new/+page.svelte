<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Fieldset,
		Input,
		NumberInput,
		PageHeader,
		SegmentedControl,
		Select,
		Switch,
		Tabs,
		Textarea
	} from '$lib/components';
	import type { SegmentedControlOption, SelectOption, Tab } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryCustomerRecord } from '$lib/types/inventory';
	import type {
		InventorySaleChannel,
		InventorySaleFulfillmentType,
		InventorySaleShippingState
	} from '$lib/utils/inventory';
	import type { PageData } from './$types';

	type SaleFormTab = 'sale' | 'fulfillment' | 'customer' | 'review';

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

	const SALE_FORM_TABS: Tab[] = [
		{ value: 'sale', label: 'Venta', icon: 'creditCard' },
		{ value: 'fulfillment', label: 'Entrega', icon: 'package' },
		{ value: 'customer', label: 'Cliente', icon: 'user' },
		{ value: 'review', label: 'Revision', icon: 'checkCircle' }
	];

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

	let activeTab = $state<SaleFormTab>('sale');
	let submitting = $state(false);
	let errorMessage = $state('');

	let customerSearchOptions = $state<InventoryCustomerRecord[]>([]);

	let createProductCode = $state('');
	let createBranchCode = $state('');
	let createQuantity = $state(1);
	let createUnitPrice = $state(0);
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

	onMount(() => {
		if (!createBranchCode) {
			createBranchCode = (data.selectedBranchCode as string | null) || '';
		}

		if (customerSearchOptions.length === 0) {
			customerSearchOptions = (data.favoriteCustomers ?? []) as InventoryCustomerRecord[];
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
			label: `${customer.full_name} ★`
		}))
	]);

	const saleTotal = $derived(Math.max(0, createQuantity) * Math.max(0, createUnitPrice));

	function changeTab(next: string | number): void {
		if (next === 'sale' || next === 'fulfillment' || next === 'customer' || next === 'review') {
			activeTab = next;
		}
	}

	function goNextTab(): void {
		if (activeTab === 'sale') {
			activeTab = 'fulfillment';
			return;
		}
		if (activeTab === 'fulfillment') {
			activeTab = 'customer';
			return;
		}
		if (activeTab === 'customer') {
			activeTab = 'review';
		}
	}

	function goPrevTab(): void {
		if (activeTab === 'review') {
			activeTab = 'customer';
			return;
		}
		if (activeTab === 'customer') {
			activeTab = 'fulfillment';
			return;
		}
		if (activeTab === 'fulfillment') {
			activeTab = 'sale';
		}
	}

	function deriveProductPrice(productCode: string): void {
		const product = products.find((item) => item.code === productCode);
		if (product) {
			createUnitPrice = Number(product.price);
		}
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

	async function loadFavoriteCustomers(search = ''): Promise<void> {
		try {
			const params = new SvelteURLSearchParams({
				favorites_only: 'true',
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

		const quantity = Number(createQuantity);
		const unitPrice = Number(createUnitPrice);

		if (!createProductCode || !createBranchCode || !Number.isInteger(quantity) || quantity <= 0) {
			errorMessage = 'Completa producto, sede y cantidad valida.';
			activeTab = 'sale';
			return;
		}

		if (!Number.isFinite(unitPrice) || unitPrice < 0) {
			errorMessage = 'El precio unitario es obligatorio.';
			activeTab = 'sale';
			return;
		}

		if (createFulfillmentType === 'delivery' && !createDeliveryAddress.trim()) {
			errorMessage = 'La direccion es obligatoria para delivery.';
			activeTab = 'fulfillment';
			return;
		}

		if (!createCustomerCode && !createCustomerName.trim()) {
			errorMessage = 'Debes seleccionar o registrar cliente.';
			activeTab = 'customer';
			return;
		}

		submitting = true;
		errorMessage = '';
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

			showToast('Venta registrada', 'success');
			await goto(resolve('/inventory/sales'));
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al registrar venta';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Nueva venta"
		subtitle="Formulario por etapas para operar rapido sin saturar al usuario"
		icon="creditCard"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" icon="chevronLeft" onclick={() => goto(resolve('/inventory/sales'))}>
					Volver
				</Button>
				<Button
					type="filled"
					color="primary"
					icon="checkCircle"
					loading={submitting}
					onclick={() => void submitCreateSale()}
				>
					Registrar venta
				</Button>
			</div>
		{/snippet}
	</PageHeader>

	{#if errorMessage}
		<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
	{/if}

	<Card spaced>
		<Tabs
			value={activeTab}
			tabs={SALE_FORM_TABS}
			color="primary"
			aria-label="Formulario de venta"
			onchange={(value) => changeTab(value)}
		>
			{#if activeTab === 'sale'}
				<Fieldset legend="Producto y transaccion">
					<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
						<Select
							label="Producto"
							value={createProductCode}
							options={productOptions}
							placeholder="Selecciona producto"
							onchange={(value) => {
								createProductCode = typeof value === 'string' ? value : '';
								deriveProductPrice(createProductCode);
							}}
						/>
						<Select
							label="Sede"
							value={createBranchCode}
							options={branchOptions}
							placeholder="Selecciona sede"
							onchange={(value) => {
								createBranchCode = typeof value === 'string' ? value : '';
							}}
						/>
						<NumberInput
							label="Cantidad"
							value={createQuantity}
							min={1}
							max={100000}
							step={1}
							onchange={(value) => {
								createQuantity = value;
							}}
						/>
						<NumberInput
							label="Precio unitario"
							value={createUnitPrice}
							min={0}
							max={1000000}
							step={0.5}
							onchange={(value) => {
								createUnitPrice = value;
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
					<p class="lumi-margin--none lumi-font--semibold">
						Total estimado: {formatProductPrice(saleTotal)}
					</p>
				</Fieldset>
			{/if}

			{#if activeTab === 'fulfillment'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Canal y entrega">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<div class="lumi-stack lumi-space--xs">
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
							<div class="lumi-stack lumi-space--xs">
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
						<Fieldset legend="Envio">
							<div class="lumi-stack lumi-space--sm">
								<div class="lumi-stack lumi-space--xs">
									<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Estado de envio</p>
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
									label="Direccion delivery"
									value={createDeliveryAddress}
									oninput={(event) =>
										(createDeliveryAddress = (event.currentTarget as HTMLInputElement).value)}
								/>
							</div>
						</Fieldset>
					{/if}
				</div>
			{/if}

			{#if activeTab === 'customer'}
				<Fieldset legend="Cliente">
					<div class="lumi-stack lumi-space--sm">
						<Select
							label="Cliente favorito (opcional)"
							value={createCustomerCode}
							options={customerSelectOptions}
							autocomplete
							clearable={false}
							noDataText="No hay clientes favoritos"
							onsearch={(query) => void loadFavoriteCustomers(query)}
							onchange={(value) => {
								createCustomerCode = typeof value === 'string' ? value : '';
								if (createCustomerCode) {
									createMarkCustomerFavorite = false;
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
									label="Telefono (opcional)"
									value={createCustomerPhone}
									oninput={(event) =>
										(createCustomerPhone = (event.currentTarget as HTMLInputElement).value)}
								/>
							</div>
							<Switch
								label="Guardar cliente como favorito"
								checked={createMarkCustomerFavorite}
								onchange={(checked) => {
									createMarkCustomerFavorite = checked;
								}}
							/>
						{/if}
					</div>
				</Fieldset>
			{/if}

			{#if activeTab === 'review'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Resumen">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<p class="lumi-margin--none"><strong>Producto:</strong> {createProductCode ? 'Seleccionado' : 'Pendiente'}</p>
							<p class="lumi-margin--none"><strong>Sede:</strong> {createBranchCode ? 'Seleccionada' : 'Pendiente'}</p>
							<p class="lumi-margin--none"><strong>Cantidad:</strong> {createQuantity}</p>
							<p class="lumi-margin--none"><strong>Total:</strong> {formatProductPrice(saleTotal)}</p>
							<p class="lumi-margin--none"><strong>Entrega:</strong> {createFulfillmentType === 'pickup' ? 'Recojo' : 'Delivery'}</p>
						</div>
					</Fieldset>
					<Fieldset legend="Nota">
						<Textarea
							label="Nota (opcional)"
							rows={3}
							value={createNote}
							oninput={(event) => (createNote = (event.currentTarget as HTMLTextAreaElement).value)}
						/>
					</Fieldset>
				</div>
			{/if}

			<div class="lumi-flex lumi-justify--between lumi-align-items--center">
				<Button type="border" disabled={activeTab === 'sale'} onclick={goPrevTab}>Anterior</Button>
				{#if activeTab !== 'review'}
					<Button type="filled" color="info" onclick={goNextTab}>Siguiente</Button>
				{/if}
			</div>
		</Tabs>
	</Card>
</div>
