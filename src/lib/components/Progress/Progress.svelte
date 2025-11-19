<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";
	import type { ProgressColor, ProgressSize } from "./types";

	interface Props {
		value?: number;
		color?: ProgressColor;
		size?: ProgressSize;
		indeterminate?: boolean;
		striped?: boolean;
		animated?: boolean;
		showLabel?: boolean;
		label?: string;
		labelSnippet?: Snippet<[{ value: number; max: number }]>;
		class?: string;
		oncomplete?: () => void;
	}

	const {
		value = $bindable(0),
		color = "primary",
		size = "md",
		indeterminate = false,
		striped = false,
		animated = false,
		showLabel = false,
		label,
		labelSnippet,
		class: className = "",
		oncomplete
	}: Props = $props();

	let currentValue = $state(0);
	let isAnimating = $state(false);

	const progressStyle = $derived(() => {
		if (indeterminate) {
			return {};
		}
		return {
			width: `${Math.min(Math.max(currentValue, 0), 100)}%`
		};
	});

	const progressClasses = $derived(() => {
		return [
			"lumi-progress",
			`lumi-progress--${color}`,
			`lumi-progress--${size}`,
			indeterminate && "lumi-progress--indeterminate",
			striped && "lumi-progress--striped",
			animated && "lumi-progress--animated",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	function animateToValue(targetValue: number): void {
		if (isAnimating) return;

		isAnimating = true;
		const startValue = currentValue;
		const difference = targetValue - startValue;
		const duration = Math.abs(difference) * 10;
		const startTime = performance.now();

		const animate = (currentTime: number) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const easeOut = 1 - (1 - progress) ** 3;

			currentValue = startValue + difference * easeOut;

			if (progress < 1) {
				requestAnimationFrame(animate);
			} else {
				currentValue = targetValue;
				isAnimating = false;

				if (targetValue >= 100) {
					oncomplete?.();
				}
			}
		};

		requestAnimationFrame(animate);
	}

	$effect(() => {
		if (value !== currentValue) {
			animateToValue(value);
		}
	});

	onMount(() => {
		setTimeout(() => {
			animateToValue(value);
		}, 100);
	});
</script>

<div class={progressClasses()}>
	<!-- Progress track -->
	<div class="lumi-progress__track">
		<!-- Progress bar -->
		<div
			class="lumi-progress__bar"
			class:lumi-progress__bar--indeterminate={indeterminate}
			style="width: {progressStyle().width}"
			role="progressbar"
			aria-valuenow={indeterminate ? undefined : currentValue}
			aria-valuemin="0"
			aria-valuemax="100"
		>
			<!-- Striped pattern -->
			{#if striped}
				<div class="lumi-progress__stripes"></div>
			{/if}
		</div>
	</div>

	<!-- Label -->
	{#if showLabel}
		<div class="lumi-progress__label">
			{#if labelSnippet}
				{@render labelSnippet({ value: currentValue, max: 100 })}
			{:else if label}
				{label}
			{:else}
				{Math.round(currentValue)}%
			{/if}
		</div>
	{/if}
</div>

<style>
	.lumi-progress {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		width: 100%;
	}

	.lumi-progress__track {
		flex: 1;
		height: var(--lumi-space-md);
		background: var(--lumi-color-background-secondary);
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
		position: relative;
	}

	.lumi-progress__bar {
		height: 100%;
		background: var(--lumi-color-primary);
		border-radius: var(--lumi-radius-full);
		transition: width 0.3s ease-out;
		position: relative;
		overflow: hidden;
	}

	.lumi-progress__bar--indeterminate {
		width: 30% !important;
		animation: lumi-progress-indeterminate 1.5s ease-in-out infinite;
	}

	.lumi-progress__stripes {
		position: absolute;
		inset: 0;
		background-image: linear-gradient(
			45deg,
			rgba(255, 255, 255, 0.15) 25%,
			transparent 25%,
			transparent 50%,
			rgba(255, 255, 255, 0.15) 50%,
			rgba(255, 255, 255, 0.15) 75%,
			transparent 75%,
			transparent
		);
		background-size: 1rem 1rem;
	}

	.lumi-progress--animated .lumi-progress__stripes {
		animation: lumi-progress-stripes 1s linear infinite;
	}

	.lumi-progress__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		min-width: 3rem;
		text-align: right;
	}

	/* Size Variants */
	.lumi-progress--xs .lumi-progress__track {
		height: 4px;
	}

	.lumi-progress--sm .lumi-progress__track {
		height: 8px;
	}

	.lumi-progress--md .lumi-progress__track {
		height: var(--lumi-space-md);
	}

	.lumi-progress--lg .lumi-progress__track {
		height: var(--lumi-space-lg);
	}

	.lumi-progress--xl .lumi-progress__track {
		height: var(--lumi-space-xl);
	}

	/* Color Variants */
	.lumi-progress--primary .lumi-progress__bar {
		background: var(--lumi-color-primary);
	}

	.lumi-progress--secondary .lumi-progress__bar {
		background: var(--lumi-color-secondary);
	}

	.lumi-progress--success .lumi-progress__bar {
		background: var(--lumi-color-success);
	}

	.lumi-progress--warning .lumi-progress__bar {
		background: var(--lumi-color-warning);
	}

	.lumi-progress--danger .lumi-progress__bar {
		background: var(--lumi-color-danger);
	}

	.lumi-progress--info .lumi-progress__bar {
		background: var(--lumi-color-info);
	}

	@keyframes lumi-progress-indeterminate {
		0% {
			transform: translateX(-100%);
		}
		100% {
			transform: translateX(400%);
		}
	}

	@keyframes lumi-progress-stripes {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 1rem 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-progress__bar {
			transition: none;
		}

		.lumi-progress__bar--indeterminate,
		.lumi-progress__stripes {
			animation: none;
		}
	}
</style>
