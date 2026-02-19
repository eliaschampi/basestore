<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
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
		Tabs,
		Textarea
	} from '$lib/components';
	import type { SegmentedControlOption, SelectOption, Tab } from '$lib/components';
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
	}

	function todayLocalDate(): string {
		const now = new Date();
		const offsetMilliseconds = now.getTimezoneOffset() * 60_000;
		return new Date(now.getTime() - offsetMilliseconds).toISOString().slice(0, 10);
	}

	const { data }: { data: PageData } = $props();

	const PURCHASE_FORM_TABS: Tab[] = [
		{ value: 'product', label: 'Producto', icon: 'package' },
		{ value: 'order', label: 'Pedido', icon: 'clock' },
		{ value: 'review', label: 'Revision', icon: 'checkCircle' }
	];

	const PURCHASE_ORIGIN_SEGMENT_OPTIONS: SegmentedControlOption[] = [
		{ label: 'AliExpress', value: 'aliexpress' },
		{ label: 'Temu', value: 'temu' },
		{ label: 'Lima', value: 'lima' }
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

	let createProductCode = $state('');
	let createBranchCode = $state('');
	let createOrigin = $state<InventoryPurchaseOrigin>('aliexpress');
	let createEntryType = $state<InventoryPurchaseEntryType>('restock');
	let createTrackingNumber = $state('');
	let createQuantity = $state(1);
	let createState = $state<'in_transit' | 'received'>('in_transit');
	let createOrderedAt = $state(todayLocalDate());
	let createUnitCost = $state(0);
	let createNote = $state('');

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

	const productOptions = $derived(
		((data.products ?? []) as ProductCatalogItem[])
			.filter((product) => product.is_active)
			.map((product) => ({ value: product.code, label: product.name }) as SelectOption)
	);

	const totalCost = $derived(Math.max(0, createQuantity) * Math.max(0, createUnitCost));

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

	function goToPurchasesList(): void {
		window.location.assign(`${resolve('/inventory/purchases')}${branchQuery(createBranchCode)}`);
	}

	async function submitCreatePurchase(): Promise<void> {
		if (submitting) return;

		const quantity = Number(createQuantity);
		if (!createProductCode || !createBranchCode || !Number.isInteger(quantity) || quantity <= 0) {
			errorMessage = 'Completa producto, sede y cantidad valida.';
			activeTab = 'product';
			return;
		}

		if (createOrigin !== 'lima' && createTrackingNumber.trim().length < 5) {
			errorMessage = 'El NRO tracking es obligatorio para Temu y AliExpress.';
			activeTab = 'order';
			return;
		}

		submitting = true;
		errorMessage = '';
		try {
			const unitCost = Number.isFinite(createUnitCost) && createUnitCost > 0 ? createUnitCost : null;
			const response = await fetch('/api/inventory/purchases', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					product_code: createProductCode,
					branch_code: createBranchCode,
					origin: createOrigin,
					entry_type: createEntryType,
					tracking_number: createTrackingNumber.trim(),
					quantity,
					state: createState,
					ordered_at: createOrderedAt,
					unit_cost: unitCost,
					note: createNote.trim()
				})
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error((payload?.message as string) || 'No se pudo registrar la compra');
				}

				showToast('Compra registrada', 'success');
				goToPurchasesList();
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
			subtitle="Formulario por etapas para registrar entradas sin sobrecarga visual"
			icon="shoppingBag"
		>
			{#snippet actions()}
				<div class="lumi-flex lumi-flex--gap-sm">
					<Button
						type="border"
						icon="chevronLeft"
						onclick={goToPurchasesList}
					>
						Volver
					</Button>
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
					<Fieldset legend="Producto y destino">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
							<Select
								label="Producto"
								value={createProductCode}
								options={productOptions}
								placeholder="Selecciona producto"
								onchange={(value) => {
									createProductCode = typeof value === 'string' ? value : '';
								}}
							/>
							<Select
								label="Sede destino"
								value={createBranchCode}
								options={branchOptions}
								placeholder="Selecciona sede"
								onchange={(value) => {
									createBranchCode = typeof value === 'string' ? value : '';
								}}
							/>
						</div>
					</Fieldset>

					<Fieldset legend="Clasificacion">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<div class="lumi-stack lumi-space--xs">
								<p class="lumi-margin--none lumi-text--xs lumi-text--muted">Origen</p>
								<SegmentedControl
									value={createOrigin}
									options={PURCHASE_ORIGIN_SEGMENT_OPTIONS}
									fullWidth
									onchange={(value) => {
										createOrigin = (
											typeof value === 'string' ? value : 'aliexpress'
										) as InventoryPurchaseOrigin;
										if (createOrigin === 'lima') {
											createTrackingNumber = '';
										}
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
					</Fieldset>
				</div>
			{/if}

			{#if activeTab === 'order'}
				<Fieldset legend="Pedido y costos">
					<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-md">
						<Input
							label="NRO Tracking"
							placeholder={createOrigin === 'lima' ? 'No requerido para Lima' : 'Ej: LP009123456789'}
							value={createTrackingNumber}
							disabled={createOrigin === 'lima'}
							oninput={(event) => (createTrackingNumber = (event.currentTarget as HTMLInputElement).value)}
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
						<Input
							label="Fecha pedido"
							type="date"
							value={createOrderedAt}
							oninput={(event) => (createOrderedAt = (event.currentTarget as HTMLInputElement).value)}
						/>
						<NumberInput
							label="Costo unitario (opcional)"
							value={createUnitCost}
							min={0}
							max={1000000}
							step={0.5}
							onchange={(value) => {
								createUnitCost = value;
							}}
						/>
					</div>
					{#if createUnitCost > 0}
						<p class="lumi-margin--none lumi-font--semibold">
							Costo total estimado: {formatProductPrice(totalCost)}
						</p>
					{/if}
				</Fieldset>
			{/if}

			{#if activeTab === 'review'}
				<div class="lumi-stack lumi-space--md">
					<Fieldset legend="Resumen">
						<div class="lumi-grid lumi-grid--responsive lumi-grid--gap-sm">
							<p class="lumi-margin--none"><strong>Producto:</strong> {createProductCode ? 'Seleccionado' : 'Pendiente'}</p>
							<p class="lumi-margin--none"><strong>Sede:</strong> {createBranchCode ? 'Seleccionada' : 'Pendiente'}</p>
							<p class="lumi-margin--none"><strong>Cantidad:</strong> {createQuantity}</p>
							<p class="lumi-margin--none"><strong>Total estimado:</strong> {formatProductPrice(totalCost)}</p>
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
				<Button type="border" disabled={activeTab === 'product'} onclick={goPrevTab}>Anterior</Button>
				{#if activeTab !== 'review'}
					<Button type="filled" color="info" onclick={goNextTab}>Siguiente</Button>
				{/if}
			</div>
		</Tabs>
	</Card>
</div>
