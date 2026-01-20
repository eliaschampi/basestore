<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ButtonProps } from './types';
	import Icon from '../Icon/Icon.svelte';

	interface Props extends ButtonProps {
		children?: Snippet;
		onclick?: (event: MouseEvent) => void;
		'aria-label'?: string;
	}

	const {
		type = 'filled',
		color = 'primary',
		size = 'md',
		icon,
		iconAfter = false,
		radius = false,
		loading = false,
		disabled = false,
		button = 'button',
		'aria-label': ariaLabel = '',
		class: className,
		onclick,
		children
	}: Props = $props();

	const iconSize = $derived(() => {
		switch (size) {
			case 'sm':
				return 16;
			case 'lg':
				return 20;
			case 'xl':
				return 24;
			default:
				return 18; // md
		}
	});

	const buttonClasses = $derived(() => {
		const classes = ['lumi-button', `lumi-button--${type}`, `lumi-button--${size}`];

		if (radius) classes.push('lumi-button--radius');
		if (icon && !children) classes.push('lumi-button--icon-only');
		if (loading) classes.push('lumi-button--loading');
		if (className) classes.push(className);

		return classes.join(' ');
	});

	// Map colors to CSS variables dynamically
	const styleVars = $derived(() => {
		const colorVar = `var(--lumi-color-${color})`;
		const colorRgb = `var(--lumi-color-${color}-rgb)`;
		return `--btn-color: ${colorVar}; --btn-color-rgb: ${colorRgb};`;
	});

	function handleClick(event: MouseEvent) {
		if (!disabled && !loading && onclick) {
			onclick(event);
		}
	}
</script>

<button
	class={buttonClasses()}
	type={button}
	disabled={disabled || loading}
	aria-label={ariaLabel || (icon && !children ? icon : undefined)}
	onclick={handleClick}
	style={styleVars()}
>
	{#if loading}
		<span class="lumi-button__spinner"></span>
	{/if}

	{#if icon && !iconAfter && !loading}
		<span class="lumi-button__icon">
			<Icon {icon} size="{iconSize()}px" />
		</span>
	{/if}

	{#if children}
		<span class="lumi-button__text">
			{@render children()}
		</span>
	{/if}

	{#if icon && iconAfter && !loading}
		<span class="lumi-button__icon">
			<Icon {icon} size="{iconSize()}px" />
		</span>
	{/if}
</button>

<style>
	.lumi-button {
		/* Base button styles */
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		font-family: var(--lumi-font-family-sans);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		text-decoration: none;
		border: 1px solid transparent;
		border-radius: var(--lumi-radius-md);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		user-select: none;
		white-space: nowrap;
		position: relative;
		overflow: hidden;
		outline: none;
	}

	.lumi-button:focus-visible {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--btn-color);
	}

	.lumi-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
		filter: grayscale(0.2);
	}

	.lumi-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.lumi-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	/* Size variants */
	.lumi-button--sm {
		height: var(--lumi-space-xl);
		padding: 0 var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-button--md {
		height: var(--lumi-space-xxl);
		padding: 0 var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-button--lg {
		height: var(--lumi-space-3xl);
		padding: 0 var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-button--xl {
		height: var(--lumi-space-4xl);
		padding: 0 var(--lumi-space-xl);
		font-size: var(--lumi-font-size-xl);
	}

	/* Radius variant */
	.lumi-button--radius {
		border-radius: var(--lumi-radius-full);
	}

	/* Icon only variant */
	.lumi-button--icon-only {
		padding: 0;
		width: var(--lumi-space-xxl);
	}
	.lumi-button--icon-only.lumi-button--sm {
		width: var(--lumi-space-xl);
	}
	.lumi-button--icon-only.lumi-button--lg {
		width: var(--lumi-space-3xl);
	}
	.lumi-button--icon-only.lumi-button--xl {
		width: var(--lumi-space-4xl);
	}

	/* ========================================================================== */
	/* TYPES (Using CSS Variables) */
	/* ========================================================================== */

	/* Filled */
	.lumi-button--filled {
		background: var(--btn-color);
		color: var(--lumi-color-white);
		border-color: transparent;
		box-shadow: 0 4px 12px rgba(var(--btn-color-rgb), 0.2);
	}
	.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--btn-color) 90%, black);
		box-shadow: 0 6px 16px rgba(var(--btn-color-rgb), 0.3);
	}

	/* Border (Outline) */
	.lumi-button--border {
		background: transparent;
		color: var(--btn-color);
		border-color: var(--btn-color);
	}
	.lumi-button--border:hover:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.05);
	}

	/* Flat (Ghost) */
	.lumi-button--flat {
		background: transparent;
		color: var(--btn-color);
		border-color: transparent;
	}
	.lumi-button--flat:hover:not(:disabled) {
		background: rgba(var(--btn-color-rgb), 0.1);
	}

	/* Gradient */
	.lumi-button--gradient {
		background: linear-gradient(
			135deg,
			var(--btn-color),
			color-mix(in srgb, var(--btn-color) 80%, black)
		);
		color: var(--lumi-color-white);
		border-color: transparent;
		box-shadow: 0 4px 15px rgba(var(--btn-color-rgb), 0.3);
	}
	.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			135deg,
			color-mix(in srgb, var(--btn-color) 90%, white),
			var(--btn-color)
		);
		box-shadow: 0 6px 20px rgba(var(--btn-color-rgb), 0.4);
		transform: translateY(-2px);
	}

	/* Loading spinner */
	.lumi-button__spinner {
		position: absolute;
		width: 1em;
		height: 1em;
		border: 2px solid currentColor;
		border-right-color: transparent;
		border-radius: 50%;
		animation: lumi-spin 0.8s linear infinite;
	}

	.lumi-button--loading {
		color: transparent !important;
	}
	.lumi-button--loading .lumi-button__spinner {
		color: var(--lumi-color-text); /* Fallback */
	}
	.lumi-button--filled.lumi-button--loading .lumi-button__spinner,
	.lumi-button--gradient.lumi-button--loading .lumi-button__spinner {
		color: var(--lumi-color-white);
	}
	.lumi-button--border.lumi-button--loading .lumi-button__spinner,
	.lumi-button--flat.lumi-button--loading .lumi-button__spinner {
		color: var(--btn-color);
	}

	@keyframes lumi-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
