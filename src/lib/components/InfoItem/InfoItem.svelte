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

	const iconSize = $derived(() => `${getIconSize('md')}px`);
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
		gap: var(--lumi-space-sm);
		padding: var(--lumi-space-sm);
		border-radius: var(--lumi-radius-md);
		transition: var(--lumi-transition-colors);
		background: rgba(var(--lumi-color-background-rgb), 0.2);
	}

	.lumi-info-item--horizontal {
		flex-direction: row;
		align-items: center;
	}

	.lumi-info-item--vertical {
		flex-direction: column;
		align-items: flex-start;
		gap: var(--lumi-space-xs);
	}

	.lumi-info-item__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		color: var(--info-item-icon-color);
	}

	.lumi-info-item__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text-muted);
		flex-shrink: 0;
		line-height: var(--lumi-line-height-normal);
	}

	.lumi-info-item--horizontal .lumi-info-item__label {
		min-width: calc(var(--lumi-space-3xl) * 2 + var(--lumi-space-xl));
	}

	.lumi-info-item__value {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-normal);
		color: var(--lumi-color-text);
		line-height: var(--lumi-line-height-normal);
		flex: 1;
		word-break: break-word;
	}
</style>
