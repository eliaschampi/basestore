<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import { LUMI_CONFIG } from '../config';
	import type { SegmentedControlProps } from './types';

	let {
		value = $bindable(),
		options,
		color = 'primary',
		disabled = false,
		class: className = '',
		onchange,
		'aria-label': ariaLabel = ''
	}: SegmentedControlProps = $props();

	let containerRef: HTMLDivElement | undefined = $state();
	const optionRefs: (HTMLElement | null)[] = $state([]);
	let gliderStyle = $state<{ width: string; transform: string } | null>(null);
	let resizeObserver: ResizeObserver | undefined;
	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;

	const uniqueName = `lumi-sc-${Math.random().toString(36).substring(2, 9)}`;

	const containerClasses = $derived(() => {
		return [
			'lumi-segmented-control',
			`lumi-segmented-control--${color}`,
			disabled && 'lumi-segmented-control--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const styleVars = $derived(
		`--seg-color: var(--lumi-color-${color}); --seg-transition-duration: ${transitionDuration};`
	);

	function updateGlider(): void {
		if (!containerRef || !options.length) return;

		const activeIndex = options.findIndex((opt) => opt.value === value);
		if (activeIndex === -1 || !optionRefs[activeIndex]) {
			gliderStyle = null;
			return;
		}

		const activeEl = optionRefs[activeIndex];
		if (!activeEl) return;

		const containerRect = containerRef.getBoundingClientRect();
		const activeRect = activeEl.getBoundingClientRect();

		// Calculate relative position including padding
		const left = activeRect.left - containerRect.left;

		gliderStyle = {
			width: `${activeRect.width}px`,
			transform: `translateX(${left}px)`
		};
	}

	function handleChange(newValue: string | number): void {
		if (disabled) return;
		value = newValue;
		onchange?.(newValue);
		// Use requestAnimationFrame to ensure DOM has updated
		requestAnimationFrame(updateGlider);
	}

	$effect(() => {
		if (value !== undefined) {
			// Wait for potential layout shifts
			requestAnimationFrame(updateGlider);
		}
	});

	onMount(() => {
		// Initial update
		requestAnimationFrame(updateGlider);

		// Observe container resizing
		if (containerRef) {
			resizeObserver = new ResizeObserver(() => {
				requestAnimationFrame(updateGlider);
			});
			resizeObserver.observe(containerRef);
		}

		// Also update on window resize as fallback
		window.addEventListener('resize', updateGlider);
	});

	onDestroy(() => {
		if (resizeObserver) {
			resizeObserver.disconnect();
		}
		if (typeof window !== 'undefined') {
			window.removeEventListener('resize', updateGlider);
		}
	});
</script>

<div
	bind:this={containerRef}
	class={containerClasses()}
	style={styleVars}
	role="radiogroup"
	aria-label={ariaLabel || 'Segmented control'}
>
	<!-- Glider -->
	{#if gliderStyle}
		<div
			class="lumi-segmented-control__glider"
			style="width: {gliderStyle.width}; transform: {gliderStyle.transform}"
		></div>
	{/if}

	<!-- Options -->
	{#each options as option, index (option.value)}
		<label
			bind:this={optionRefs[index]}
			class="lumi-segmented-control__option"
			class:lumi-segmented-control__option--active={value === option.value}
			class:lumi-segmented-control__option--disabled={option.disabled}
		>
			<input
				type="radio"
				class="lumi-segmented-control__input"
				name={uniqueName}
				value={option.value}
				checked={value === option.value}
				disabled={disabled || option.disabled}
				onchange={() => handleChange(option.value)}
				aria-label={option.label}
			/>
			<span class="lumi-segmented-control__content">
				{#if option.icon}
					<Icon icon={option.icon} size="sm" />
				{/if}
				<span class="lumi-segmented-control__label">{option.label}</span>
			</span>
		</label>
	{/each}
</div>

<style>
	.lumi-segmented-control {
		position: relative;
		display: inline-flex;
		align-items: center;
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-background-rgb), 0.12) 0%,
				rgba(var(--lumi-color-background-rgb), 0.28) 100%
			),
			var(--lumi-color-background-secondary);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-xl);
		padding: var(--lumi-space-2xs);
		gap: var(--lumi-space-2xs);
		user-select: none;
		isolation: isolate;
		width: fit-content;
		max-width: 100%;
		box-shadow: var(--lumi-shadow-sm);
		transition: var(--lumi-transition-all);
	}

	.lumi-segmented-control__glider {
		position: absolute;
		top: var(--lumi-space-2xs);
		left: 0;
		height: calc(100% - var(--lumi-space-xs));
		background:
			linear-gradient(
				180deg,
				var(--lumi-color-surface) 0%,
				var(--lumi-color-background-hover) 100%
			),
			var(--lumi-color-surface);
		border: 1px solid color-mix(in srgb, var(--seg-color) 20%, var(--lumi-color-border-light));
		border-radius: var(--lumi-radius-md);
		box-shadow: var(--lumi-shadow-sm);
		transition:
			transform var(--seg-transition-duration) var(--lumi-easing-default),
			width var(--seg-transition-duration) var(--lumi-easing-default),
			border-color var(--seg-transition-duration) var(--lumi-easing-default);
		z-index: 1;
		pointer-events: none;
	}

	.lumi-segmented-control__option {
		position: relative;
		z-index: 2;
		cursor: pointer;
		flex: 1;
		text-align: center;
		min-width: 0; /* Allow shrinking */
	}

	.lumi-segmented-control__option--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-segmented-control__input {
		position: absolute;
		opacity: 0;
		width: 0;
		height: 0;
	}

	.lumi-segmented-control__content {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--lumi-space-xs);
		padding: var(--lumi-space-xs) var(--lumi-space-md);
		color: var(--lumi-color-text-muted);
		font-weight: var(--lumi-font-weight-medium);
		font-size: var(--lumi-font-size-sm);
		white-space: nowrap;
		transition: var(--lumi-transition-colors);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-segmented-control__label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Active State */
	.lumi-segmented-control__option--active .lumi-segmented-control__content {
		color: var(--seg-color);
		font-weight: var(--lumi-font-weight-semibold);
	}

	/* Hover State */
	.lumi-segmented-control__option:not(.lumi-segmented-control__option--disabled):not(
			.lumi-segmented-control__option--active
		):hover
		.lumi-segmented-control__content {
		color: var(--lumi-color-text);
		background-color: var(--lumi-color-background-hover);
	}

	/* Focus State */
	.lumi-segmented-control__input:focus-visible + .lumi-segmented-control__content {
		outline: var(--lumi-border-width-thick) solid var(--seg-color);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-segmented-control--disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-segmented-control__glider {
			transition: none;
		}
	}
</style>
