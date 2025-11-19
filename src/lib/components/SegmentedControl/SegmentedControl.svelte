<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { SegmentedControlProps } from './types';

	let {
		value = $bindable(),
		options,
		color = 'primary',
		disabled = false,
		class: className = '',
		onchange
	}: SegmentedControlProps = $props();

	let containerRef: HTMLDivElement | undefined = $state();
	const optionRefs: (HTMLElement | null)[] = $state([]);
	let gliderStyle = $state<{ width: string; transform: string } | null>(null);
	let resizeObserver: ResizeObserver | undefined;

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

<div bind:this={containerRef} class={containerClasses()} role="group">
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
		background: var(--lumi-color-background-secondary);
		border-radius: var(--lumi-radius-lg);
		padding: 4px;
		gap: 0; /* Gap handled by padding/margins if needed, but 0 is better for glider */
		user-select: none;
		isolation: isolate; /* Create stacking context */
		width: fit-content;
		max-width: 100%;
	}

	.lumi-segmented-control__glider {
		position: absolute;
		top: 4px;
		left: 0;
		height: calc(100% - 8px);
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-md);
		box-shadow: var(--lumi-shadow-sm);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
		transition: color 0.2s ease;
		border-radius: var(--lumi-radius-md);
	}

	.lumi-segmented-control__label {
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Active State */
	.lumi-segmented-control__option--active .lumi-segmented-control__content {
		color: var(--lumi-color-text);
	}

	/* Hover State */
	.lumi-segmented-control__option:not(.lumi-segmented-control__option--disabled):not(
			.lumi-segmented-control__option--active
		):hover
		.lumi-segmented-control__content {
		color: var(--lumi-color-text);
		background-color: rgba(0, 0, 0, 0.03);
	}

	/* Focus State */
	.lumi-segmented-control__input:focus-visible + .lumi-segmented-control__content {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: -2px;
	}

	.lumi-segmented-control--disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	/* Color Variants - Active Text Color */
	.lumi-segmented-control--primary
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-primary);
	}

	.lumi-segmented-control--secondary
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-secondary);
	}

	.lumi-segmented-control--success
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-success);
	}

	.lumi-segmented-control--warning
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-warning);
	}

	.lumi-segmented-control--danger
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-danger);
	}

	.lumi-segmented-control--info
		.lumi-segmented-control__option--active
		.lumi-segmented-control__content {
		color: var(--lumi-color-info);
	}

	/* Responsive */
	@media (max-width: 640px) {
		.lumi-segmented-control__content {
			padding: var(--lumi-space-xs) var(--lumi-space-sm);
		}

		.lumi-segmented-control__label {
			display: none;
		}

		.lumi-segmented-control__option:has(svg) .lumi-segmented-control__label {
			display: none;
		}

		/* If no icon, show label even on mobile */
		.lumi-segmented-control__option:not(:has(svg)) .lumi-segmented-control__label {
			display: block;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-segmented-control__glider {
			transition: none;
		}
	}
</style>
