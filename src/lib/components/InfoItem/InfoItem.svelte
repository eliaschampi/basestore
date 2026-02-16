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

	const classes = $derived(() => {
		return [
			'lumi-info-item',
			`lumi-info-item--${layout}`,
			(icon || iconSlot) && 'lumi-info-item--with-icon',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const iconSize = $derived(() => `${getIconSize('sm')}px`);
	const styleVars = $derived(() => `--info-item-icon-color: var(--lumi-color-${iconColor});`);
</script>

<div class={classes()} style={styleVars()}>
	{#if icon || iconSlot}
		<div class="lumi-info-item__icon">
			{#if iconSlot}
				{@render iconSlot()}
			{:else}
				<Icon {icon} size={iconSize()} />
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
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-lg);
		transition: var(--lumi-transition-colors);
		background: color-mix(
			in srgb,
			var(--lumi-color-surface) 90%,
			color-mix(in srgb, var(--info-item-icon-color) 10%, transparent)
		);
		box-shadow: var(--lumi-shadow-sm);
	}

	.lumi-info-item--horizontal {
		flex-direction: row;
		align-items: flex-start;
	}

	.lumi-info-item--vertical {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--lumi-space-2xs);
	}

	.lumi-info-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: calc(var(--lumi-space-md) + var(--lumi-space-2xs));
		height: calc(var(--lumi-space-md) + var(--lumi-space-2xs));
		color: var(--info-item-icon-color);
		margin-top: var(--lumi-space-2xs);
	}

	.lumi-info-item__label {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		line-height: var(--lumi-line-height-tight);
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.lumi-info-item--horizontal .lumi-info-item__label {
		min-width: clamp(
			calc(var(--lumi-space-3xl) + var(--lumi-space-lg)),
			30%,
			calc(var(--lumi-space-3xl) * 2)
		);
	}

	.lumi-info-item__value {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		flex: 1;
		word-break: break-word;
		min-width: 0;
	}

	.lumi-info-item--vertical .lumi-info-item__icon {
		margin-top: 0;
	}
</style>
