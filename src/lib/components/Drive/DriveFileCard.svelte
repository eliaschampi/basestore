<script lang="ts">
	import { Icon } from '$lib/components';
	import {
		formatFileSize,
		getDriveTagByHash,
		getFileColor,
		getFileIcon,
		type DriveTagTone
	} from '$lib/utils/drive';
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
	const tagOption = $derived(getDriveTagByHash(file.tag));
	const previewUrl = $derived(file.type === 'img' ? `/api/drive/${file.code}/serve` : '');

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

	function getTagDotClass(tone: DriveTagTone): string {
		return `drive-file-card__tag-dot--${tone}`;
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
	<div class="drive-file-card__preview">
		{#if file.type === 'img'}
			<img class="drive-file-card__image" src={previewUrl} alt={file.name} loading="lazy" />
		{:else}
			<div class="drive-file-card__icon-wrap">
				<Icon
					icon={getFileIcon(file.type)}
					size="30px"
					color={`var(--lumi-color-${getFileColor(file.type)})`}
				/>
			</div>
		{/if}
		{#if tagOption}
			<span class="drive-file-card__tag">
				<span class={`drive-file-card__tag-dot ${getTagDotClass(tagOption.tone)}`}></span>
			</span>
		{/if}
	</div>

	<div class="drive-file-card__content">
		<div class="drive-file-card__name" title={file.name}>
			{file.name}
		</div>
		<div class="drive-file-card__meta">
			<span class="drive-file-card__type"
				>{file.type === 'dir' ? 'Carpeta' : file.type.toUpperCase()}</span
			>
			{#if file.type !== 'dir'}
				<span class="drive-file-card__separator">•</span>
				<span class="drive-file-card__size">{formatFileSize(file.size)}</span>
			{/if}
		</div>
	</div>
</button>

<style>
	.drive-file-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: var(--lumi-space-sm);
		width: 100%;
		padding: var(--lumi-space-sm);
		background: color-mix(in srgb, var(--lumi-color-surface) 96%, transparent);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		text-align: left;
		position: relative;
		overflow: hidden;
	}

	.drive-file-card:hover {
		transform: translateY(-1px);
		border-color: color-mix(in srgb, var(--lumi-color-primary) 32%, var(--lumi-color-border));
		box-shadow: var(--lumi-shadow-sm);
	}

	.drive-file-card--selected {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
	}

	.drive-file-card--dragging {
		opacity: 0.5;
	}

	.drive-file-card--drop-target {
		border: 1px dashed var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 8%, var(--lumi-color-surface));
		transform: scale(1.02);
	}

	.drive-file-card__preview {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		aspect-ratio: 4 / 3;
		border-radius: var(--lumi-radius-lg);
		background: var(--lumi-color-background-secondary);
		border: 1px solid var(--lumi-color-border-light);
		overflow: hidden;
	}

	.drive-file-card__image {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.drive-file-card__icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: var(--lumi-radius-lg);
		display: flex;
		align-items: center;
		justify-content: center;
		background: color-mix(
			in srgb,
			var(--lumi-color-surface) 90%,
			var(--lumi-color-background-hover) 10%
		);
		border: 1px solid var(--lumi-color-border-light);
	}

	.drive-file-card__tag {
		position: absolute;
		right: var(--lumi-space-xs);
		bottom: var(--lumi-space-xs);
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		border: 1px solid var(--lumi-color-border-light);
		background: color-mix(in srgb, var(--lumi-color-surface) 85%, transparent);
		border-radius: var(--lumi-radius-full);
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(var(--lumi-blur-sm));
	}

	.drive-file-card__tag-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--lumi-radius-full);
	}

	.drive-file-card__tag-dot--favorite {
		background: var(--lumi-color-secondary);
	}

	.drive-file-card__tag-dot--highlight {
		background: var(--lumi-color-success);
	}

	.drive-file-card__tag-dot--work {
		background: var(--lumi-color-warning);
	}

	.drive-file-card__tag-dot--personal {
		background: var(--lumi-color-info);
	}

	.drive-file-card__content {
		padding: 0 var(--lumi-space-xs) var(--lumi-space-xs);
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-2xs);
	}

	.drive-file-card__name {
		width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-word;
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-tight);
		color: var(--lumi-color-text);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		min-height: calc(var(--lumi-font-size-sm) * 2.4);
	}

	.drive-file-card__meta {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-2xs);
	}

	.drive-file-card__type,
	.drive-file-card__size {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}

	.drive-file-card__separator {
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
	}
</style>
