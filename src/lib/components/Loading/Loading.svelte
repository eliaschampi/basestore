<script lang="ts">
	import type { Snippet } from "svelte";
	import type { LoadingProps } from "./types";

	interface Props extends LoadingProps {
		children?: Snippet;
	}

	const { color = "primary", text = "", class: className = "", children }: Props = $props();

	const classes = $derived(() => {
		const baseClasses = ["lumi-loading", `lumi-loading--${color}`];

		if (text || children) baseClasses.push("lumi-loading--with-text");
		if (className) baseClasses.push(className);

		return baseClasses.join(" ");
	});
</script>

<div class={classes()}>
	<div class="lumi-loading__pulse-container">
		<div class="lumi-loading__pulse-outer"></div>
		<div class="lumi-loading__pulse-inner"></div>
	</div>
	{#if text || children}
		<div class="lumi-loading__text">
			{#if children}
				{@render children()}
			{:else}
				{text}
			{/if}
		</div>
	{/if}
</div>

<style>
	/* ============================================================================
	   LOADING COMPONENT - Clean and consistent design (Lumi UI Design System)
	   ============================================================================ */

	.lumi-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-md);
		font-family: var(--lumi-font-family-sans);
		transition: var(--lumi-transition-all);
		color: var(--lumi-color-primary); /* Default color */
	}

	/* Container for the pulse animation */
	.lumi-loading__pulse-container {
		position: relative;
		width: var(--lumi-space-3xl);
		height: var(--lumi-space-3xl);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* Outer pulse (expands infinitely) */
	.lumi-loading__pulse-outer {
		position: absolute;
		width: 100%;
		height: 100%;
		border-radius: 50%;
		background-color: currentColor;
		opacity: 0.1;
		animation: lumi-pulse-expand 2.5s ease-out infinite;
	}

	/* Inner circle (main indicator) */
	.lumi-loading__pulse-inner {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		border-radius: 50%;
		background-color: currentColor;
		animation: lumi-pulse-inner 2.5s ease-in-out infinite;
	}

	/* Loading text */
	.lumi-loading__text {
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		text-align: center;
		animation: lumi-fade-in 0.5s ease;
	}

	/* Color variants */
	.lumi-loading--primary {
		color: var(--lumi-color-primary);
	}

	.lumi-loading--secondary {
		color: var(--lumi-color-secondary);
	}

	.lumi-loading--success {
		color: var(--lumi-color-success);
	}

	.lumi-loading--warning {
		color: var(--lumi-color-warning);
	}

	.lumi-loading--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-loading--info {
		color: var(--lumi-color-info);
	}

	/* Keyframe Animations */
	@keyframes lumi-pulse-expand {
		0% {
			transform: scale(0.5);
			opacity: 0.2;
		}

		100% {
			transform: scale(2.5);
			opacity: 0;
		}
	}

	@keyframes lumi-pulse-inner {
		0%,
		100% {
			transform: scale(0.8);
		}

		50% {
			transform: scale(1.1);
		}
	}

	@keyframes lumi-fade-in {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}
</style>
