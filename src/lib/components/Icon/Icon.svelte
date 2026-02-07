<script lang="ts">
	import { getIcon } from '$lib/utils/icons';
	import type { IconProps } from './types';

	const {
		icon = '',
		color = 'inherit',
		size = 'md',
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

	const IconComponent = $derived(icon ? getIcon(icon) : null);

	const classes = $derived(() => {
		const baseClasses = ['lumi-icon', `lumi-icon--${size}`];

		if (color && color !== 'inherit' && semanticColors.has(color)) {
			baseClasses.push(`lumi-icon--color-${color}`);
		}
		if (className) baseClasses.push(className);

		return baseClasses.join(' ');
	});

	const iconStyle = $derived(() => {
		const styles: Record<string, string> = {};

		if (size && !['xs', 'sm', 'md', 'lg', 'xl', '2xl'].includes(size)) {
			styles.width = size;
			styles.height = size;
		}

		if (color && color !== 'inherit' && !semanticColors.has(color)) {
			styles.color = color;
		}

		return Object.keys(styles).length > 0
			? Object.entries(styles)
					.map(([key, value]) => `${key}: ${value}`)
					.join('; ')
			: undefined;
	});
</script>

{#if IconComponent}
	<IconComponent class={classes()} style={iconStyle()} strokeWidth={stroke} {onclick} />
{/if}

<style>
	:global(.lumi-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: inherit;
		transition: var(--lumi-transition-all);
		user-select: none;
	}

	:global(.lumi-icon--xs) {
		width: var(--lumi-space-sm);
		height: var(--lumi-space-sm);
	}

	:global(.lumi-icon--sm) {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}

	:global(.lumi-icon--md) {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
	}

	:global(.lumi-icon--lg) {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
	}

	:global(.lumi-icon--xl) {
		width: var(--lumi-space-xxl);
		height: var(--lumi-space-xxl);
	}

	:global(.lumi-icon--2xl) {
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
	}

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
</style>
