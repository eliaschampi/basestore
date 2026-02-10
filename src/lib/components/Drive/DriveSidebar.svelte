<script lang="ts">
	import { Button, Card, Icon, Progress } from '$lib/components';
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

	interface TagOption {
		color: string;
		hash: string;
		name: string;
	}

	interface Props {
		selectedMenu: MenuOption | null;
		selectedTag: TagOption | null;
		storageInfo: StorageInfo;
		onmenuselect?: (menu: MenuOption | null) => void;
		ontagselect?: (tag: TagOption) => void;
	}

	const { selectedMenu, selectedTag, storageInfo, onmenuselect, ontagselect }: Props = $props();

	const isMyDriveActive = $derived(!selectedMenu && !selectedTag);
</script>

<div class="drive-sidebar-card">
	<Card spaced>
		<div class="lumi-stack lumi-space--sm">
			<Button
				type={isMyDriveActive ? 'filled' : 'flat'}
				color={isMyDriveActive ? 'primary' : undefined}
				icon="hardDrive"
				size="sm"
				onclick={() => onmenuselect?.(null)}
			>
				Mi unidad
			</Button>
		</div>

		<div class="lumi-stack lumi-space--xs">
			<p class="drive-sidebar__label">Acceso rápido</p>
			{#each DRIVE_MENU_OPTIONS.main as menu (menu.value)}
				<Button
					type={selectedMenu?.value === menu.value ? 'filled' : 'flat'}
					color={selectedMenu?.value === menu.value ? 'primary' : undefined}
					icon={menu.icon}
					size="sm"
					onclick={() => onmenuselect?.(menu)}
				>
					{menu.name}
				</Button>
			{/each}
		</div>

		<div class="lumi-stack lumi-space--xs">
			{#each DRIVE_MENU_OPTIONS.trash as menu (menu.value)}
				<Button
					type={selectedMenu?.value === menu.value ? 'filled' : 'flat'}
					color={selectedMenu?.value === menu.value ? 'danger' : undefined}
					icon={menu.icon}
					size="sm"
					onclick={() => onmenuselect?.(menu)}
				>
					{menu.name}
				</Button>
			{/each}
		</div>

		<div class="lumi-stack lumi-space--xs">
			<p class="drive-sidebar__label">Etiquetas</p>
			{#each TAG_OPTIONS as tag (tag.hash)}
				<button
					type="button"
					class="drive-sidebar__tag"
					class:drive-sidebar__tag--active={selectedTag?.hash === tag.hash}
					onclick={() => ontagselect?.(tag)}
				>
					<span class="drive-sidebar__tag-dot" style:background={tag.color}></span>
					<span>{tag.name}</span>
					{#if selectedTag?.hash === tag.hash}
						<Icon icon="check" size="16px" color="primary" />
					{/if}
				</button>
			{/each}
		</div>

		<div class="lumi-stack lumi-space--xs">
			<p class="drive-sidebar__label">Almacenamiento</p>
			<Progress value={storageInfo.percentage} color="primary" />
			<p class="lumi-text--xs lumi-text--muted">{formatFileSize(storageInfo.used)} usado</p>
		</div>
	</Card>
</div>

<style>
	.drive-sidebar-card {
		height: 100%;
	}

	.drive-sidebar__label {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.drive-sidebar__tag {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.drive-sidebar__tag:hover {
		border-color: var(--lumi-color-border);
		background: var(--lumi-color-background-hover);
	}

	.drive-sidebar__tag--active {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 35%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-sidebar__tag-dot {
		width: 10px;
		height: 10px;
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
	}
</style>
