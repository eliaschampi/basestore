<script lang="ts">
	import type { Snippet } from 'svelte';
	import { LUMI_CONFIG } from '../config';
	import type { ProgressProps } from './types';

	interface Props extends ProgressProps {
		labelSnippet?: Snippet<[{ value: number; max: number }]>;
	}

	const {
		value = $bindable(0),
		color = 'primary',
		size = 'md',
		indeterminate = false,
		striped = false,
		animated = false,
		showLabel = false,
		label,
		labelSnippet,
		'aria-label': ariaLabel = '',
		class: className = '',
		oncomplete
	}: Props = $props();

	let completionNotified = $state(false);

	const clampedValue = $derived(() => Math.min(Math.max(value, 0), 100));
	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;
	const styleVars = $derived(
		() =>
			`--progress-color: var(--lumi-color-${color}); --progress-transition-duration: ${transitionDuration};`
	);
	const progressStyle = $derived(() => (indeterminate ? '' : `width: ${clampedValue()}%`));

	const progressClasses = $derived(() => {
		return [
			'lumi-progress',
			`lumi-progress--${color}`,
			`lumi-progress--${size}`,
			indeterminate && 'lumi-progress--indeterminate',
			striped && 'lumi-progress--striped',
			animated && 'lumi-progress--animated',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	$effect(() => {
		const reachedComplete = !indeterminate && clampedValue() >= 100;
		if (reachedComplete && !completionNotified) {
			completionNotified = true;
			oncomplete?.();
		}
		if (!reachedComplete) {
			completionNotified = false;
		}
	});
</script>

<div class={progressClasses()} style={styleVars()}>
	<!-- Progress track -->
	<div class="lumi-progress__track">
		<!-- Progress bar -->
		<div
			class="lumi-progress__bar"
			class:lumi-progress__bar--indeterminate={indeterminate}
			style={progressStyle()}
			role="progressbar"
			aria-label={ariaLabel || label || 'Progress'}
			aria-valuenow={indeterminate ? undefined : clampedValue()}
			aria-valuemin="0"
			aria-valuemax="100"
		>
			<!-- Striped pattern -->
			{#if striped || animated}
				<div class="lumi-progress__stripes"></div>
			{/if}
		</div>
	</div>

	<!-- Label -->
	{#if showLabel}
		<div class="lumi-progress__label">
			{#if labelSnippet}
				{@render labelSnippet({ value: clampedValue(), max: 100 })}
			{:else if label}
				{label}
			{:else}
				{Math.round(clampedValue())}%
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
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-full);
		overflow: hidden;
		position: relative;
	}

	.lumi-progress__bar {
		height: 100%;
		background: var(--progress-color);
		border-radius: var(--lumi-radius-full);
		transition: width var(--progress-transition-duration) var(--lumi-easing-default);
		position: relative;
		overflow: hidden;
	}

	.lumi-progress__bar--indeterminate {
		width: 30% !important;
		position: absolute;
		animation: lumi-progress-indeterminate var(--lumi-duration-slower) var(--lumi-easing-default)
			infinite;
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
		background-size: var(--lumi-space-md) var(--lumi-space-md);
	}

	.lumi-progress--animated .lumi-progress__stripes {
		animation: lumi-progress-stripes var(--lumi-duration-slower) linear infinite;
	}

	.lumi-progress__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		min-width: calc(var(--lumi-space-md) * 3);
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* Size Variants */
	.lumi-progress--xs .lumi-progress__track {
		height: var(--lumi-space-2xs);
	}

	.lumi-progress--sm .lumi-progress__track {
		height: var(--lumi-space-xs);
	}

	.lumi-progress--md .lumi-progress__track {
		height: var(--lumi-space-sm);
	}

	.lumi-progress--lg .lumi-progress__track {
		height: var(--lumi-space-md);
	}

	.lumi-progress--xl .lumi-progress__track {
		height: var(--lumi-space-lg);
	}

	/* Color Variants */
	.lumi-progress--primary .lumi-progress__bar {
		--progress-color: var(--lumi-color-primary);
	}

	.lumi-progress--secondary .lumi-progress__bar {
		--progress-color: var(--lumi-color-secondary);
	}

	.lumi-progress--success .lumi-progress__bar {
		--progress-color: var(--lumi-color-success);
	}

	.lumi-progress--warning .lumi-progress__bar {
		--progress-color: var(--lumi-color-warning);
	}

	.lumi-progress--danger .lumi-progress__bar {
		--progress-color: var(--lumi-color-danger);
	}

	.lumi-progress--info .lumi-progress__bar {
		--progress-color: var(--lumi-color-info);
	}

	@keyframes lumi-progress-indeterminate {
		0% {
			left: -35%;
			right: 100%;
		}
		60% {
			left: 100%;
			right: -90%;
		}
		100% {
			left: 100%;
			right: -90%;
		}
	}

	@keyframes lumi-progress-stripes {
		0% {
			background-position: var(--lumi-space-md) 0;
		}
		100% {
			background-position: 0 0;
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
