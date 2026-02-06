<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';

	interface Props {
		title?: string;
		subtitle?: string;
		icon?: string;
		disabled?: boolean;
		clickable?: boolean;
		active?: boolean;
		class?: string;
		onclick?: (event: MouseEvent) => void;
		children?: Snippet;
		avatar?: Snippet;
		titleSlot?: Snippet;
		subtitleSlot?: Snippet;
	}

	const {
		title,
		subtitle,
		icon,
		disabled = false,
		clickable = false,
		active = false,
		class: className = '',
		onclick,
		children,
		avatar,
		titleSlot,
		subtitleSlot
	}: Props = $props();

	const classes = $derived(() => {
		return [
			'lumi-list-item',
			disabled && 'lumi-list-item--disabled',
			clickable && 'lumi-list-item--clickable',
			active && 'lumi-list-item--active',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const handleClick = (event: MouseEvent) => {
		if (!disabled && onclick) {
			onclick(event);
		}
	};
</script>

{#snippet listItemContent()}
	{#if avatar}
		<div class="lumi-list-item__avatar">
			{@render avatar()}
		</div>
	{/if}

	{#if icon}
		<div class="lumi-list-item__icon">
			<Icon {icon} size="var(--list-icon-size, 20px)" />
		</div>
	{/if}

	<div class="lumi-list-item__content">
		{#if title || titleSlot}
			<div class="lumi-list-item__title">
				{#if titleSlot}
					{@render titleSlot()}
				{:else}
					{title}
				{/if}
			</div>
		{/if}

		{#if subtitle || subtitleSlot}
			<div class="lumi-list-item__subtitle">
				{#if subtitleSlot}
					{@render subtitleSlot()}
				{:else}
					{subtitle}
				{/if}
			</div>
		{/if}
	</div>

	{#if children}
		<div class="lumi-list-item__actions">
			{@render children()}
		</div>
	{/if}
{/snippet}

{#if clickable}
	<button
		type="button"
		class={classes()}
		onclick={handleClick}
		{disabled}
		aria-current={active ? 'true' : undefined}
	>
		{@render listItemContent()}
	</button>
{:else}
	<div class={classes()} aria-current={active ? 'true' : undefined}>
		{@render listItemContent()}
	</div>
{/if}

<style>
	.lumi-list-item {
		--list-item-hover-bg: color-mix(in srgb, var(--lumi-color-primary) 4%, transparent);
		--list-item-active-bg: color-mix(in srgb, var(--lumi-color-primary) 8%, transparent);
		--list-item-lift: calc(var(--lumi-space-2xs) * -0.25);
		display: flex;
		align-items: center;
		gap: var(--lumi-space-md);
		padding: var(--list-item-padding, var(--lumi-space-sm) var(--lumi-space-md));
		border-radius: var(--lumi-radius-md);
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			transform 0.15s ease,
			box-shadow 0.15s ease;
		cursor: default;
		background: transparent;
		position: relative;
		color: var(--lumi-color-text);
		text-decoration: none;
		width: 100%;
		text-align: left;
		border: none;
		font: inherit;
	}

	/* Avatar */
	.lumi-list-item__avatar {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		flex-shrink: 0;
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
	}

	/* Icon */
	.lumi-list-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		transition: color 0.2s;
	}

	/* Content */
	.lumi-list-item__content {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.lumi-list-item__title {
		font-size: var(--list-font-size, var(--lumi-font-size-base));
		font-weight: var(--lumi-font-weight-medium);
		color: inherit;
		line-height: var(--lumi-line-height-tight);
	}

	.lumi-list-item__subtitle {
		font-size: 0.85em;
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		margin-top: calc(var(--lumi-space-2xs) / 2);
	}

	/* Actions */
	.lumi-list-item__actions {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		margin-left: auto;
	}

	/* States */
	.lumi-list-item--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-list-item--clickable {
		cursor: pointer;
	}

	.lumi-list-item--clickable:hover:not(.lumi-list-item--active):not(:disabled) {
		background: var(--list-item-hover-bg);
		color: var(--lumi-color-text);
		transform: translateY(var(--list-item-lift));
	}

	.lumi-list-item--clickable:hover .lumi-list-item__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-list-item--clickable:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--lumi-color-primary) 35%, transparent);
		outline-offset: var(--lumi-space-2xs);
	}

	/* Active state */
	.lumi-list-item--active {
		background: var(--list-item-active-bg);
		color: var(--lumi-color-primary);
	}

	.lumi-list-item--clickable.lumi-list-item--active:hover {
		background: var(--list-item-active-bg);
		transform: none;
	}

	.lumi-list-item--active .lumi-list-item__title {
		font-weight: var(--lumi-font-weight-semibold);
	}

	.lumi-list-item--active .lumi-list-item__icon {
		color: var(--lumi-color-primary);
	}

	.lumi-list-item--active .lumi-list-item__subtitle {
		color: color-mix(in srgb, var(--lumi-color-primary) 70%, transparent);
	}
</style>
