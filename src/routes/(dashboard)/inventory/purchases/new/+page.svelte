<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Fieldset,
		Input,
		NumberInput,
		PageHeader,
		SegmentedControl,
		Select,
		Table,
		Tabs,
		Textarea
	} from '$lib/components';
	import type { SegmentedControlOption, SelectOption, Tab, TableRow } from '$lib/components';
	import { showToast } from '$lib/stores/Toast';
	import { formatProductPrice } from '$lib/utils/products';
	import type { InventoryPurchaseEntryType, InventoryPurchaseOrigin } from '$lib/utils/inventory';
	import type { PageData } from './$types';

	type PurchaseFormTab = 'product' | 'order' | 'review';

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

	interface PurchaseOriginOption {
		value: string;
		label: string;
		apiOrigin: InventoryPurchaseOrigin;
		customLabel?: string;
	}

	interface PurchaseDraftItem {
		product_code: string;
		product_name: string;
		quantity: number;
		unit_cost: number;
	}

	function todayLocalDate(): string {
		const now = new Date();
		const offsetMilliseconds = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
	}

	const { data }: { data: PageData } = $props();

	const PURCHASE_FORM_TABS: Tab[] = [
		{ value: 'product', label: 'Items', icon: 'package' },
		{ value: 'order', label: 'Pedido', icon: 'clock' },
		{ value: 'review', label: 'Revision', icon: 'checkCircle' }
	];

	const PURCHASE_ORIGIN_OPTIONS: PurchaseOriginOption[] = [
		{ value: 'aliexpress', label: 'AliExpress', apiOrigin: 'aliexpress' },
		{ value: 'temu', label: 'Temu', apiOrigin: 'temu' },
		{ value: 'lima', label: 'Lima', apiOrigin: 'lima' },
		{ value: 'amazon', label: 'Amazon', apiOrigin: 'other', customLabel: 'Amazon' },
		{ value: 'ebay', label: 'eBay', apiOrigin: 'other', customLabel: 'eBay' },
		{ value: 'local_supplier', label: 'Proveedor local', apiOrigin: 'other', customLabel: 'Proveedor local' },
		{ value: 'other', label: 'Otros', apiOrigin: 'other' }
	];

	const ENTRY_TYPE_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'Inicial', value: 'initial' },
		{ label: 'Reposicion', value: 'restock' }
	];

	const PURCHASE_STATE_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'En camino', value: 'in_transit', icon: 'clock' },
		{ label: 'Recibido', value: 'received', icon: 'checkCircle' }
	];

	let activeTab = $state<PurchaseFormTab>('product');
	let submitting = $state(false);
	let errorMessage = $state('');

	let createBranchCode = $state('');
	let createOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let createOriginOption = $state('aliexpress');
	let createOriginCustom = $state('');
	let createEntryType = $state<InventoryPurchaseEntryType>('restock');
	let createTrackingNumber = $state('');
	let createState = $state<'in_transit' | 'received'>('in_transit');
	let createOrderedAt = $state(todayLocalDate());
	let createNote = $state('');

	let draftProductCode = $state('');
	let draftQuantity = $state(1);
	let draftUnitCost = $state(0);
	let draftItems = $state<PurchaseDraftItem[]>([]);

	onMount(() => {
		if (!createBranchCode) {
			createBranchCode = (data.selectedBranchCode as string | null) || '';
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
	const originOptions = $derived(
		PURCHASE_ORIGIN_OPTIONS.map(
			(option) => ({ value: option.value, label: option.label }) as SelectOption
		)
	);

	const itemRows = $derived(draftItems as unknown as TableRow[]);
	const itemCount = $derived(draftItems.length);
	const totalQuantity = $derived(draftItems.reduce((total, item) => total + item.quantity, 0));
	const totalCost = $derived(
		draftItems.reduce((total, item) => total + item.quantity * item.unit_cost, 0)
	);

	function changeTab(next: string | number): void {
		if (next === 'product' || next === 'order' || next === 'review') {
			activeTab = next;
		}
	}

	function goNextTab(): void {
		if (activeTab === 'product') {
			activeTab = 'order';
			return;
		}
		if (activeTab === 'order') {
			activeTab = 'review';
		}
	}

	function goPrevTab(): void {
		if (activeTab === 'review') {
			activeTab = 'order';
			return;
		}
		if (activeTab === 'order') {
			activeTab = 'product';
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

	function syncDraftUnitCostFromProduct(productCode: string): void {
		const product = products.find((item) => item.code === productCode);
		if (product) {
			draftUnitCost = Number(product.cost_price ?? '0') || 0;
		}
	}

	function addDraftItem(): void {
		const product = selectedDraftProduct();
		const quantity = Number(draftQuantity);
		const unitCost = Number(draftUnitCost);

		if (!product) {
			errorMessage = 'Selecciona un producto para agregar a la compra.';
			return;
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			errorMessage = 'La cantidad del item debe ser un entero mayor a 0.';
			return;
		}

		if (!Number.isFinite(unitCost) || unitCost < 0) {
			errorMessage = 'El costo unitario debe ser válido y mayor o igual a 0.';
			return;
		}

		errorMessage = '';

		const existing = draftItems.find((item) => item.product_code === product.code);
		if (existing) {
			draftItems = draftItems.map((item) =>
				item.product_code === product.code
					? {
							...item,
							quantity: item.quantity + quantity,
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
					unit_cost: unitCost
				}
			];
		}

		draftProductCode = '';
		draftQuantity = 1;
		draftUnitCost = 0;
	}

	function removeDraftItem(productCode: string): void {
		draftItems = draftItems.filter((item) => item.product_code !== productCode);
	}

	function applyOriginOption(value: string): void {
		const option = PURCHASE_ORIGIN_OPTIONS.find((item) => item.value === value);
		if (!option) return;

		createOriginOption = option.value;
		createOrigin = option.apiOrigin;
		if (option.apiOrigin === 'other') {
			createOriginCustom = option.customLabel ?? createOriginCustom;
		} else {
			createOriginCustom = '';
		}

		if (createOrigin === 'lima') {
			createTrackingNumber = '';
		}
	}

	async function goToPurchasesList(): Promise<void> {
		const destination =
			`/inventory/purchases${branchQuery(createBranchCode)}` as '/inventory/purchases';
		await goto(resolve(destination));
	}

	async function submitCreatePurchase(): Promise<void> {
		if (submitting) return;

		if (!createBranchCode) {
			errorMessage = 'Selecciona la sede destino.';
			activeTab = 'order';
			return;
		}

		if (draftItems.length === 0) {
			errorMessage = 'Agrega al menos un item antes de registrar la compra.';
			activeTab = 'product';
			return;
		}

		if (createOrigin !== 'lima' && createTrackingNumber.trim().length < 5) {
			errorMessage = 'El NRO tracking es obligatorio para compras con envío.';
			activeTab = 'order';
			return;
		}

		if (createOrigin === 'other' && createOriginCustom.trim().length < 2) {
			errorMessage = 'Cuando eliges "Otros", indica el origen personalizado.';
			activeTab = 'order';
			return;
		}

		submitting = true;
		errorMessage = '';
		try {
			const response = await fetch('/api/inventory/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					branch_code: createBranchCode,
					origin: createOrigin,
					entry_type: createEntryType,
					tracking_number: createTrackingNumber.trim(),
					state: createState,
					ordered_at: createOrderedAt,
					origin_custom: createOrigin === 'other' ? createOriginCustom.trim() : null,
					note: createNote.trim(),
					items: draftItems.map((item) => ({
						product_code: item.product_code,
						quantity: item.quantity,
						unit_cost: item.unit_cost
					}))
				})
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la compra');
			}

			showToast('Compra registrada', 'success');
			await goToPurchasesList();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al registrar compra';
		} finally {
			submitting = false;
		}
	}
</script>

<div class="lumi-stack lumi-space--md">
	<PageHeader
		title="Nueva compra"
		subtitle="Registra compras con múltiples items y control de costos"
		icon="shoppingBag"
	>
		{#snippet actions()}
			<div class="lumi-flex lumi-flex--gap-sm">
				<Button type="border" icon="chevronLeft" onclick={goToPurchasesList}>Volver</Button>
				<Button
					type="filled"
					color="primary"
					icon="checkCircle"
					loading={submitting}
					onclick={() => void submitCreatePurchase()}
				>
					Registrar compra
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
			tabs={PURCHASE_FORM_TABS}
			color="info"
			aria-label="Formulario de compra"
			onchange={(value) => changeTab(value)}
		>
			{#if activeTab === 'product'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Agregar item">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
							<Select
								label="Producto"
								value={draftProductCode}
								options={productOptions}
								placeholder="Selecciona producto"
								onchange={(value) => {
									draftProductCode = typeof value === 'string' ? value : '';
									syncDraftUnitCostFromProduct(draftProductCode);
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
								label="Costo unitario"
								value={draftUnitCost}
								min={0}
								max={1000000}
								step={0.5}
								onchange={(value) => {
									draftUnitCost = value;
								}}
							/>
						</div>
						<div class="lumi-flex lumi-justify--end">
							<Button type="flat" color="primary" icon="plus" onclick={addDraftItem}>
								Agregar item
							</Button>
						</div>
					</Fieldset>

					<Fieldset legend="Items de la compra">
						{#if draftItems.length === 0}
							<Alert type="info" closable={false}>Aún no agregaste items.</Alert>
						{:else}
							<Table data={itemRows} pagination={false}>
								{#snippet thead()}
									<th>Producto</th>
									<th>Cantidad</th>
									<th>Costo unitario</th>
									<th>Subtotal</th>
									<th>Acción</th>
								{/snippet}
								{#snippet row({ row })}
									{@const item = row as unknown as PurchaseDraftItem}
									<td>{item.product_name}</td>
									<td>{item.quantity}</td>
									<td>{formatProductPrice(item.unit_cost)}</td>
									<td>{formatProductPrice(item.quantity * item.unit_cost)}</td>
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
				</div>
			{/if}

			{#if activeTab === 'order'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Destino y clasificación">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
							<Select
								label="Sede destino"
								value={createBranchCode}
								options={branchOptions}
								placeholder="Selecciona sede"
								onchange={(value) => {
									createBranchCode = typeof value === 'string' ? value : '';
								}}
							/>
							<Input
								label="Fecha pedido"
								type="date"
								value={createOrderedAt}
								oninput={(event) =>
									(createOrderedAt = (event.currentTarget as HTMLInputElement).value)}
							/>
						</div>
					</Fieldset>

					<Fieldset legend="Flujo de compra">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<div class="lumi-stack lumi-space--xs">
								<Select
									label="Origen"
									value={createOriginOption}
									options={originOptions}
									clearable={false}
									onchange={(value) => {
										applyOriginOption(typeof value === 'string' ? value : 'aliexpress');
									}}
								/>
							</div>
							<div class="lumi-stack lumi-space--xs">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Tipo</p>
								<SegmentedControl
									value={createEntryType}
									options={ENTRY_TYPE_SEGMENT_OPTIONS}
									fullWidth
									onchange={(value) => {
										createEntryType = (
											typeof value === 'string' ? value : 'restock'
										) as InventoryPurchaseEntryType;
									}}
								/>
							</div>
							<div class="lumi-stack lumi-space--xs">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Estado inicial</p>
								<SegmentedControl
									value={createState}
									options={PURCHASE_STATE_SEGMENT_OPTIONS}
									fullWidth
									onchange={(value) => {
										createState = (
											typeof value === 'string' ? value : 'in_transit'
										) as typeof createState;
									}}
								/>
							</div>
						</div>
						{#if createOrigin === 'other'}
							<Input
								label="Origen personalizado"
								placeholder="Ej: proveedor de Instagram, feria local..."
								value={createOriginCustom}
								oninput={(event) =>
									(createOriginCustom = (event.currentTarget as HTMLInputElement).value)}
							/>
						{/if}
						<Input
							label="NRO Tracking"
							placeholder={createOrigin === 'lima'
								? 'No requerido para Lima'
								: 'Ej: LP009123456789'}
							value={createTrackingNumber}
							disabled={createOrigin === 'lima'}
							oninput={(event) =>
								(createTrackingNumber = (event.currentTarget as HTMLInputElement).value)}
						/>
					</Fieldset>
				</div>
			{/if}

			{#if activeTab === 'review'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Resumen">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<p class="lumi-margin--none">
								<strong>Items:</strong>
								<Chip size="sm" color="info">{itemCount}</Chip>
							</p>
							<p class="lumi-margin--none"><strong>Unidades:</strong> {totalQuantity}</p>
							<p class="lumi-margin--none">
								<strong>Total estimado:</strong>
								{formatProductPrice(totalCost)}
							</p>
							<p class="lumi-margin--none">
								<strong>Sede:</strong>
								{createBranchCode ? 'Seleccionada' : 'Pendiente'}
							</p>
							<p class="lumi-margin--none">
								<strong>Origen:</strong>
								{createOrigin === 'other' ? createOriginCustom || 'Otros' : createOrigin}
							</p>
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
				<Button type="border" disabled={activeTab === 'product'} onclick={goPrevTab}
					>Anterior</Button
				>
				{#if activeTab !== 'review'}
					<Button type="filled" color="info" onclick={goNextTab}>Siguiente</Button>
				{/if}
			</div>
		</Tabs>
	</Card>
</div>
