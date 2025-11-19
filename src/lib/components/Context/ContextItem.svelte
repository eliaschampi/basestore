<script lang="ts">
	import Icon from '../Icon/Icon.svelte';
	import type { ContextItemProps } from './types';

	const {
		title = '',
		icon = '',
		shortcut = '',
		disabled = false,
		danger = false,
		class: className = '',
		onclick
	}: ContextItemProps = $props();

	const itemClasses = $derived(() => {
		return [
			'lumi-context-item',
			disabled && 'lumi-context-item--disabled',
			danger && 'lumi-context-item--danger',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	function handleClick(event: MouseEvent): void {
		if (!disabled) {
			onclick?.(event);
		}
	}

	function handleKeydown(event: KeyboardEvent): void {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleClick(event as unknown as MouseEvent);
		}
	}
</script>

<div
	class={itemClasses()}
	tabindex={disabled ? -1 : 0}
	role="menuitem"
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	{#if icon}
		<div class="lumi-context-item__icon">
			<Icon {icon} size="16px" />
		</div>
	{/if}

	<span class="lumi-context-item__text">{title}</span>

	{#if shortcut}
		<span class="lumi-context-item__shortcut">{shortcut}</span>
	{/if}
</div>

<style>
	.lumi-context-item {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition: all 0.1s ease;
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		line-height: var(--lumi-line-height-normal);
		border-radius: var(--lumi-radius-sm);
		text-decoration: none;
		outline: none;
	}

	.lumi-context-item:hover:not(.lumi-context-item--disabled) {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-context-item:focus-visible {
		background: var(--lumi-color-background-hover);
		box-shadow: inset 0 0 0 2px var(--lumi-color-primary);
	}

	.lumi-context-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}

	.lumi-context-item:hover .lumi-context-item__icon {
		color: inherit;
	}

	.lumi-context-item__text {
		flex: 1;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.lumi-context-item__shortcut {
		margin-left: var(--lumi-space-lg);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		opacity: 0.8;
	}

	/* States */
	.lumi-context-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-context-item--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-context-item--danger .lumi-context-item__icon {
		color: var(--lumi-color-danger);
	}

	.lumi-context-item--danger:hover:not(.lumi-context-item--disabled) {
		background: var(--lumi-color-danger-bg);
		color: var(--lumi-color-danger);
	}
</style>
