<script lang="ts">
	import { Icon, Table } from '$lib/components';
	import type { TableRow } from '$lib/components';
	import type { DriveFileType } from '$lib/utils/drive';
	import { formatFileSize, getDriveTagByHash, getFileColor, getFileIcon } from '$lib/utils/drive';
	import type { DriveFileItem } from './types';

	interface Props {
		files: DriveFileItem[];
		selectedFiles: string[];
		isTrash?: boolean;
		onfileclick?: (file: DriveFileItem) => void;
		onfiledblclick?: (file: DriveFileItem) => void;
		onfilecontextmenu?: (event: MouseEvent, file: DriveFileItem) => void;
		onfiledragstart?: (event: DragEvent, file: DriveFileItem) => void;
		onfiledragend?: () => void;
		onfiledrop?: (event: DragEvent, file: DriveFileItem) => void;
	}

	const {
		files,
		selectedFiles,
		isTrash = false,
		onfileclick,
		onfiledblclick,
		onfilecontextmenu,
		onfiledragstart,
		onfiledragend,
		onfiledrop
	}: Props = $props();

	const tableData = $derived(files as unknown as TableRow[]);

	function formatDate(value: string): string {
		return new Date(value).toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function getTypeLabel(type: DriveFileType): string {
		const labels: Record<DriveFileType, string> = {
			dir: 'Carpeta',
			img: 'Imagen',
			vid: 'Video',
			aud: 'Audio',
			doc: 'Documento',
			zip: 'Archivo',
			otr: 'Otro'
		};
		return labels[type];
	}

	function handleContextMenu(event: MouseEvent, file: DriveFileItem) {
		event.preventDefault();
		onfilecontextmenu?.(event, file);
	}

	function handleDragStart(event: DragEvent, file: DriveFileItem) {
		if (isTrash) return;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('application/json', JSON.stringify(file));
		}
		onfiledragstart?.(event, file);
	}

	function handleDragOver(event: DragEvent, file: DriveFileItem) {
		event.preventDefault();
		if (file.type === 'dir' && !isTrash && event.dataTransfer) {
			event.dataTransfer.dropEffect = 'move';
		}
	}

	function handleDrop(event: DragEvent, file: DriveFileItem) {
		event.preventDefault();
		if (file.type !== 'dir' || isTrash) {
			return;
		}
		onfiledrop?.(event, file);
	}

	function getTagDotClass(file: DriveFileItem): string {
		const tag = getDriveTagByHash(file.tag);
		if (!tag) {
			return '';
		}

		return `drive-file-list__tag--${tag.tone}`;
	}
</script>

<Table data={tableData} hover>
	{#snippet thead()}
		<th>Nombre</th>
		<th>Tipo</th>
		<th>Tamaño</th>
		<th>Modificado</th>
	{/snippet}

	{#snippet row({ row })}
		{@const file = row as unknown as DriveFileItem}
		<td>
			<button
				type="button"
				class="drive-file-list__name-btn"
				class:drive-file-list__name-btn--selected={selectedFiles.includes(file.code)}
				draggable={!isTrash}
				onclick={() => onfileclick?.(file)}
				ondblclick={() => onfiledblclick?.(file)}
				oncontextmenu={(event) => handleContextMenu(event, file)}
				ondragstart={(event) => handleDragStart(event, file)}
				ondragend={() => onfiledragend?.()}
				ondragover={(event) => handleDragOver(event, file)}
				ondrop={(event) => handleDrop(event, file)}
			>
				<Icon
					icon={getFileIcon(file.type)}
					size="18px"
					color={`var(--lumi-color-${getFileColor(file.type)})`}
				/>
				<span class="drive-file-list__name-text" title={file.name}>{file.name}</span>
				{#if file.tag}
					<span class={`drive-file-list__tag ${getTagDotClass(file)}`}></span>
				{/if}
			</button>
		</td>
		<td>
			<span class="lumi-text--sm lumi-text--muted">{getTypeLabel(file.type)}</span>
		</td>
		<td>
			<span class="lumi-text--sm lumi-text--muted">
				{file.type === 'dir' ? '—' : formatFileSize(file.size)}
			</span>
		</td>
		<td>
			<span class="lumi-text--sm lumi-text--muted">{formatDate(file.updated_at)}</span>
		</td>
	{/snippet}
</Table>

<style>
	.drive-file-list__name-btn {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		width: 100%;
		padding: var(--lumi-space-2xs);
		border: 1px solid transparent;
		border-radius: var(--lumi-radius-md);
		background: transparent;
		color: var(--lumi-color-text);
		cursor: pointer;
		text-align: left;
		transition: var(--lumi-transition-all);
	}

	.drive-file-list__name-btn:hover {
		background: color-mix(in srgb, var(--lumi-color-primary) 5%, transparent);
	}

	.drive-file-list__name-btn--selected {
		border-color: color-mix(in srgb, var(--lumi-color-primary) 30%, var(--lumi-color-border));
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-file-list__name-text {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.drive-file-list__tag {
		width: 8px;
		height: 8px;
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
	}

	.drive-file-list__tag--favorite {
		background: var(--lumi-color-secondary);
	}

	.drive-file-list__tag--highlight {
		background: var(--lumi-color-success);
	}

	.drive-file-list__tag--work {
		background: var(--lumi-color-warning);
	}

	.drive-file-list__tag--personal {
		background: var(--lumi-color-info);
	}
</style>
