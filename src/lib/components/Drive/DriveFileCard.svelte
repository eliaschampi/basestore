<script lang="ts">
	import { Icon } from '$lib/components';
	import { formatFileSize, getFileColor, getFileIcon } from '$lib/utils/drive';
	import type { DriveFileItem } from './types';

	interface Props {
		file: DriveFileItem;
		selected?: boolean;
		isTrash?: boolean;
		onclick?: (file: DriveFileItem) => void;
		ondblclick?: (file: DriveFileItem) => void;
		oncontextmenu?: (event: MouseEvent, file: DriveFileItem) => void;
		ondragstart?: (event: DragEvent, file: DriveFileItem) => void;
		ondragend?: () => void;
		ondrop?: (event: DragEvent, file: DriveFileItem) => void;
	}

	const {
		file,
		selected = false,
		isTrash = false,
		onclick,
		ondblclick,
		oncontextmenu,
		ondragstart,
		ondragend,
		ondrop
	}: Props = $props();

	let isDragging = $state(false);
	let isDropTarget = $state(false);
	let dragCounter = $state(0);
	let longPressTimer: ReturnType<typeof setTimeout> | undefined;
	let longPressTriggered = false;

	const cardClasses = $derived(
		[
			'drive-file-card',
			selected && 'drive-file-card--selected',
			isDragging && 'drive-file-card--dragging',
			isDropTarget && file.type === 'dir' && 'drive-file-card--drop-target'
		]
			.filter(Boolean)
			.join(' ')
	);

	function handleClick() {
		if (longPressTriggered) {
			longPressTriggered = false;
			return;
		}
		onclick?.(file);
	}

	function handleDblClick() {
		ondblclick?.(file);
	}

	function handleContextMenu(event: MouseEvent) {
		event.preventDefault();
		event.stopPropagation();
		oncontextmenu?.(event, file);
	}

	function handleDragStart(event: DragEvent) {
		if (isTrash) return;
		isDragging = true;
		if (event.dataTransfer) {
			event.dataTransfer.effectAllowed = 'move';
			event.dataTransfer.setData('application/json', JSON.stringify(file));
		}
		ondragstart?.(event, file);
	}

	function handleDragEnd() {
		isDragging = false;
		isDropTarget = false;
		dragCounter = 0;
		ondragend?.();
	}

	function handleDragEnter() {
		if (file.type === 'dir' && !isTrash && !isDragging) {
			dragCounter += 1;
			isDropTarget = true;
		}
	}

	function handleDragLeave() {
		if (file.type === 'dir' && !isTrash) {
			dragCounter -= 1;
			if (dragCounter <= 0) {
				dragCounter = 0;
				isDropTarget = false;
			}
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (!event.dataTransfer) {
			return;
		}

		if (file.type === 'dir' && !isTrash && !isDragging) {
			event.dataTransfer.dropEffect = 'move';
		} else {
			event.dataTransfer.dropEffect = 'none';
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		event.stopPropagation();

		if (file.type !== 'dir' || isTrash || isDragging) {
			return;
		}

		dragCounter = 0;
		isDropTarget = false;
		ondrop?.(event, file);
	}

	function handleTouchStart(event: TouchEvent) {
		if (isTrash) return;

		longPressTriggered = false;
		longPressTimer = setTimeout(() => {
			longPressTriggered = true;
			const touch = event.touches[0];
			if (!touch) return;

			const syntheticEvent = new MouseEvent('contextmenu', {
				bubbles: true,
				cancelable: true,
				clientX: touch.clientX,
				clientY: touch.clientY
			});

			oncontextmenu?.(syntheticEvent, file);
		}, 600);
	}

	function clearLongPress() {
		if (longPressTimer !== undefined) {
			clearTimeout(longPressTimer);
			longPressTimer = undefined;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			handleDblClick();
		}
	}
</script>

<button
	type="button"
	class={cardClasses}
	draggable={!isTrash}
	onclick={handleClick}
	ondblclick={handleDblClick}
	oncontextmenu={handleContextMenu}
	ondragstart={handleDragStart}
	ondragend={handleDragEnd}
	ondragenter={handleDragEnter}
	ondragleave={handleDragLeave}
	ondragover={handleDragOver}
	ondrop={handleDrop}
	ontouchstart={handleTouchStart}
	ontouchend={clearLongPress}
	ontouchmove={clearLongPress}
	onkeydown={handleKeydown}
>
	<div class="drive-file-card__icon">
		<Icon
			icon={getFileIcon(file.type)}
			size="32px"
			color={`var(--lumi-color-${getFileColor(file.type)})`}
		/>
		{#if file.tag}
			<span class="drive-file-card__tag" style:background={`#${file.tag}`}></span>
		{/if}
	</div>

	<div class="drive-file-card__name" title={file.name}>
		{file.name}
	</div>

	{#if file.type !== 'dir'}
		<div class="drive-file-card__size">{formatFileSize(file.size)}</div>
	{/if}
</button>

<style>
	.drive-file-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--lumi-space-xs);
		width: 100%;
		padding: var(--lumi-space-md);
		background: var(--lumi-color-surface);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		text-align: center;
	}

	.drive-file-card:hover {
		transform: translateY(-2px);
		border-color: var(--lumi-color-border);
		box-shadow: var(--lumi-shadow-md);
	}

	.drive-file-card--selected {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 6%, var(--lumi-color-surface));
	}

	.drive-file-card--dragging {
		opacity: 0.5;
	}

	.drive-file-card--drop-target {
		border: 1px dashed var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
		transform: scale(1.02);
	}

	.drive-file-card__icon {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
	}

	.drive-file-card__tag {
		position: absolute;
		right: 1px;
		bottom: 1px;
		width: 10px;
		height: 10px;
		border: 2px solid var(--lumi-color-surface);
		border-radius: var(--lumi-radius-full);
	}

	.drive-file-card__name {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-all;
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-tight);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}

	.drive-file-card__size {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}
</style>
