<script lang="ts">
	import { Card, Chip, Icon, List, ListItem, Progress } from '$lib/components';
	import type { DriveTagOption } from '$lib/utils/drive';
	import { DRIVE_MENU_OPTIONS, TAG_OPTIONS, formatFileSize } from '$lib/utils/drive';

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

	interface Props {
		selectedMenu: MenuOption | null;
		selectedTag: DriveTagOption | null;
		storageInfo: StorageInfo;
		onmenuselect?: (menu: MenuOption | null) => void;
		ontagselect?: (tag: DriveTagOption) => void;
	}

	const { selectedMenu, selectedTag, storageInfo, onmenuselect, ontagselect }: Props = $props();

	const isMyDriveActive = $derived(!selectedMenu && !selectedTag);
</script>

<div class="drive-sidebar">
	<Card spaced>
		<div class="drive-sidebar__section">
			<p class="drive-sidebar__label">Navegación</p>
			<List size="sm" color="primary" class="drive-sidebar__nav">
				<ListItem
					title="Mi unidad"
					subtitle="Archivos y carpetas"
					icon="hardDrive"
					clickable
					active={isMyDriveActive}
					onclick={() => onmenuselect?.(null)}
				/>
				{#each DRIVE_MENU_OPTIONS.main as menu (menu.value)}
					<ListItem
						title={menu.name}
						subtitle={menu.value === 'recent' ? 'Actividad reciente' : 'Mayor tamaño'}
						icon={menu.icon}
						clickable
						active={selectedMenu?.value === menu.value}
						onclick={() => onmenuselect?.(menu)}
					/>
				{/each}
				{#each DRIVE_MENU_OPTIONS.trash as menu (menu.value)}
					<ListItem
						title={menu.name}
						subtitle="Eliminados temporalmente"
						icon={menu.icon}
						clickable
						active={selectedMenu?.value === menu.value}
						onclick={() => onmenuselect?.(menu)}
					/>
				{/each}
			</List>
		</div>

		<div class="drive-sidebar__section">
			<p class="drive-sidebar__label">Acceso rápido</p>
			<div class="drive-sidebar__meta">
				<div class="drive-sidebar__meta-item">
					<Icon icon="shieldCheck" size="16px" color="var(--lumi-color-success)" />
					<span class="lumi-text--xs">Permisos y seguridad por sede</span>
				</div>
				<div class="drive-sidebar__meta-item">
					<Icon icon="star" size="16px" color="var(--lumi-color-info)" />
					<span class="lumi-text--xs">Vista optimizada para media</span>
				</div>
			</div>
		</div>

		<div class="drive-sidebar__section">
			<p class="drive-sidebar__label">Etiquetas</p>
			<div class="drive-sidebar__tags">
				{#each TAG_OPTIONS as tag (tag.hash)}
					<button
						type="button"
						class="drive-sidebar__tag"
						class:drive-sidebar__tag--active={selectedTag?.hash === tag.hash}
						onclick={() => ontagselect?.(tag)}
					>
						<span class={`drive-sidebar__tag-dot drive-sidebar__tag-dot--${tag.tone}`}></span>
						<span class="lumi-text--sm">{tag.name}</span>
						{#if selectedTag?.hash === tag.hash}
							<Chip size="sm" color="primary">Activa</Chip>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="drive-sidebar__section">
			<p class="drive-sidebar__label">Almacenamiento</p>
			<Progress value={storageInfo.percentage} color="primary" />
			<div class="drive-sidebar__storage-meta">
				<span class="lumi-text--xs lumi-text--muted">{formatFileSize(storageInfo.used)} usado</span>
				<span class="lumi-text--xs lumi-text--muted">{storageInfo.percentage}%</span>
			</div>
		</div>
	</Card>
</div>

<style>
	.drive-sidebar {
		height: 100%;
	}

	.drive-sidebar :global(.lumi-card) {
		height: 100%;
		background:
			linear-gradient(
				145deg,
				color-mix(in srgb, var(--lumi-color-primary) 8%, transparent) 0%,
				color-mix(in srgb, var(--lumi-color-info) 3%, transparent) 65%,
				transparent 100%
			),
			var(--lumi-color-surface);
		backdrop-filter: blur(var(--lumi-blur-md));
	}

	.drive-sidebar__section {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.drive-sidebar__label {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.drive-sidebar__nav {
		max-height: 320px;
	}

	.drive-sidebar__meta {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: color-mix(in srgb, var(--lumi-color-surface) 75%, transparent);
	}

	.drive-sidebar__meta-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.drive-sidebar__tags {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
	}

	.drive-sidebar__tag {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		text-align: left;
	}

	.drive-sidebar__tag:hover {
		border-color: var(--lumi-color-border);
		background: var(--lumi-color-background-hover);
		transform: translateY(-1px);
	}

	.drive-sidebar__tag--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 35%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-sidebar__tag-dot {
		width: 12px;
		height: 12px;
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
	}

	.drive-sidebar__tag-dot--favorite {
		background: var(--lumi-color-secondary);
	}

	.drive-sidebar__tag-dot--highlight {
		background: var(--lumi-color-success);
	}

	.drive-sidebar__tag-dot--work {
		background: var(--lumi-color-warning);
	}

	.drive-sidebar__tag-dot--personal {
		background: var(--lumi-color-info);
	}

	.drive-sidebar__storage-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
</style>
