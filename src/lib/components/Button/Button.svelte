<script lang="ts">
	import type { Snippet } from "svelte";
	import type { ButtonProps } from "./types";
	import Icon from "../Icon/Icon.svelte";

	interface Props extends ButtonProps {
		children?: Snippet;
		onclick?: (event: MouseEvent) => void;
	}

	const {
		type = "filled",
		color = "primary",
		size = "md",
		icon,
		iconAfter = false,
		radius = false,
		loading = false,
		disabled = false,
		button = "button",
		class: className,
		onclick,
		children
	}: Props = $props();

	const iconSize = $derived(() => {
		switch (size) {
			case "sm":
				return 16;
			case "lg":
				return 20;
			case "xl":
				return 24;
			default:
				return 18; // md
		}
	});

	const buttonClasses = $derived(() => {
		const classes = [
			"lumi-button",
			`lumi-button--${type}`,
			`lumi-button--${color}`,
			`lumi-button--${size}`
		];

		if (radius) classes.push("lumi-button--radius");
		if (icon && !children) classes.push("lumi-button--icon-only");
		if (loading) classes.push("lumi-button--loading");
		if (className) classes.push(className);

		return classes.join(" ");
	});

	function handleClick(event: MouseEvent) {
		if (!disabled && !loading && onclick) {
			onclick(event);
		}
	}
</script>

<button class={buttonClasses()} type={button} disabled={disabled || loading} onclick={handleClick}>
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
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		text-decoration: none;
		border: 2px solid transparent;
		border-radius: var(--lumi-radius-2xl);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		user-select: none;
		white-space: nowrap;
		position: relative;
		overflow: hidden;
	}

	.lumi-button:focus-visible {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px currentColor;
	}

	.lumi-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* Size variants */
	.lumi-button--sm {
		min-height: var(--lumi-space-xl);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-button--md {
		min-height: var(--lumi-space-xxl);
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-button--lg {
		min-height: var(--lumi-space-3xl);
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-button--xl {
		min-height: var(--lumi-space-4xl);
		padding: var(--lumi-space-lg) var(--lumi-space-xl);
		font-size: var(--lumi-font-size-xl);
	}

	/* Icon only variant */
	.lumi-button--icon-only {
		padding: var(--lumi-space-xs);
		min-width: var(--lumi-space-xxl);
		min-height: var(--lumi-space-xxl);
	}

	.lumi-button--icon-only.lumi-button--sm {
		min-width: var(--lumi-space-xl);
		min-height: var(--lumi-space-xl);
	}

	.lumi-button--icon-only.lumi-button--md {
		min-width: var(--lumi-space-xxl);
		min-height: var(--lumi-space-xxl);
	}

	.lumi-button--icon-only.lumi-button--xl {
		min-width: var(--lumi-space-4xl);
		min-height: var(--lumi-space-4xl);
	}

	/* Text and icon elements */
	.lumi-button__text {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
	}

	.lumi-button__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	/* Loading spinner */
	.lumi-button__spinner {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: var(--lumi-radius-full);
		animation: lumi-spin var(--lumi-duration-slow) linear infinite;
	}

	/* Loading state - hide text and icons */
	.lumi-button:has(.lumi-button__spinner) .lumi-button__text,
	.lumi-button:has(.lumi-button__spinner) .lumi-button__icon {
		opacity: 0;
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Primary */
	/* ========================================================================== */
	.lumi-button--primary.lumi-button--filled {
		background: var(--lumi-color-primary);
		color: var(--lumi-color-white);
	}

	.lumi-button--primary.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-primary) 80%, black);
	}

	.lumi-button--primary.lumi-button--border {
		border-color: var(--lumi-color-primary);
		color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 5%, transparent);
	}

	.lumi-button--primary.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-primary);
		color: var(--lumi-color-white);
	}

	.lumi-button--primary.lumi-button--flat {
		color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
		border: none;
	}

	.lumi-button--primary.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-button--primary.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-primary) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-primary) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-primary) 25%, transparent);
	}

	.lumi-button--primary.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-primary) 0%,
			color-mix(in srgb, var(--lumi-color-primary) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-primary) 35%, transparent);
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Secondary */
	/* ========================================================================== */
	.lumi-button--secondary.lumi-button--filled {
		background: var(--lumi-color-secondary);
		color: var(--lumi-color-white);
	}

	.lumi-button--secondary.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-secondary) 80%, black);
	}

	.lumi-button--secondary.lumi-button--border {
		border-color: var(--lumi-color-secondary);
		color: var(--lumi-color-secondary);
		background: color-mix(in srgb, var(--lumi-color-secondary) 5%, transparent);
	}

	.lumi-button--secondary.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-secondary);
		color: var(--lumi-color-white);
	}

	.lumi-button--secondary.lumi-button--flat {
		color: var(--lumi-color-secondary);
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
		border: none;
	}

	.lumi-button--secondary.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-secondary) 15%, transparent);
	}

	.lumi-button--secondary.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-secondary) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-secondary) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-secondary) 25%, transparent);
	}

	.lumi-button--secondary.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-secondary) 0%,
			color-mix(in srgb, var(--lumi-color-secondary) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-secondary) 35%, transparent);
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Success */
	/* ========================================================================== */
	.lumi-button--success.lumi-button--filled {
		background: var(--lumi-color-success);
		color: var(--lumi-color-white);
	}

	.lumi-button--success.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-success) 80%, black);
	}

	.lumi-button--success.lumi-button--border {
		border-color: var(--lumi-color-success);
		color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 5%, transparent);
	}

	.lumi-button--success.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-success);
		color: var(--lumi-color-white);
	}

	.lumi-button--success.lumi-button--flat {
		color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
		border: none;
	}

	.lumi-button--success.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-success) 15%, transparent);
	}

	.lumi-button--success.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-success) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-success) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-success) 25%, transparent);
	}

	.lumi-button--success.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-success) 0%,
			color-mix(in srgb, var(--lumi-color-success) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-success) 35%, transparent);
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Warning */
	/* ========================================================================== */
	.lumi-button--warning.lumi-button--filled {
		background: var(--lumi-color-warning);
		color: var(--lumi-color-white);
	}

	.lumi-button--warning.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-warning) 80%, black);
	}

	.lumi-button--warning.lumi-button--border {
		border-color: var(--lumi-color-warning);
		color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 5%, transparent);
	}

	.lumi-button--warning.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-warning);
		color: var(--lumi-color-white);
	}

	.lumi-button--warning.lumi-button--flat {
		color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
		border: none;
	}

	.lumi-button--warning.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-warning) 15%, transparent);
	}

	.lumi-button--warning.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-warning) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-warning) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-warning) 25%, transparent);
	}

	.lumi-button--warning.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-warning) 0%,
			color-mix(in srgb, var(--lumi-color-warning) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-warning) 35%, transparent);
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Danger */
	/* ========================================================================== */
	.lumi-button--danger.lumi-button--filled {
		background: var(--lumi-color-danger);
		color: var(--lumi-color-white);
	}

	.lumi-button--danger.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-danger) 80%, black);
	}

	.lumi-button--danger.lumi-button--border {
		border-color: var(--lumi-color-danger);
		color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 5%, transparent);
	}

	.lumi-button--danger.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-danger);
		color: var(--lumi-color-white);
	}

	.lumi-button--danger.lumi-button--flat {
		color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
		border: none;
	}

	.lumi-button--danger.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-danger) 15%, transparent);
	}

	.lumi-button--danger.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-danger) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-danger) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-danger) 25%, transparent);
	}

	.lumi-button--danger.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-danger) 0%,
			color-mix(in srgb, var(--lumi-color-danger) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-danger) 35%, transparent);
	}

	/* ========================================================================== */
	/* COLOR VARIANTS - Info */
	/* ========================================================================== */
	.lumi-button--info.lumi-button--filled {
		background: var(--lumi-color-info);
		color: var(--lumi-color-white);
	}

	.lumi-button--info.lumi-button--filled:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-info) 80%, black);
	}

	.lumi-button--info.lumi-button--border {
		border-color: var(--lumi-color-info);
		color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 5%, transparent);
	}

	.lumi-button--info.lumi-button--border:hover:not(:disabled) {
		background: var(--lumi-color-info);
		color: var(--lumi-color-white);
	}

	.lumi-button--info.lumi-button--flat {
		color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 10%, transparent);
		border: none;
	}

	.lumi-button--info.lumi-button--flat:hover:not(:disabled) {
		background: color-mix(in srgb, var(--lumi-color-info) 15%, transparent);
	}

	.lumi-button--info.lumi-button--gradient {
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--lumi-color-info) 75%, white) 0%,
			color-mix(in srgb, var(--lumi-color-info) 90%, black) 100%
		);
		color: var(--lumi-color-white);
		border: none;
		box-shadow: 0 4px 12px color-mix(in srgb, var(--lumi-color-info) 25%, transparent);
	}

	.lumi-button--info.lumi-button--gradient:hover:not(:disabled) {
		background: linear-gradient(
			180deg,
			var(--lumi-color-info) 0%,
			color-mix(in srgb, var(--lumi-color-info) 90%, black) 100%
		);
		box-shadow: 0 6px 16px color-mix(in srgb, var(--lumi-color-info) 35%, transparent);
	}

	/* ========================================================================== */
	/* HOVER ANIMATIONS */
	/* ========================================================================== */
	.lumi-button:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.lumi-button--gradient:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.lumi-button--primary:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-primary) 30%, transparent);
	}

	.lumi-button--secondary:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-secondary) 30%, transparent);
	}

	.lumi-button--success:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-success) 30%, transparent);
	}

	.lumi-button--warning:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-warning) 30%, transparent);
	}

	.lumi-button--danger:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-danger) 30%, transparent);
	}

	.lumi-button--info:hover:not(:disabled) {
		box-shadow: 0 8px 25px color-mix(in srgb, var(--lumi-color-info) 30%, transparent);
	}

	/* Active state */
	.lumi-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.lumi-button--gradient:active:not(:disabled) {
		transform: translateY(0);
	}

	/* Loading animation */
	@keyframes lumi-spin {
		to {
			transform: translate(-50%, -50%) rotate(360deg);
		}
	}
</style>
