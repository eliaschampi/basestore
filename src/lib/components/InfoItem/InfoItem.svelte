<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize } from '../config';
	import type { InfoItemProps } from './types';

	interface Props extends InfoItemProps {
		children?: Snippet;
		iconSlot?: Snippet;
		labelSlot?: Snippet;
	}

	const {
		layout = 'horizontal',
		icon = '',
		iconColor = 'primary',
		label = '',
		value = '',
		class: className = '',
		children,
		iconSlot,
		labelSlot
	}: Props = $props();

	const iconSize = `${getIconSize('sm')}px`;
	const hasIcon = $derived(!!(icon || iconSlot));

	const classes = $derived(
		['lumi-info-item', `lumi-info-item--${layout}`, className].filter(Boolean).join(' ')
	);
</script>

<div class={classes} style="--_accent: var(--lumi-color-{iconColor})">
	{#if hasIcon}
		<div class="lumi-info-item__icon">
			{#if iconSlot}
				{@render iconSlot()}
			{:else}
				<Icon {icon} size={iconSize} />
			{/if}
		</div>
	{/if}

	<div class="lumi-info-item__label">
		{#if labelSlot}
			{@render labelSlot()}
		{:else}
			{label}
		{/if}
	</div>

	<div class="lumi-info-item__value">
		{#if children}
			{@render children()}
		{:else}
			{value}
		{/if}
	</div>
</div>

<style>
	.lumi-info-item {
		display: flex;
		align-items: center;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
	}

	/* ── Horizontal ───────────────────────────── */
	.lumi-info-item--horizontal {
		gap: var(--lumi-space-xs);
	}

	/* ── Vertical (icon + label row, value wraps) */
	.lumi-info-item--vertical {
		flex-wrap: wrap;
		gap: var(--lumi-space-2xs);
	}

	.lumi-info-item--vertical .lumi-info-item__value {
		flex-basis: 100%;
	}

	/* ── Icon ─────────────────────────────────── */
	.lumi-info-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--lumi-icon-sm);
		height: var(--lumi-icon-sm);
		color: var(--_accent, var(--lumi-color-primary));
	}

	/* ── Label ────────────────────────────────── */
	.lumi-info-item__label {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		line-height: var(--lumi-line-height-normal);
		letter-spacing: 0.03em;
		text-transform: uppercase;
		flex-shrink: 0;
	}

	.lumi-info-item--horizontal .lumi-info-item__label {
		min-width: 5rem;
	}

	/* ── Value ────────────────────────────────── */
	.lumi-info-item__value {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		flex: 1;
		min-width: 0;
		word-break: break-word;
	}
</style>
