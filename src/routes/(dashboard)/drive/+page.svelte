<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import {
		Alert,
		Button,
		Card,
		Context,
		ContextItem,
		Dialog,
		DriveFileGrid,
		DriveFileList,
		DriveFilePreview,
		DriveFileUploader,
		DriveSidebar,
		EmptyState,
		Input,
		Loading,
		PageHeader,
		Select
	} from '$lib/components';
	import type { DriveFileItem } from '$lib/components';
	import { can } from '$lib/stores/permissions';
	import { showToast } from '$lib/stores/Toast';
	import type { DriveBreadcrumb } from '$lib/utils/drive';
	import type { PageData } from './$types';

	interface BranchOption {
		code: string;
		name: string;
		state: boolean;
	}

	interface StorageInfo {
		used: number;
		total: number;
		percentage: number;
	}

	interface MenuOption {
		name: string;
		value: string;
		icon: string;
	}

	interface TagOption {
		color: string;
		hash: string;
		name: string;
	}

	interface DriveListResponse {
		files: DriveFileItem[];
	}

	interface DriveUsageResponse {
		used: number;
	}

	const { data }: { data: PageData } = $props();

	const branchList = $derived((data.branches as BranchOption[] | undefined) ?? []);

	let files = $state<DriveFileItem[]>([]);
	let loading = $state(false);
	let errorMessage = $state('');
	let viewMode = $state<'grid' | 'list'>('grid');

	let currentBranch = $state('');
	let breadcrumbs = $state<DriveBreadcrumb[]>([{ label: 'Mi unidad', code: null }]);
	let currentParent = $state<string | null>(null);

	let selectedMenu = $state<MenuOption | null>(null);
	let selectedTag = $state<TagOption | null>(null);
	let selectedFileCodes = $state<string[]>([]);
	let storageInfo = $state<StorageInfo>({
		used: 0,
		total: 1_073_741_824,
		percentage: 0
	});

	let searchQuery = $state('');
	let searchTimeout: ReturnType<typeof setTimeout> | undefined;

	let showUploader = $state(false);
	let showPreview = $state(false);
	let showCreateDir = $state(false);
	let showRename = $state(false);

	let previewFile = $state<DriveFileItem | null>(null);
	let contextFile = $state<DriveFileItem | null>(null);

	let newDirName = $state('');
	let renameName = $state('');

	let fetchId = 0;

	let fileContextMenu:
		| {
				open: (event: MouseEvent, data?: unknown) => void;
				close: () => void;
		  }
		| undefined = $state();

	const canCreate = $derived(can('drive:create'));
	const canUpdate = $derived(can('drive:update'));
	const canDelete = $derived(can('drive:delete'));

	const branchOptions = $derived.by(() =>
		branchList.map((branch) => ({ label: branch.name, value: branch.code }))
	);

	const isTrashView = $derived(selectedMenu?.value === 'trash');
	const hasDriveBranch = $derived(Boolean(currentBranch));

	const pageTitle = $derived.by(() => {
		if (selectedMenu?.value === 'trash') {
			return 'Papelera';
		}

		if (selectedMenu) {
			return selectedMenu.name;
		}

		if (selectedTag) {
			return selectedTag.name;
		}

		return breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Drive';
	});

	const showBreadcrumbs = $derived(
		breadcrumbs.length > 1 && !selectedMenu && !selectedTag && !searchQuery.trim()
	);

	onMount(async () => {
		if (!currentBranch && branchList.length > 0) {
			currentBranch = branchList[0]?.code ?? '';
		}

		if (!currentBranch) {
			return;
		}

		await fetchFiles();
		await fetchStorageUsage();
	});

	onDestroy(() => {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}
	});

	async function fetchFiles() {
		if (!currentBranch) {
			files = [];
			return;
		}

		const requestId = ++fetchId;
		loading = true;
		errorMessage = '';

		try {
			const queryParts = [`branch=${encodeURIComponent(currentBranch)}`];

			if (selectedMenu?.value === 'trash') {
				queryParts.push('trashed=true');
			} else if (selectedMenu?.value === 'recent' || selectedMenu?.value === 'heavy') {
				queryParts.push(`view=${encodeURIComponent(selectedMenu.value)}`);
			} else if (selectedTag) {
				queryParts.push(`tag=${encodeURIComponent(selectedTag.hash)}`);
			} else if (searchQuery.trim()) {
				queryParts.push(`search=${encodeURIComponent(searchQuery.trim())}`);
			} else if (currentParent) {
				queryParts.push(`parent=${encodeURIComponent(currentParent)}`);
			}

			const response = await fetch(`/api/drive?${queryParts.join('&')}`);
			if (requestId !== fetchId) {
				return;
			}

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'No se pudieron cargar los archivos');
			}

			const payload = (await response.json()) as DriveListResponse;
			files = payload.files ?? [];
		} catch (caught) {
			if (requestId === fetchId) {
				errorMessage = caught instanceof Error ? caught.message : 'Error al cargar archivos';
			}
		} finally {
			if (requestId === fetchId) {
				loading = false;
			}
		}
	}

	async function fetchStorageUsage() {
		if (!currentBranch) {
			return;
		}

		try {
			const response = await fetch(`/api/drive/trash?branch=${encodeURIComponent(currentBranch)}`);
			if (!response.ok) {
				return;
			}

			const payload = (await response.json()) as DriveUsageResponse;
			const used = Number(payload.used ?? 0);
			storageInfo = {
				used,
				total: storageInfo.total,
				percentage: Math.min(100, Math.round((used / storageInfo.total) * 100))
			};
		} catch {
			// Non-critical metric fetch.
		}
	}

	async function handleBranchChange(value: unknown) {
		const branchCode = typeof value === 'string' ? value : '';
		if (!branchCode || branchCode === currentBranch) {
			return;
		}

		currentBranch = branchCode;
		selectedMenu = null;
		selectedTag = null;
		searchQuery = '';
		selectedFileCodes = [];
		currentParent = null;
		breadcrumbs = [{ label: 'Mi unidad', code: null }];

		await fetchFiles();
		await fetchStorageUsage();
	}

	async function createDirectory() {
		if (!currentBranch || !newDirName.trim()) {
			return;
		}

		try {
			const response = await fetch('/api/drive', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newDirName.trim(),
					branch_code: currentBranch,
					parent_code: currentParent
				})
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al crear carpeta');
			}

			showCreateDir = false;
			newDirName = '';
			showToast('Carpeta creada exitosamente', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al crear carpeta';
		}
	}

	async function handleUpload(file: File) {
		if (!currentBranch) {
			return;
		}

		const formData = new FormData();
		formData.append('file', file);
		formData.append('branch_code', currentBranch);
		if (currentParent) {
			formData.append('parent_code', currentParent);
		}

		const response = await fetch('/api/drive/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const payload = await response.json();
			throw new Error(payload?.message || 'Error al subir archivo');
		}

		showToast('Archivo subido exitosamente', 'success');
		await fetchFiles();
		await fetchStorageUsage();
	}

	async function renameFile() {
		if (!contextFile || !renameName.trim()) {
			return;
		}

		try {
			const response = await fetch(`/api/drive/${contextFile.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: renameName.trim() })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al renombrar archivo');
			}

			showRename = false;
			renameName = '';
			contextFile = null;
			showToast('Nombre actualizado', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al renombrar archivo';
		}
	}

	async function trashFile(file: DriveFileItem) {
		try {
			const response = await fetch(`/api/drive/${file.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_trashed: true })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al mover archivo a papelera');
			}

			selectedFileCodes = selectedFileCodes.filter((code) => code !== file.code);
			showToast('Archivo movido a papelera', 'warning');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al mover a papelera';
		}
	}

	async function restoreFile(file: DriveFileItem) {
		try {
			const response = await fetch(`/api/drive/${file.code}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ is_trashed: false })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al restaurar archivo');
			}

			showToast('Archivo restaurado', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al restaurar archivo';
		}
	}

	async function deleteFile(file: DriveFileItem) {
		try {
			const response = await fetch(`/api/drive/${file.code}`, { method: 'DELETE' });

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al eliminar archivo');
			}

			selectedFileCodes = selectedFileCodes.filter((code) => code !== file.code);
			showToast('Archivo eliminado permanentemente', 'success');
			await fetchFiles();
			await fetchStorageUsage();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al eliminar archivo';
		}
	}

	async function emptyTrash() {
		if (!currentBranch) {
			return;
		}

		try {
			const response = await fetch(`/api/drive/trash?branch=${encodeURIComponent(currentBranch)}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al vaciar la papelera');
			}

			showToast('Papelera vaciada', 'success');
			await fetchFiles();
			await fetchStorageUsage();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al vaciar la papelera';
		}
	}

	async function moveFile(fileCode: string, targetParentCode: string) {
		try {
			const response = await fetch(`/api/drive/${fileCode}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ parent_code: targetParentCode })
			});

			if (!response.ok) {
				const payload = await response.json();
				throw new Error(payload?.message || 'Error al mover archivo');
			}

			showToast('Archivo movido', 'success');
			await fetchFiles();
		} catch (caught) {
			errorMessage = caught instanceof Error ? caught.message : 'Error al mover archivo';
		}
	}

	function navigateToFolder(file: DriveFileItem) {
		if (file.type !== 'dir') {
			return;
		}

		currentParent = file.code;
		breadcrumbs = [...breadcrumbs, { label: file.name, code: file.code }];
		selectedMenu = null;
		selectedTag = null;
		searchQuery = '';
		selectedFileCodes = [];
		void fetchFiles();
	}

	function navigateBreadcrumb(index: number) {
		const target = breadcrumbs[index];
		if (!target) {
			return;
		}

		currentParent = target.code;
		breadcrumbs = breadcrumbs.slice(0, index + 1);
		selectedMenu = null;
		selectedTag = null;
		selectedFileCodes = [];
		void fetchFiles();
	}

	function handleMenuSelect(menu: MenuOption | null) {
		selectedMenu = menu;
		selectedTag = null;
		selectedFileCodes = [];
		searchQuery = '';

		if (!menu) {
			currentParent = null;
			breadcrumbs = [{ label: 'Mi unidad', code: null }];
		}

		void fetchFiles();
	}

	function handleTagSelect(tag: TagOption) {
		selectedTag = selectedTag?.hash === tag.hash ? null : tag;
		selectedMenu = null;
		selectedFileCodes = [];
		searchQuery = '';
		void fetchFiles();
	}

	function handleFileClick(file: DriveFileItem) {
		selectedFileCodes = selectedFileCodes.includes(file.code)
			? selectedFileCodes.filter((code) => code !== file.code)
			: [file.code];
	}

	function handleFileDblClick(file: DriveFileItem) {
		if (file.type === 'dir') {
			navigateToFolder(file);
			return;
		}

		previewFile = file;
		showPreview = true;
	}

	function handleContextMenu(event: MouseEvent, file: DriveFileItem) {
		contextFile = file;
		fileContextMenu?.open(event, file);
	}

	function handleDrop(event: DragEvent, targetDir: DriveFileItem) {
		const payload = event.dataTransfer?.getData('application/json');
		if (!payload) {
			return;
		}

		try {
			const draggedFile = JSON.parse(payload) as DriveFileItem;
			if (draggedFile.code === targetDir.code) {
				return;
			}

			void moveFile(draggedFile.code, targetDir.code);
		} catch {
			// Ignore malformed DnD payload.
		}
	}

	function openRenameDialog(file: DriveFileItem) {
		contextFile = file;
		renameName = file.name;
		showRename = true;
		fileContextMenu?.close();
	}

	function handleDownload(file: DriveFileItem) {
		window.open(`/api/drive/${file.code}/serve?download=true`, '_blank', 'noopener,noreferrer');
	}

	function handleSearchChange(value: string) {
		searchQuery = value;

		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		searchTimeout = setTimeout(() => {
			if (searchQuery.trim()) {
				selectedMenu = null;
				selectedTag = null;
				selectedFileCodes = [];
			}
			void fetchFiles();
		}, 350);
	}
</script>

<div class="lumi-stack lumi-space--lg">
	<PageHeader
		title={pageTitle}
		subtitle="Drive compartido por sede para gestión de media"
		icon="hardDrive"
	>
		{#snippet actions()}
			{#if hasDriveBranch}
				{#if !isTrashView}
					<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--center">
						<div class="drive-page__view-toggle">
							<Button
								type={viewMode === 'grid' ? 'filled' : 'flat'}
								size="sm"
								icon="grid"
								onclick={() => (viewMode = 'grid')}
							/>
							<Button
								type={viewMode === 'list' ? 'filled' : 'flat'}
								size="sm"
								icon="list"
								onclick={() => (viewMode = 'list')}
							/>
						</div>

						{#if canCreate}
							<Button
								type="border"
								size="sm"
								icon="folderPlus"
								onclick={() => (showCreateDir = true)}
							>
								Carpeta
							</Button>
							<Button
								type="filled"
								color="primary"
								size="sm"
								icon="upload"
								onclick={() => (showUploader = true)}
							>
								Subir
							</Button>
						{/if}
					</div>
				{:else if canDelete && files.length > 0}
					<Button type="filled" color="danger" size="sm" icon="trash" onclick={emptyTrash}>
						Vaciar papelera
					</Button>
				{/if}
			{/if}
		{/snippet}
	</PageHeader>

	{#if !hasDriveBranch}
		<Card>
			<EmptyState
				title="Sin sede disponible"
				description="No tienes sedes activas asignadas para administrar el Drive."
				icon="hardDrive"
				iconColor="muted"
			/>
		</Card>
	{:else}
		<div class="lumi-layout--two-columns drive-page__layout">
			<aside class="lumi-layout--sidebar-left drive-page__sidebar">
				<DriveSidebar
					{selectedMenu}
					{selectedTag}
					{storageInfo}
					onmenuselect={handleMenuSelect}
					ontagselect={handleTagSelect}
				/>
			</aside>

			<section class="lumi-layout--content-right">
				<Card spaced>
					<div class="lumi-flex lumi-flex--gap-sm lumi-align-items--center drive-page__toolbar">
						<div class="drive-page__branch-control">
							<Select
								label="Sede"
								value={currentBranch}
								options={branchOptions}
								clearable={false}
								onchange={handleBranchChange}
							/>
						</div>
						<div class="lumi-flex-item--grow">
							<Input
								placeholder="Buscar archivos..."
								icon="search"
								value={searchQuery}
								oninput={(event) =>
									handleSearchChange((event.currentTarget as HTMLInputElement | null)?.value ?? '')}
							/>
						</div>
					</div>

					{#if showBreadcrumbs}
						<nav class="lumi-flex lumi-flex--gap-xs lumi-align-items--center lumi-flex--wrap">
							{#each breadcrumbs as crumb, index (crumb.code ?? `root-${index}`)}
								{#if index > 0}
									<span class="lumi-text--muted">/</span>
								{/if}
								{#if index === breadcrumbs.length - 1}
									<span class="lumi-font--medium">{crumb.label}</span>
								{:else}
									<Button type="flat" size="sm" onclick={() => navigateBreadcrumb(index)}>
										{crumb.label}
									</Button>
								{/if}
							{/each}
						</nav>
					{/if}

					{#if errorMessage}
						<Alert type="danger" closable onclose={() => (errorMessage = '')}>{errorMessage}</Alert>
					{/if}

					<div class="drive-page__content">
						{#if loading}
							<div class="drive-page__loading">
								<Loading size="lg" color="primary" />
								<span class="lumi-text--sm lumi-text--muted">Cargando archivos...</span>
							</div>
						{:else if files.length === 0}
							<EmptyState
								title={isTrashView
									? 'La papelera está vacía'
									: searchQuery
										? 'Sin resultados'
										: 'Carpeta vacía'}
								description={isTrashView
									? 'Los archivos eliminados aparecerán aquí.'
									: searchQuery
										? 'Intenta otro término de búsqueda.'
										: 'Sube archivos o crea carpetas para comenzar.'}
								icon={isTrashView ? 'trash' : 'hardDrive'}
								iconColor="muted"
							>
								{#snippet actions()}
									{#if !isTrashView && canCreate}
										<Button
											type="filled"
											color="primary"
											icon="upload"
											size="sm"
											onclick={() => (showUploader = true)}
										>
											Subir archivos
										</Button>
									{/if}
								{/snippet}
							</EmptyState>
						{:else if viewMode === 'grid'}
							<DriveFileGrid
								{files}
								selectedFiles={selectedFileCodes}
								isTrash={isTrashView}
								onfileclick={handleFileClick}
								onfiledblclick={handleFileDblClick}
								onfilecontextmenu={handleContextMenu}
								onfiledrop={handleDrop}
							/>
						{:else}
							<DriveFileList
								{files}
								selectedFiles={selectedFileCodes}
								isTrash={isTrashView}
								onfileclick={handleFileClick}
								onfiledblclick={handleFileDblClick}
								onfilecontextmenu={handleContextMenu}
								onfiledrop={handleDrop}
							/>
						{/if}
					</div>
				</Card>
			</section>
		</div>
	{/if}
</div>

<Dialog bind:open={showCreateDir} title="Nueva carpeta" size="sm">
	<div class="lumi-stack lumi-space--md">
		<Input
			bind:value={newDirName}
			name="dir-name"
			label="Nombre de la carpeta"
			placeholder="Ingrese el nombre"
			required
		/>
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showCreateDir = false;
				newDirName = '';
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={createDirectory} disabled={!newDirName.trim()}>
			Crear
		</Button>
	{/snippet}
</Dialog>

<Dialog bind:open={showRename} title="Renombrar archivo" size="sm">
	<div class="lumi-stack lumi-space--md">
		<Input
			bind:value={renameName}
			name="rename"
			label="Nuevo nombre"
			placeholder="Ingrese el nombre"
			required
		/>
	</div>
	{#snippet footer()}
		<Button
			type="border"
			onclick={() => {
				showRename = false;
				renameName = '';
			}}
		>
			Cancelar
		</Button>
		<Button type="filled" color="primary" onclick={renameFile} disabled={!renameName.trim()}>
			Renombrar
		</Button>
	{/snippet}
</Dialog>

<DriveFileUploader bind:open={showUploader} onupload={handleUpload} />
<DriveFilePreview bind:open={showPreview} file={previewFile} ondownload={handleDownload} />

<Context bind:this={fileContextMenu} aria-label="Opciones de archivo">
	{#snippet children({ data })}
		{@const menuFile = (data as DriveFileItem | null) ?? contextFile}
		{#if menuFile}
			{#if !isTrashView}
				{#if menuFile.type === 'dir'}
					<ContextItem
						title="Abrir"
						icon="folder"
						onclick={() => {
							navigateToFolder(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{:else}
					<ContextItem
						title="Vista previa"
						icon="eye"
						onclick={() => {
							previewFile = menuFile;
							showPreview = true;
							fileContextMenu?.close();
						}}
					/>
					<ContextItem
						title="Descargar"
						icon="download"
						onclick={() => {
							handleDownload(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{/if}

				{#if canUpdate}
					<ContextItem title="Renombrar" icon="edit" onclick={() => openRenameDialog(menuFile)} />
				{/if}

				{#if canDelete}
					<ContextItem
						title="Mover a papelera"
						icon="trash"
						danger
						onclick={() => {
							void trashFile(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{/if}
			{:else}
				<ContextItem
					title="Restaurar"
					icon="refresh"
					onclick={() => {
						void restoreFile(menuFile);
						fileContextMenu?.close();
					}}
				/>
				{#if canDelete}
					<ContextItem
						title="Eliminar permanente"
						icon="trash"
						danger
						onclick={() => {
							void deleteFile(menuFile);
							fileContextMenu?.close();
						}}
					/>
				{/if}
			{/if}
		{/if}
	{/snippet}
</Context>

<style>
	.drive-page__layout {
		align-items: stretch;
	}

	.drive-page__sidebar {
		min-width: 0;
	}

	.drive-page__branch-control {
		min-width: 220px;
	}

	.drive-page__toolbar {
		flex-wrap: wrap;
	}

	.drive-page__content {
		min-height: 420px;
	}

	.drive-page__loading {
		min-height: 220px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
	}

	.drive-page__view-toggle {
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 2px;
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border-light);
	}

	@media (max-width: 1024px) {
		.drive-page__layout {
			grid-template-columns: 1fr;
		}

		.drive-page__sidebar {
			display: none;
		}

		.drive-page__branch-control {
			width: 100%;
		}
	}
</style>
