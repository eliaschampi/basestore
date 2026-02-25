<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import {
		Alert,
		Button,
		Card,
		Chip,
		Context,
		ContextItem,
		Dialog,
		Divider,
		DriveFileGrid,
		DriveFilePreview,
		EmptyState,
		Icon,
		InfoItem,
		Input,
		PageHeader,
		SegmentedControl,
		StatCard,
		Table,
		Tabs,
		Tooltip
	} from '$lib/components';
	import type { DriveFileItem, Tab, TableRow } from '$lib/components';
	import type {
		ProductDriveLink,
		ProductInventorySnapshot,
		ProductMovementSnapshot
	} from '$lib/types/products';
	import { showToast } from '$lib/stores/Toast';
	import { can } from '$lib/stores/permissions';
	import {
		formatFileSize,
		getDriveServeUrl,
		getFileColor,
		getFileIcon,
		getDriveTypeLabel,
		normalizeDriveFileSize
	} from '$lib/utils/drive';
	import { formatDate } from '$lib/utils/formatDate';
	import { formatProductDateTime, formatProductPrice } from '$lib/utils/products';
	import type { PageData } from './$types';
	import Fieldset from '$lib/components/Fieldset/Fieldset.svelte';

	interface DriveLinksResponse {
		links: ProductDriveLink[];
	}

	interface DriveSearchResponse {
		files: DriveFileItem[];
	}

	const DETAIL_TABS: Tab[] = [
		{ value: 'overview', label: 'Resumen', icon: 'package' },
		{ value: 'stock', label: 'Stock', icon: 'boxes' },
		{ value: 'media', label: 'Archivos', icon: 'hardDrive' }
	];

	const { data }: { data: PageData } = $props();

	const canDriveRead = $derived(can('drive:read'));
	const canDriveUpdate = $derived(can('drive:update'));
	const hasDriveReadPermission = $derived(data.canReadDrive && canDriveRead);
	const hasInventoryReadPermission = $derived(data.canReadInventory);

	let activeTab = $state<'overview' | 'stock' | 'media'>('overview');

	let linkedFiles = $derived<ProductDriveLink[]>(data.linkedFiles);
	let linkedLoading = $state(false);

	const inventoryByBranch = $derived(
		(data.inventoryByBranch ?? []) as ProductInventorySnapshot[]
	);
	const inventoryMovements = $derived(
		(data.inventoryMovements ?? []) as ProductMovementSnapshot[]
	);
	const stockRows = $derived(inventoryByBranch as unknown as TableRow[]);
	const movementRows = $derived(inventoryMovements as unknown as TableRow[]);
	const totalAvailable = $derived(
		inventoryByBranch.reduce((total, item) => total + Number(item.available || 0), 0)
	);
	const totalInbound = $derived(
		inventoryByBranch.reduce((total, item) => total + Number(item.inbound || 0), 0)
	);

	let viewMode = $state<'grid' | 'list'>('grid');
	const viewModeOptions = $derived([
		{ label: 'Grid', value: 'grid', icon: 'grid' },
		{ label: 'Lista', value: 'list', icon: 'list' }
	]);

	let showAttachDialog = $state(false);
	let searchQuery = $state('');
	let searchLoading = $state(false);
	let searchError = $state('');
	let hasSearched = $state(false);
	let searchResults = $state<DriveFileItem[]>([]);
	let searchSelectedRows = $state<TableRow[]>([]);
	let attachingFiles = $state(false);

	let showPreview = $state(false);
	let previewFile = $state<DriveFileItem | null>(null);
	let selectedGridFileCode = $state<string | null>(null);
	let contextLinkedFile = $state<ProductDriveLink | null>(null);
	let fileContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
				close: () => void;
		  }
		| undefined = $state();

	const productCode = $derived(data.product.code);
	const linkedCount = $derived(linkedFiles.length);

	const primaryImage = $derived.by(() => {
		const images = linkedFiles.filter((file) => file.file_type === 'img');
		if (images.length === 0) {
			return null;
		}
		return images.find((file) => file.is_primary) ?? images[0];
	});

	const linkedImageName = $derived(primaryImage?.file_name ?? 'Imagen sin nombre');
	const linkedDriveItems = $derived.by(() => linkedFiles.map((file) => toPreviewFile(file)));
	const selectedGridCodes = $derived(selectedGridFileCode ? [selectedGridFileCode] : []);

	const selectedSearchResults = $derived.by(() => {
		return searchSelectedRows.reduce<DriveFileItem[]>((selected, row) => {
			const candidate = row as Partial<DriveFileItem>;
			if (
				typeof candidate.code === 'string' &&
				typeof candidate.name === 'string' &&
				typeof candidate.type === 'string'
			) {
				selected.push(candidate as DriveFileItem);
			}
			return selected;
		}, []);
	});

	$effect(() => {
		if (
			selectedGridFileCode &&
			!linkedFiles.some((file) => file.file_code === selectedGridFileCode)
		) {
			selectedGridFileCode = null;
		}
	});

	function toPreviewFile(file: ProductDriveLink): DriveFileItem {
		return {
			code: file.file_code,
			scope: 'product_shared',
			name: file.file_name,
			type: file.file_type,
			size: normalizeDriveFileSize(file.file_size),
			tag: null,
			mime_type: file.mime_type,
			parent_code: null,
			user_code: '',
			deleted_at: null,
			created_at: file.file_created_at,
			updated_at: file.file_updated_at
		};
	}

	function stockLabel(state: string): string {
		if (state === 'out_of_stock') return 'Sin stock';
		if (state === 'in_transit_only') return 'Solo en camino';
		if (state === 'emergency') return 'Emergencia';
		if (state === 'low') return 'Bajo';
		return 'Saludable';
	}

	function stockColor(state: string): 'success' | 'warning' | 'danger' | 'info' {
		if (state === 'out_of_stock' || state === 'emergency') return 'danger';
		if (state === 'low') return 'warning';
		if (state === 'in_transit_only') return 'info';
		return 'success';
	}

	function movementReasonLabel(reason: string): string {
		if (reason === 'purchase') return 'Compra';
		if (reason === 'sale') return 'Venta';
		if (reason === 'purchase_refund') return 'Reembolso compra';
		return 'Ajuste manual';
	}

	function movementDirectionLabel(direction: string): string {
		return direction === 'in' ? 'Entrada' : 'Salida';
	}

	function movementDirectionColor(direction: string): 'success' | 'danger' {
		return direction === 'in' ? 'success' : 'danger';
	}

	function handleDownload(file: DriveFileItem): void {
		window.open(getDriveServeUrl(file.code, { download: true }), '_blank', 'noopener,noreferrer');
	}

	function getLinkedFileByCode(fileCode: string): ProductDriveLink | null {
		return linkedFiles.find((file) => file.file_code === fileCode) ?? null;
	}

	function openPreview(file: ProductDriveLink): void {
		if (file.file_type === 'dir') {
			return;
		}

		previewFile = toPreviewFile(file);
		showPreview = true;
	}

	function selectGridFile(file: DriveFileItem): void {
		selectedGridFileCode = selectedGridFileCode === file.code ? null : file.code;
	}

	function previewGridFile(file: DriveFileItem): void {
		const linkedFile = getLinkedFileByCode(file.code);
		if (!linkedFile) {
			return;
		}

		openPreview(linkedFile);
	}

	function openFileContextMenu(event: MouseEvent, file: ProductDriveLink | DriveFileItem): void {
		event.preventDefault();
		event.stopPropagation();

		const linkedFile = 'file_code' in file ? file : getLinkedFileByCode(file.code);
		if (!linkedFile) {
			return;
		}

		contextLinkedFile = linkedFile;
		if (viewMode === 'grid') {
			selectedGridFileCode = linkedFile.file_code;
		}
		fileContextMenu?.open(event, linkedFile.file_code);
	}

	function clearSearchState(): void {
		searchQuery = '';
		searchLoading = false;
		hasSearched = false;
		searchError = '';
		searchResults = [];
		searchSelectedRows = [];
	}

	function openAttachDialog(): void {
		if (!hasDriveReadPermission || !canDriveUpdate) {
			showToast('No tienes permisos para vincular archivos', 'error');
			return;
		}

		clearSearchState();
		showAttachDialog = true;
	}

	function closeAttachDialog(): void {
		showAttachDialog = false;
		clearSearchState();
	}

	function clearSearchSelection(): void {
		searchSelectedRows = [];
	}

	async function refreshLinkedFiles(): Promise<void> {
		if (!hasDriveReadPermission) {
			return;
		}

		linkedLoading = true;
		try {
			const params = new SvelteURLSearchParams({
				product_code: productCode,
				scope: 'product_shared'
			});

			const response = await fetch(`/api/drive/links?${params.toString()}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudieron cargar los archivos vinculados');
			}

			const payload = (await response.json()) as DriveLinksResponse;
			linkedFiles = payload.links ?? [];
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'No se pudieron cargar los archivos vinculados';
			showToast(message, 'error');
		} finally {
			linkedLoading = false;
		}
	}

	function handleSearchSubmit(event: SubmitEvent): void {
		event.preventDefault();
		void searchDriveFiles();
	}

	async function searchDriveFiles(): Promise<void> {
		const query = searchQuery.trim();
		if (!query) {
			hasSearched = false;
			searchResults = [];
			searchSelectedRows = [];
			searchError = '';
			return;
		}

		searchLoading = true;
		hasSearched = true;
		searchError = '';
		searchSelectedRows = [];

		try {
			const params = new SvelteURLSearchParams({
				scope: 'product_shared',
				search: query
			});

			const response = await fetch(`/api/drive?${params.toString()}`);
			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudo realizar la búsqueda');
			}

			const payload = (await response.json()) as DriveSearchResponse;
			searchResults = payload.files ?? [];
		} catch (caught) {
			searchResults = [];
			searchError = caught instanceof Error ? caught.message : 'Error al buscar archivos';
		} finally {
			searchLoading = false;
		}
	}

	async function attachSelectedFiles(): Promise<void> {
		if (!canDriveUpdate || selectedSearchResults.length === 0) {
			return;
		}

		attachingFiles = true;
		let hasPrimaryImage = linkedFiles.some((file) => file.is_primary && file.file_type === 'img');

		const results = await Promise.all(
			selectedSearchResults.map(async (file, index) => {
				const shouldBePrimary = !hasPrimaryImage && file.type === 'img';
				if (shouldBePrimary) {
					hasPrimaryImage = true;
				}

				try {
					const response = await fetch('/api/drive/links', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							file_code: file.code,
							product_code: productCode,
							position: index,
							is_primary: shouldBePrimary
						})
					});

					if (!response.ok) {
						const payload = await response.json();
						return {
							success: false,
							message: payload?.message || `No se pudo vincular ${file.name}`
						};
					}

					return { success: true };
				} catch {
					return {
						success: false,
						message: `No se pudo vincular ${file.name}`
					};
				}
			})
		);

		attachingFiles = false;

		const successCount = results.filter((result) => result.success).length;
		const firstError = results.find((result) => !result.success)?.message;

		if (successCount > 0) {
			showToast(
				successCount === 1
					? 'Archivo vinculado al producto'
					: `${successCount} archivos vinculados al producto`,
				'success'
			);
			await refreshLinkedFiles();
		}

		if (firstError) {
			showToast(firstError, successCount > 0 ? 'warning' : 'error');
		}

		if (successCount > 0) {
			closeAttachDialog();
		}
	}

	async function unlinkFile(file: ProductDriveLink): Promise<void> {
		if (!canDriveUpdate) {
			return;
		}

		try {
			const response = await fetch('/api/drive/links', {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					file_code: file.file_code,
					product_code: productCode
				})
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudo quitar el vínculo');
			}

			showToast('Archivo desvinculado del producto', 'success');
			await refreshLinkedFiles();
		} catch (caught) {
			const message = caught instanceof Error ? caught.message : 'No se pudo quitar el vínculo';
			showToast(message, 'error');
		}
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<PageHeader
		title={data.product.name}
		subtitle="Producto, stock por sede e historial en una sola vista"
		icon="package"
	>
		{#snippet actions()}
			<Button type="border" icon="chevronLeft" onclick={() => goto(resolve('/products/' as '/'))}>
				Productos
			</Button>
		{/snippet}
	</PageHeader>

	<Tabs value={activeTab} tabs={DETAIL_TABS} onchange={(value) => (activeTab = value as typeof activeTab)}>
		{#if activeTab === 'overview'}
			<Card title="Información del producto" subtitle="Resumen principal del registro">
				<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md">
					<InfoItem label="Nombre" value={data.product.name} icon="package" iconColor="primary" />
					<InfoItem
						label="SKU"
						value={data.product.sku?.trim() || '—'}
						icon="tag"
						iconColor="secondary"
					/>
					<InfoItem
						label="Marca"
						value={data.product.brand_name?.trim() || '—'}
						icon="building"
						iconColor="info"
					/>
					<InfoItem
						label="Categoría"
						value={data.product.category_name?.trim() || '—'}
						icon="listChecks"
						iconColor="info"
					/>
					<InfoItem
						label="Precio venta"
						value={formatProductPrice(data.product.price)}
						icon="creditCard"
						iconColor="success"
					/>
					<InfoItem
						label="Costo actual"
						value={formatProductPrice(data.product.cost_price)}
						icon="wallet"
						iconColor="warning"
					/>
					<InfoItem
						label="Estado"
						icon="activity"
						iconColor={data.product.is_active ? 'success' : 'danger'}
					>
						<Chip color={data.product.is_active ? 'success' : 'danger'} size="sm">
							{data.product.is_active ? 'Activo' : 'Inactivo'}
						</Chip>
					</InfoItem>
					<InfoItem
						label="Actualizado"
						value={formatProductDateTime(data.product.updated_at)}
						icon="calendar"
						iconColor="warning"
					/>
				</div>
				{#if data.product.description}
					<Divider />
					<Fieldset legend="Descripción">
						<p class="lumi-margin--none lumi-text--sm lumi-text--muted">{data.product.description}</p>
					</Fieldset>
				{/if}
				{#if linkedImageName}
					<Divider />
					<Fieldset legend="Imagen principal">
						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
							<Icon icon="image" color="success" />
							<span class="lumi-text--sm lumi-text--muted">{linkedImageName}</span>
						</div>
					</Fieldset>
				{/if}
			</Card>
		{/if}

		{#if activeTab === 'stock'}
			{#if !hasInventoryReadPermission}
				<Alert type="warning" closable>
					No tienes permisos para consultar stock e historial de inventario.
				</Alert>
			{:else}
				<div class="lumi-stack lumi-space--sm">
					<div class="lumi-grid lumi-grid--columns-4 lumi-grid--gap-md product-detail__stock-stats">
						<StatCard
							title="Disponibles"
							value={totalAvailable}
							icon="package"
							color="success"
							subtitle="Suma en todas las sedes"
						/>
						<StatCard
							title="En camino"
							value={totalInbound}
							icon="clock"
							color="info"
							subtitle="Unidades inbound"
						/>
						<StatCard
							title="Costo unitario"
							value={formatProductPrice(data.product.cost_price)}
							icon="wallet"
							color="warning"
							subtitle="Referencia actual"
						/>
						<StatCard
							title="Precio unitario"
							value={formatProductPrice(data.product.price)}
							icon="creditCard"
							color="primary"
							subtitle="Precio de venta"
						/>
					</div>

					<Card title="Stock por sede" subtitle="Visibilidad completa del producto por branch">
						{#if inventoryByBranch.length === 0}
							<EmptyState
								title="Sin datos de stock"
								description="Aún no hay movimientos registrados para este producto."
								icon="boxes"
							/>
						{:else}
							<Table data={stockRows} hover pagination={false} class="product-detail__stock-table">
								{#snippet thead()}
									<th>Sede</th>
									<th>Disponible</th>
									<th>On hand</th>
									<th>En camino</th>
									<th>Reservado</th>
									<th>Umbrales</th>
									<th>Estado</th>
									<th>Últ. movimiento</th>
								{/snippet}
								{#snippet row({ row })}
									{@const item = row as unknown as ProductInventorySnapshot}
									<td>{item.branch_name}</td>
									<td>{item.available}</td>
									<td>{item.on_hand}</td>
									<td>{item.inbound}</td>
									<td>{item.reserved}</td>
									<td>{item.emergency_point} / {item.reorder_point}</td>
									<td>
										<Chip color={stockColor(item.stock_state)} size="sm">
											{stockLabel(item.stock_state)}
										</Chip>
									</td>
									<td>{item.last_movement_at ? formatDate(item.last_movement_at) : '—'}</td>
								{/snippet}
							</Table>
						{/if}
					</Card>

					<Card title="Histórico de movimientos" subtitle="Entradas y salidas recientes del producto">
						{#if inventoryMovements.length === 0}
							<EmptyState
								title="Sin movimientos"
								description="No hay historial para este producto en las sedes disponibles."
								icon="history"
							/>
						{:else}
							<Table
								data={movementRows}
								hover
								pagination={false}
								class="product-detail__movements-table"
							>
								{#snippet thead()}
									<th>Fecha</th>
									<th>Sede</th>
									<th>Tipo</th>
									<th>Motivo</th>
									<th>Cantidad</th>
									<th>Nota</th>
								{/snippet}
								{#snippet row({ row })}
									{@const movement = row as unknown as ProductMovementSnapshot}
									<td>{formatDate(movement.occurred_at)}</td>
									<td>{movement.branch_name}</td>
									<td>
										<Chip size="sm" color={movementDirectionColor(movement.direction)}>
											{movementDirectionLabel(movement.direction)}
										</Chip>
									</td>
									<td>{movementReasonLabel(movement.reason)}</td>
									<td>{movement.direction === 'in' ? '+' : '-'}{movement.quantity}</td>
									<td>{movement.note || '—'}</td>
								{/snippet}
							</Table>
						{/if}
					</Card>
				</div>
			{/if}
		{/if}

		{#if activeTab === 'media'}
			<Card>
				{#snippet header()}
					<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
						<div class="lumi-flex lumi-flex--column lumi-flex--gap-2xs">
							<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
								<span class="lumi-font--medium">Archivos del producto</span>
								<Chip color="info" size="sm">{linkedCount}</Chip>
							</div>
							<span class="lumi-text--xs lumi-text--muted">
								Vista y gestión de archivos y carpetas vinculadas
							</span>
						</div>

						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
							<SegmentedControl
								bind:value={viewMode}
								options={viewModeOptions}
								aria-label="Modo de vista de archivos vinculados"
							/>
							<Button
								type="gradient"
								color="primary"
								icon="plus"
								onclick={openAttachDialog}
								disabled={!hasDriveReadPermission || !canDriveUpdate}
							>
								Agregar
							</Button>
						</div>
					</div>
				{/snippet}

				{#if !hasDriveReadPermission}
					<Alert type="warning" closable>
						No tienes permisos para consultar los archivos vinculados desde Drive.
					</Alert>
				{:else if linkedLoading}
					<div class="lumi-flex lumi-flex--center lumi-padding--xl">
						<span class="lumi-text--sm lumi-text--muted">Actualizando archivos vinculados...</span>
					</div>
				{:else if linkedFiles.length === 0}
					<EmptyState
						title="Sin archivos vinculados"
						description="Este producto todavía no tiene archivos o carpetas asociados."
						icon="folder"
					>
						{#snippet actions()}
							<Button
								type="filled"
								color="primary"
								icon="plus"
								onclick={openAttachDialog}
								disabled={!canDriveUpdate}
							>
								Agregar archivos
							</Button>
						{/snippet}
					</EmptyState>
				{:else if viewMode === 'list'}
					<Table data={linkedFiles as unknown as TableRow[]} hover pagination itemsPerPage={10}>
						{#snippet thead()}
							<th>Archivo</th>
							<th>Tipo</th>
							<th>Tamaño</th>
							<th>Vinculado</th>
							<th>Acciones</th>
						{/snippet}

						{#snippet row({ row })}
							{@const file = row as unknown as ProductDriveLink}
							<td>
								<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
									<Icon
										icon={getFileIcon(file.file_type)}
										color={getFileColor(file.file_type)}
										size="sm"
									/>
									<div
										class="lumi-flex lumi-align-items--center lumi-flex--gap-2xs lumi-flex-item--grow"
									>
										<span class="lumi-font--medium lumi-text-ellipsis" title={file.file_name}>
											{file.file_name}
										</span>
										{#if file.is_primary}
											<Tooltip text="Imagen principal del producto">
												<Icon icon="star" size="sm" color="warning" />
											</Tooltip>
										{/if}
									</div>
								</div>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">{getDriveTypeLabel(file.file_type)}</span>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted">
									{file.file_type === 'dir'
										? '—'
										: formatFileSize(normalizeDriveFileSize(file.file_size))}
								</span>
							</td>
							<td>
								<span class="lumi-text--sm lumi-text--muted"
									>{formatProductDateTime(file.linked_at)}</span
								>
							</td>
							<td>
								<Button
									type="ghost"
									size="sm"
									icon="moreVertical"
									onclick={(e) => openFileContextMenu(e, file)}
									aria-label="Opciones de archivo"
								/>
							</td>
						{/snippet}
					</Table>
				{:else}
					<div class="lumi-stack lumi-space--sm">
						<DriveFileGrid
							files={linkedDriveItems}
							selectedFiles={selectedGridCodes}
							onfileclick={selectGridFile}
							onfiledblclick={previewGridFile}
							onfilecontextmenu={(e, file) => openFileContextMenu(e, file)}
						/>
					</div>
				{/if}
			</Card>
		{/if}
	</Tabs>
</div>

<Context bind:this={fileContextMenu} aria-label="Opciones de archivo vinculado">
	{#if contextLinkedFile}
		{@const contextFile = contextLinkedFile}
		<ContextItem
			title="Vista previa"
			icon="eye"
			disabled={contextFile.file_type === 'dir'}
			onclick={() => openPreview(contextFile)}
		/>
		<ContextItem
			title="Quitar vínculo"
			icon="trash"
			danger
			disabled={!canDriveUpdate}
			onclick={() => void unlinkFile(contextFile)}
		/>
	{/if}
</Context>

<Dialog bind:open={showAttachDialog} title="Buscar archivos en Drive" size="lg" scrollable>
	<div class="lumi-stack lumi-space--md">
		<form onsubmit={handleSearchSubmit}>
			<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm lumi-flex--wrap">
				<div class="lumi-flex-item--grow">
					<Input bind:value={searchQuery} placeholder="Escribe para buscar en Drive compartido" />
				</div>
				<Button type="flat" color="primary" icon="search" button="submit" loading={searchLoading}>
					Buscar
				</Button>
			</div>
		</form>

		{#if searchError}
			<Alert type="danger" closable onclose={() => (searchError = '')}>{searchError}</Alert>
		{/if}

		{#if !hasSearched}
			<EmptyState
				title="Sin resultados todavía"
				description="Escribe un nombre y pulsa Buscar para ver archivos o carpetas disponibles."
				icon="search"
			/>
		{:else if searchLoading}
			<div class="lumi-flex lumi-flex--center lumi-padding--xl">
				<span class="lumi-text--sm lumi-text--muted">Buscando en Drive compartido...</span>
			</div>
		{:else if searchResults.length === 0}
			<EmptyState
				title="Sin coincidencias"
				description="No se encontraron archivos con ese nombre."
				icon="folder"
			/>
		{:else}
			<Table
				data={searchResults as unknown as TableRow[]}
				selectable
				bind:selected={searchSelectedRows}
				pagination
				itemsPerPage={8}
			>
				{#snippet thead()}
					<th>Nombre</th>
					<th>Tipo</th>
					<th>Tamaño</th>
				{/snippet}

				{#snippet row({ row })}
					{@const file = row as unknown as DriveFileItem}
					<td>
						<div class="lumi-flex lumi-align-items--center lumi-flex--gap-sm">
							<Icon icon={getFileIcon(file.type)} color={getFileColor(file.type)} size="sm" />
							<span class="lumi-font--medium lumi-text-ellipsis" title={file.name}>{file.name}</span
							>
						</div>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">{getDriveTypeLabel(file.type)}</span>
					</td>
					<td>
						<span class="lumi-text--sm lumi-text--muted">
							{file.type === 'dir' ? '—' : formatFileSize(normalizeDriveFileSize(file.size))}
						</span>
					</td>
				{/snippet}
			</Table>

			<div class="lumi-flex lumi-justify--between lumi-align-items--center lumi-flex--wrap">
				<span class="lumi-text--sm lumi-text--muted">
					{selectedSearchResults.length} seleccionados para vincular
				</span>
				<Button type="flat" size="sm" icon="x" onclick={clearSearchSelection}>
					Limpiar selección
				</Button>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<Button type="border" onclick={closeAttachDialog}>Cancelar</Button>
		<Button
			type="filled"
			color="primary"
			icon="link"
			disabled={selectedSearchResults.length === 0 || !canDriveUpdate}
			loading={attachingFiles}
			onclick={() => void attachSelectedFiles()}
		>
			Vincular seleccionados
		</Button>
	{/snippet}
</Dialog>

<DriveFilePreview bind:open={showPreview} file={previewFile} ondownload={handleDownload} />

<style>
	.product-detail__stock-stats {
		margin-bottom: var(--lumi-space-2xs);
	}

	:global(.product-detail__stock-table .lumi-table__content) {
		min-width: 70rem;
	}

	:global(.product-detail__movements-table .lumi-table__content) {
		min-width: 62rem;
	}

	@media (max-width: 68.75rem) {
		.product-detail__stock-stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 43.75rem) {
		.product-detail__stock-stats {
			grid-template-columns: 1fr;
		}
	}
</style>
