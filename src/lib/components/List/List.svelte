<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ListProps } from './types';

	interface Props extends ListProps {
		children?: Snippet;
	}

	const { size = 'md', disabled = false, class: className = '', children }: Props = $props();

	const classes = $derived(() => {
		return ['lumi-list', `lumi-list--${size}`, disabled && 'lumi-list--disabled', className]
			.filter(Boolean)
			.join(' ');
	});
</script>

<div class={classes()}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.lumi-list {
		width: 100%;
		position: relative;
		font-family: var(--lumi-font-family-sans);
		display: flex;
		flex-direction: column;
		gap: 1px;
	}

	/* Size variants */
	.lumi-list--sm {
		--list-item-padding: var(--lumi-space-xs) var(--lumi-space-sm);
		--list-font-size: var(--lumi-font-size-sm);
		--list-icon-size: 16px;
	}

	.lumi-list--md {
		--list-item-padding: var(--lumi-space-sm) var(--lumi-space-md);
		--list-font-size: var(--lumi-font-size-base);
		--list-icon-size: 20px;
	}

	/* Disabled state */
	.lumi-list--disabled {
		opacity: 0.6;
		pointer-events: none;
	}
</style>
