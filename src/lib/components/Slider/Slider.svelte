<script lang="ts">
	import type { SliderProps } from './types';

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label = '',
		color = 'primary',
		size = 'md',
		disabled = false,
		showValue = false,
		showTooltip = true,
		class: className = '',
		onchange
	}: SliderProps = $props();

	const sliderId = `lumi-slider-${crypto.randomUUID().slice(0, 8)}`;
	const labelId = `${sliderId}-label`;
	let trackRef: HTMLDivElement | undefined = $state();
	let isDragging = $state(false);

	const percentage = $derived.by(() => {
		const range = max - min;
		if (range <= 0) return 0;
		const raw = ((value - min) / range) * 100;
		return Math.max(0, Math.min(100, raw));
	});

	const sliderStyleVars = $derived.by(
		() => `--slider-fill: ${percentage}%; --slider-color: var(--lumi-color-${color});`
	);

	const classes = $derived(
		[
			'lumi-slider',
			`lumi-slider--${color}`,
			`lumi-slider--${size}`,
			disabled && 'lumi-slider--disabled',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function emitChange(): void {
		onchange?.(value);
	}

	function updateValueFromPosition(clientX: number): void {
		if (!trackRef) return;

		const rect = trackRef.getBoundingClientRect();
		const clickX = clientX - rect.left;
		const clickPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
		const newValue = min + (clickPercentage / 100) * (max - min);
		const steppedValue = min + Math.round((newValue - min) / step) * step;

		value = Math.max(min, Math.min(max, steppedValue));
	}

	function handleTrackClick(event: MouseEvent): void {
		if (disabled) return;
		updateValueFromPosition(event.clientX);
		emitChange();
	}

	function handleKeyDown(event: KeyboardEvent): void {
		if (disabled) return;

		let newValue = value;

		switch (event.key) {
			case 'ArrowRight':
			case 'ArrowUp':
				event.preventDefault();
				newValue = Math.min(max, value + step);
				break;
			case 'ArrowLeft':
			case 'ArrowDown':
				event.preventDefault();
				newValue = Math.max(min, value - step);
				break;
			case 'Home':
				event.preventDefault();
				newValue = min;
				break;
			case 'End':
				event.preventDefault();
				newValue = max;
				break;
			case 'PageUp':
				event.preventDefault();
				newValue = Math.min(max, value + step * 10);
				break;
			case 'PageDown':
				event.preventDefault();
				newValue = Math.max(min, value - step * 10);
				break;
			default:
				return;
		}

		if (newValue !== value) {
			value = newValue;
			emitChange();
		}
	}

	function startDragging(event: MouseEvent | TouchEvent): void {
		if (disabled) return;

		event.preventDefault();
		isDragging = true;

		const handleMove = (e: MouseEvent | TouchEvent) => {
			if (!isDragging) return;

			const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
			updateValueFromPosition(clientX);
		};

		const handleEnd = () => {
			isDragging = false;
			emitChange();
			document.removeEventListener('mousemove', handleMove);
			document.removeEventListener('mouseup', handleEnd);
			document.removeEventListener('touchmove', handleMove);
			document.removeEventListener('touchend', handleEnd);
		};

		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleEnd);
		document.addEventListener('touchmove', handleMove);
		document.addEventListener('touchend', handleEnd);
	}
</script>

<div class={classes} style={sliderStyleVars}>
	{#if label}
		<label id={labelId} class="lumi-slider__label" for={sliderId}>{label}</label>
	{/if}

	<div class="lumi-slider__container">
		<div
			bind:this={trackRef}
			id={sliderId}
			class="lumi-slider__track"
			onclick={handleTrackClick}
			onkeydown={handleKeyDown}
			onmousedown={startDragging}
			ontouchstart={startDragging}
			role="slider"
			tabindex={disabled ? -1 : 0}
			aria-valuenow={value}
			aria-valuemin={min}
			aria-valuemax={max}
			aria-labelledby={label ? labelId : undefined}
			aria-label={label ? undefined : 'Slider'}
			aria-disabled={disabled}
		>
			<div class="lumi-slider__fill"></div>
			<div
				class="lumi-slider__thumb"
				class:lumi-slider__thumb--dragging={isDragging}
				aria-hidden="true"
			>
				{#if showTooltip}
					<div class="lumi-slider__tooltip">
						{value}
					</div>
				{/if}
			</div>
		</div>
	</div>

	{#if showValue}
		<div class="lumi-slider__value">{value}</div>
	{/if}
</div>

<style>
	.lumi-slider {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-sm);
		width: 100%;
		--slider-color: var(--lumi-color-primary);
		--slider-fill: 0%;
		--slider-track-size: calc(var(--lumi-space-2xs) + var(--lumi-border-width-thick));
		--slider-track-bg: color-mix(
			in srgb,
			var(--lumi-color-background-hover) 70%,
			var(--lumi-color-surface) 30%
		);
		--slider-hit-area: var(--lumi-space-xs);
		--slider-thumb-size: var(--lumi-space-md);
		--slider-tooltip-offset: var(--lumi-space-xs);
		--slider-tooltip-arrow: var(--lumi-space-2xs);
	}

	.lumi-slider__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		transition: color 0.15s ease;
	}

	.lumi-slider__container {
		position: relative;
		width: 100%;
	}

	.lumi-slider__track {
		position: relative;
		width: 100%;
		height: var(--slider-track-size);
		background: var(--slider-track-bg);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-full);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background-color 0.15s ease,
			box-shadow 0.15s ease;
		padding-block: var(--slider-hit-area);
		background-clip: content-box;
		margin-block: calc(var(--slider-hit-area) * -1);
		touch-action: none;
	}

	.lumi-slider__track:hover {
		border-color: color-mix(in srgb, var(--slider-color) 30%, var(--lumi-color-border-light));
	}

	.lumi-slider__track:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--slider-color) 35%, transparent);
		outline-offset: var(--lumi-space-xs);
	}

	.lumi-slider--sm .lumi-slider__track {
		--slider-track-size: var(--lumi-space-2xs);
		--slider-thumb-size: var(--lumi-space-sm);
	}

	.lumi-slider--lg .lumi-slider__track {
		--slider-track-size: var(--lumi-space-xs);
		--slider-thumb-size: calc(var(--lumi-space-md) + var(--lumi-space-2xs));
	}

	.lumi-slider__fill {
		position: absolute;
		top: var(--slider-hit-area);
		left: 0;
		height: var(--slider-track-size);
		width: var(--slider-fill);
		background: linear-gradient(
			90deg,
			color-mix(in srgb, var(--slider-color) 82%, var(--lumi-color-white)) 0%,
			var(--slider-color) 100%
		);
		border-radius: var(--lumi-radius-full);
		transition: width 0.1s ease;
		pointer-events: none;
	}

	.lumi-slider__thumb {
		position: absolute;
		top: 50%;
		left: var(--slider-fill);
		transform: translate(-50%, -50%);
		width: var(--slider-thumb-size);
		height: var(--slider-thumb-size);
		background: var(--lumi-color-surface);
		border: var(--lumi-border-width-thick) solid var(--slider-color);
		border-radius: var(--lumi-radius-full);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
		box-shadow: var(--lumi-shadow-sm);
		z-index: 2;
		pointer-events: none;
	}

	.lumi-slider__track:hover .lumi-slider__thumb {
		transform: translate(-50%, -50%) scale(1.06);
		box-shadow: var(--lumi-shadow-md);
	}

	.lumi-slider__thumb--dragging {
		transform: translate(-50%, -50%) scale(1.14);
		cursor: grabbing;
	}

	.lumi-slider__tooltip {
		position: absolute;
		bottom: calc(100% + var(--slider-tooltip-offset));
		left: 50%;
		transform: translateX(-50%);
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		background: var(--lumi-color-text);
		color: var(--lumi-color-surface);
		font-size: var(--lumi-font-size-xs);
		border-radius: var(--lumi-radius-md);
		white-space: nowrap;
		pointer-events: none;
		opacity: 0;
		transition: var(--lumi-transition-opacity);
	}

	.lumi-slider__track:hover .lumi-slider__tooltip,
	.lumi-slider__track:focus-visible .lumi-slider__tooltip {
		opacity: 1;
	}

	.lumi-slider__tooltip::after {
		content: '';
		position: absolute;
		top: 100%;
		left: 50%;
		transform: translateX(-50%);
		border: var(--slider-tooltip-arrow) solid transparent;
		border-top-color: var(--lumi-color-text);
	}

	.lumi-slider__value {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		text-align: center;
	}

	.lumi-slider--primary {
		--slider-color: var(--lumi-color-primary);
	}
	.lumi-slider--secondary {
		--slider-color: var(--lumi-color-secondary);
	}
	.lumi-slider--success {
		--slider-color: var(--lumi-color-success);
	}
	.lumi-slider--warning {
		--slider-color: var(--lumi-color-warning);
	}
	.lumi-slider--danger {
		--slider-color: var(--lumi-color-danger);
	}
	.lumi-slider--info {
		--slider-color: var(--lumi-color-info);
	}

	/* Disabled state */
	.lumi-slider--disabled {
		opacity: 0.5;
		pointer-events: none;
		cursor: not-allowed;
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-slider__fill,
		.lumi-slider__thumb,
		.lumi-slider__tooltip {
			transition: none;
		}
	}
</style>
