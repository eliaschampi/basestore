<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ListProps } from './types';

	interface Props extends ListProps {
		children?: Snippet;
	}

	const { size = 'md', color, disabled = false, class: className = '', children }: Props = $props();

	const classes = $derived(() => {
		return [
			'lumi-list',
			`lumi-list--${size}`,
			color && `lumi-list--${color}`,
			disabled && 'lumi-list--disabled',
			className
		]
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
		gap: var(--lumi-space-2xs);
		padding: var(--lumi-space-2xs);
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.04) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 30%
			),
			var(--lumi-color-surface-overlay);
		border: 1px solid
			color-mix(
				in srgb,
				var(--list-accent, var(--lumi-color-border-light)) 18%,
				var(--lumi-color-border-light)
			);
		border-radius: var(--lumi-radius-2xl);
		box-shadow: var(--lumi-shadow-sm);
	}

	/* Size variants */
	.lumi-list--sm {
		--list-item-padding: var(--lumi-space-xs) var(--lumi-space-sm);
		--list-font-size: var(--lumi-font-size-sm);
		--list-icon-size: var(--lumi-icon-sm);
	}

	.lumi-list--md {
		--list-item-padding: var(--lumi-space-sm) var(--lumi-space-md);
		--list-font-size: var(--lumi-font-size-base);
		--list-icon-size: var(--lumi-icon-md);
	}

	.lumi-list--primary {
		--list-accent: var(--lumi-color-primary);
	}

	.lumi-list--secondary {
		--list-accent: var(--lumi-color-secondary);
	}

	.lumi-list--success {
		--list-accent: var(--lumi-color-success);
	}

	.lumi-list--warning {
		--list-accent: var(--lumi-color-warning);
	}

	.lumi-list--danger {
		--list-accent: var(--lumi-color-danger);
	}

	.lumi-list--info {
		--list-accent: var(--lumi-color-info);
	}

	/* Disabled state */
	.lumi-list--disabled {
		opacity: 0.6;
		pointer-events: none;
	}
</style>
