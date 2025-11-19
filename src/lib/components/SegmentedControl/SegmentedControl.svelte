<script lang="ts">
	import { onMount } from "svelte";
	import Icon from "../Icon/Icon.svelte";
	import type { SegmentedControlProps } from "./types";

	let {
		value = $bindable(),
		options,
		color = "primary",
		disabled = false,
		class: className = "",
		onchange
	}: SegmentedControlProps = $props();

	let containerRef: HTMLDivElement | undefined = $state();
	const optionRefs: HTMLElement[] = [];
	let gliderStyle = $state<{ width: string; transform: string } | null>(null);

	const uniqueName = `lumi-sc-${Math.random().toString(36).substring(2, 9)}`;

	const containerClasses = $derived(() => {
		return [
			"lumi-segmented-control",
			`lumi-segmented-control--${color}`,
			disabled && "lumi-segmented-control--disabled",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	function updateGlider(): void {
		if (!containerRef) return;

		const activeIndex = options.findIndex((opt) => opt.value === value);
		if (activeIndex === -1 || !optionRefs[activeIndex]) {
			gliderStyle = null;
			return;
		}

		const activeEl = optionRefs[activeIndex];
		const containerRect = containerRef.getBoundingClientRect();
		const activeRect = activeEl.getBoundingClientRect();

		gliderStyle = {
			width: `${activeRect.width}px`,
			transform: `translateX(${activeRect.left - containerRect.left}px)`
		};
	}

	function handleChange(newValue: string | number): void {
		value = newValue;
		onchange?.(newValue);
		setTimeout(updateGlider, 0);
	}

	$effect(() => {
		if (value !== undefined) {
			setTimeout(updateGlider, 0);
		}
	});

	onMount(() => {
		setTimeout(updateGlider, 50);
	});
</script>

<div bind:this={containerRef} class={containerClasses()}>
	<!-- Glider -->
	{#if gliderStyle}
		<span
			class="lumi-segmented-control__glider"
			style="width: {gliderStyle.width}; transform: {gliderStyle.transform}"
		></span>
	{/if}

	<!-- Options -->
	{#each options as option, index (option.value)}
		<label
			bind:this={optionRefs[index]}
			class="lumi-segmented-control__option"
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
					<Icon icon={option.icon} size="16px" />
				{/if}
				<span>{option.label}</span>
			</span>
		</label>
	{/each}
</div>

<style>
	.lumi-segmented-control {
		position: relative;
		display: inline-flex;
		align-items: center;
		background: var(--lumi-color-background-hover);
		border-radius: var(--lumi-radius-lg);
		padding: 4px;
		gap: var(--lumi-space-xs);
		user-select: none;
	}

	.lumi-segmented-control__glider {
		position: absolute;
		top: 4px;
		left: 0;
		height: calc(100% - 8px);
		background: var(--lumi-color-surface);
		border-radius: var(--lumi-radius-md);
		box-shadow: var(--lumi-shadow-sm);
		transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
		z-index: 1;
	}

	.lumi-segmented-control__option {
		position: relative;
		z-index: 2;
		cursor: pointer;
		transition: color var(--lumi-transition-colors);
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
		transition: color 0.3s ease;
	}

	.lumi-segmented-control__input:checked + .lumi-segmented-control__content {
		color: var(--lumi-color-text);
	}

	.lumi-segmented-control__option:not(.lumi-segmented-control__option--disabled):hover
		.lumi-segmented-control__content {
		color: var(--lumi-color-text);
	}

	.lumi-segmented-control--disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Color Variants - Solo cambian el color del texto cuando está seleccionado */
	.lumi-segmented-control--primary
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-primary);
	}

	.lumi-segmented-control--secondary
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-secondary);
	}

	.lumi-segmented-control--success
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-success);
	}

	.lumi-segmented-control--warning
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-warning);
	}

	.lumi-segmented-control--danger
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-danger);
	}

	.lumi-segmented-control--info
		.lumi-segmented-control__input:checked
		+ .lumi-segmented-control__content {
		color: var(--lumi-color-info);
	}

	/* Mobile: Solo mostrar iconos */
	@media (max-width: 768px) {
		.lumi-segmented-control__content {
			padding: var(--lumi-space-xs);
		}

		.lumi-segmented-control__content span:not(:has(svg)) {
			display: none;
		}
	}
</style>
