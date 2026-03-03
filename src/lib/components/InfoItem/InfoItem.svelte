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
		--info-shell-bg: color-mix(
			in srgb,
			var(--lumi-color-surface) 60%,
			var(--lumi-color-background-hover) 40%
		);
		--info-shell-border: color-mix(
			in srgb,
			var(--lumi-color-border) 74%,
			var(--lumi-color-border-strong) 26%
		);
		--info-highlight: color-mix(in srgb, var(--_accent, var(--lumi-color-primary)) 8%, transparent);
		display: flex;
		align-items: center;
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		border: var(--lumi-border-width-thin) solid var(--info-shell-border);
		border-radius: var(--lumi-radius-md);
		background:
			linear-gradient(180deg, var(--info-highlight) 0%, transparent 34%), var(--info-shell-bg);
		box-shadow: var(--lumi-shadow-sm);
		transition:
			border-color var(--lumi-duration-fast) var(--lumi-easing-default),
			background-color var(--lumi-duration-fast) var(--lumi-easing-default);
	}

	.lumi-info-item:hover {
		border-color: color-mix(
			in srgb,
			var(--_accent, var(--lumi-color-primary)) 22%,
			var(--info-shell-border)
		);
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
		width: calc(var(--lumi-icon-sm) + var(--lumi-space-sm));
		height: calc(var(--lumi-icon-sm) + var(--lumi-space-sm));
		color: var(--_accent, var(--lumi-color-primary));
		border-radius: var(--lumi-radius-sm);
		border: var(--lumi-border-width-thin) solid
			color-mix(in srgb, var(--_accent, var(--lumi-color-primary)) 24%, transparent);
		background: color-mix(in srgb, var(--_accent, var(--lumi-color-primary)) 12%, transparent);
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
