<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Icon } from '../Icon';
	import type { ChipProps } from './types';

	interface Props extends ChipProps {
		children?: Snippet;
	}

	const {
		color = 'primary',
		size = 'md',
		icon = '',
		closable = false,
		class: className = '',
		children,
		onclose,
		onclick
	}: Props = $props();

	// Computed classes
	const classes = $derived(() => {
		return ['lumi-chip', `lumi-chip--${color}`, `lumi-chip--${size}`, className]
			.filter(Boolean)
			.join(' ');
	});

	// Icon size based on chip size
	const iconSize = $derived(() => {
		return size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg';
	});

	// Event handlers
	const handleClose = (event: MouseEvent) => {
		event.stopPropagation();
		if (onclose) onclose(event);
	};

	const handleClick = (event: MouseEvent) => {
		if (onclick) onclick(event);
	};
</script>

<div class={classes()} role="status" onclick={handleClick} tabindex={onclick ? 0 : -1}>
	{#if icon}
		<!-- Icon -->
		<span class="lumi-chip__icon">
			<Icon {icon} size={iconSize()} />
		</span>
	{/if}

	<!-- Chip text -->
	<span class="lumi-chip__text">
		{#if children}
			{@render children()}
		{/if}
	</span>

	{#if closable}
		<!-- Close button -->
		<button type="button" class="lumi-chip__close" aria-label="Close chip" onclick={handleClose}>
			<Icon icon="x" size="sm" />
		</button>
	{/if}
</div>

<style>
	/* ============================================================================
	 * CHIP COMPONENT - Beautiful & Consistent
	 * ============================================================================ */

	.lumi-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		transition: all var(--lumi-transition-base);
		white-space: nowrap;
		cursor: default;
		user-select: none;
		border: none;
	}

	/* Size variants */
	.lumi-chip--sm {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-chip--md {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	/* Color variants - Flat style like button flat */
	.lumi-chip--primary {
		background-color: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
		color: var(--lumi-color-primary);
	}

	.lumi-chip--secondary {
		background-color: color-mix(in srgb, var(--lumi-color-secondary) 15%, transparent);
		color: var(--lumi-color-secondary);
	}

	.lumi-chip--success {
		background-color: color-mix(in srgb, var(--lumi-color-success) 15%, transparent);
		color: var(--lumi-color-success);
	}

	.lumi-chip--warning {
		background-color: color-mix(in srgb, var(--lumi-color-warning) 15%, transparent);
		color: var(--lumi-color-warning);
	}

	.lumi-chip--danger {
		background-color: color-mix(in srgb, var(--lumi-color-danger) 15%, transparent);
		color: var(--lumi-color-danger);
	}

	.lumi-chip--info {
		background-color: color-mix(in srgb, var(--lumi-color-info) 15%, transparent);
		color: var(--lumi-color-info);
	}

	/* Icon styling */
	.lumi-chip__icon {
		flex-shrink: 0;
		color: currentColor;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Text styling */
	.lumi-chip__text {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Close button styling */
	.lumi-chip__close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		padding: 0;
		margin-left: var(--lumi-space-xs);
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: currentColor;
		cursor: pointer;
		transition: all var(--lumi-transition-base);
		flex-shrink: 0;
		opacity: 0.7;
	}

	.lumi-chip__close:hover {
		opacity: 1;
		background: color-mix(in srgb, currentColor 15%, transparent);
		transform: scale(1.1);
	}

	.lumi-chip__close:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: var(--lumi-space-xs);
	}

	/* Hover effects */
	.lumi-chip:hover {
		opacity: 0.85;
	}

	/* Focus styles */
	.lumi-chip:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: var(--lumi-space-xs);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-chip,
		.lumi-chip__close {
			transition: none;
		}

		.lumi-chip:hover,
		.lumi-chip__close:hover {
			transform: none;
		}
	}
</style>
