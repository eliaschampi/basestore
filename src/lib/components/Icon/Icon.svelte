<script lang="ts">
	import { getIcon } from '$lib/utils/icons';
	import type { IconProps } from './types';

	const {
		icon = '',
		color = 'inherit',
		bg = '',
		size = 'md',
		round = false,
		stroke = 2,
		class: className = '',
		onclick
	}: IconProps = $props();

	const semanticColors = new Set([
		'primary',
		'secondary',
		'success',
		'warning',
		'danger',
		'info',
		'muted'
	]);
	const semanticBackgrounds = new Set([
		'primary',
		'secondary',
		'success',
		'warning',
		'danger',
		'info'
	]);

	// Get icon component from registry
	const IconComponent = $derived(icon ? getIcon(icon) : null);

	// Build classes
	const classes = $derived(() => {
		const baseClasses = ['lumi-icon', `lumi-icon--${size}`];

		if (round) baseClasses.push('lumi-icon--round');
		if (bg && semanticBackgrounds.has(bg)) baseClasses.push(`lumi-icon--bg-${bg}`);
		if (color && color !== 'inherit' && semanticColors.has(color)) {
			baseClasses.push(`lumi-icon--color-${color}`);
		}
		if (className) baseClasses.push(className);

		return baseClasses.join(' ');
	});

	// Build inline styles for custom sizes
	const iconStyle = $derived(() => {
		const styles: Record<string, string> = {};

		// Handle custom size (e.g. var(--token), clamp(), px/rem)
		if (size && !['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(size)) {
			styles.width = size;
			styles.height = size;
		}

		// Support custom CSS colors (e.g. var(--token), rgba())
		if (color && color !== 'inherit' && !semanticColors.has(color)) {
			styles.color = color;
		}

		// Support custom background colors outside semantic variants
		if (bg && !semanticBackgrounds.has(bg)) {
			styles.backgroundColor = bg;
		}

		return Object.keys(styles).length > 0
			? Object.entries(styles)
					.map(([key, value]) => `${key}: ${value}`)
					.join('; ')
			: undefined;
	});

	// Handle click
	function handleClick(event: MouseEvent) {
		if (onclick) {
			onclick(event);
		}
	}
</script>

{#if IconComponent}
	<IconComponent class={classes()} style={iconStyle()} strokeWidth={stroke} onclick={handleClick} />
{/if}

<style>
	/* ============================================================================
	   ICON COMPONENT - Beautiful & Consistent (Lumi UI Design System)
	   ============================================================================ */

	:global(.lumi-icon) {
		/* Base icon styles using design tokens */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition: var(--lumi-transition-all);
		user-select: none;
		cursor: pointer;
	}

	/* Round variant */
	:global(.lumi-icon--round) {
		border-radius: var(--lumi-radius-2xl);
	}

	/* Size variants */
	:global(.lumi-icon--xs) {
		width: var(--lumi-space-sm);
		height: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-xs);
	}

	:global(.lumi-icon--sm) {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		font-size: var(--lumi-font-size-sm);
	}

	:global(.lumi-icon--md) {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		font-size: var(--lumi-font-size-base);
	}

	:global(.lumi-icon--lg) {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
		font-size: var(--lumi-font-size-lg);
	}

	:global(.lumi-icon--xl) {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
		font-size: var(--lumi-font-size-xl);
	}

	:global(.lumi-icon--2xl) {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		font-size: var(--lumi-font-size-2xl);
	}

	/* Color variants */
	:global(.lumi-icon--color-primary) {
		color: var(--lumi-color-primary);
	}

	:global(.lumi-icon--color-secondary) {
		color: var(--lumi-color-secondary);
	}

	:global(.lumi-icon--color-success) {
		color: var(--lumi-color-success);
	}

	:global(.lumi-icon--color-warning) {
		color: var(--lumi-color-warning);
	}

	:global(.lumi-icon--color-danger) {
		color: var(--lumi-color-danger);
	}

	:global(.lumi-icon--color-info) {
		color: var(--lumi-color-info);
	}

	:global(.lumi-icon--color-muted) {
		color: var(--lumi-color-text-muted);
	}

	/* Background variants */
	:global(.lumi-icon--bg-primary),
	:global(.lumi-icon--bg-secondary),
	:global(.lumi-icon--bg-success),
	:global(.lumi-icon--bg-warning),
	:global(.lumi-icon--bg-danger),
	:global(.lumi-icon--bg-info) {
		color: var(--lumi-color-white);
		padding: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-2xl);
	}

	:global(.lumi-icon--bg-primary) {
		background: var(--lumi-color-primary);
	}

	:global(.lumi-icon--bg-secondary) {
		background: var(--lumi-color-secondary);
	}

	:global(.lumi-icon--bg-success) {
		background: var(--lumi-color-success);
	}

	:global(.lumi-icon--bg-warning) {
		background: var(--lumi-color-warning);
	}

	:global(.lumi-icon--bg-danger) {
		background: var(--lumi-color-danger);
	}

	:global(.lumi-icon--bg-info) {
		background: var(--lumi-color-info);
	}

	/* Hover effects */
	:global(.lumi-icon:hover) {
		transform: scale(1.05);
	}

	/* Enhanced hover for background variants */
	:global(.lumi-icon[class*='--bg-']:hover) {
		transform: translateY(-2px) scale(1.02);
	}

	/* Active state */
	:global(.lumi-icon:active) {
		transform: scale(0.95);
	}

	/* Enhanced active for background variants */
	:global(.lumi-icon[class*='--bg-']:active) {
		transform: translateY(0) scale(0.95);
	}

	/* Focus state */
	:global(.lumi-icon:focus-visible) {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-2xs);
	}

	/* Disabled state */
	:global(.lumi-icon:disabled),
	:global(.lumi-icon[disabled]) {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}
</style>
