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

	let trackRef = $state<HTMLDivElement>();
	let isDragging = $state(false);

	const percentage = $derived(() => {
		return ((value - min) / (max - min)) * 100;
	});

	const classes = $derived(() => {
		return [
			'lumi-slider',
			`lumi-slider--${color}`,
			`lumi-slider--${size}`,
			disabled && 'lumi-slider--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	const updateValueFromPosition = (clientX: number) => {
		if (!trackRef) return;

		const rect = trackRef.getBoundingClientRect();
		const clickX = clientX - rect.left;
		const clickPercentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
		const newValue = min + (clickPercentage / 100) * (max - min);
		const steppedValue = Math.round(newValue / step) * step;

		value = Math.max(min, Math.min(max, steppedValue));
	};

	const handleTrackClick = (event: MouseEvent) => {
		if (disabled) return;
		updateValueFromPosition(event.clientX);
		if (onchange) onchange(value);
	};

	const handleKeyDown = (event: KeyboardEvent) => {
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
			if (onchange) onchange(value);
		}
	};

	const startDragging = (event: MouseEvent | TouchEvent) => {
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
			if (onchange) onchange(value);
			document.removeEventListener('mousemove', handleMove);
			document.removeEventListener('mouseup', handleEnd);
			document.removeEventListener('touchmove', handleMove);
			document.removeEventListener('touchend', handleEnd);
		};

		document.addEventListener('mousemove', handleMove);
		document.addEventListener('mouseup', handleEnd);
		document.addEventListener('touchmove', handleMove);
		document.addEventListener('touchend', handleEnd);
	};
</script>

<div class={classes()}>
	{#if label}
		<label id="slider-label-{label}" class="lumi-slider__label">{label}</label>
	{/if}

	<div class="lumi-slider__container">
		<div
			bind:this={trackRef}
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
			aria-label={label || 'Slider'}
			aria-disabled={disabled}
		>
			<div class="lumi-slider__fill" style="width: {percentage()}%"></div>
			<div
				class="lumi-slider__thumb"
				class:lumi-slider__thumb--dragging={isDragging}
				style="left: {percentage()}%"
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
	}

	.lumi-slider__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
	}

	.lumi-slider__container {
		position: relative;
		width: 100%;
	}

	.lumi-slider__track {
		position: relative;
		width: 100%;
		height: 6px;
		background: var(--lumi-color-background-secondary);
		border-radius: var(--lumi-radius-full);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		/* Add padding for easier touch/click targeting */
		padding: 8px 0;
		margin: -8px 0;
		background-clip: content-box;
	}

	.lumi-slider__track:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: 4px;
	}

	.lumi-slider--sm .lumi-slider__track {
		height: 4px;
	}

	.lumi-slider--lg .lumi-slider__track {
		height: 8px;
	}

	.lumi-slider__fill {
		position: absolute;
		top: 8px; /* Offset for padding */
		left: 0;
		height: 6px;
		background: var(--lumi-color-primary);
		border-radius: var(--lumi-radius-full);
		transition: width 0.1s ease;
		pointer-events: none;
	}

	.lumi-slider--sm .lumi-slider__fill {
		height: 4px;
	}

	.lumi-slider--lg .lumi-slider__fill {
		height: 8px;
	}

	/* Color variants */
	.lumi-slider--primary .lumi-slider__fill {
		background: var(--lumi-color-primary);
	}

	.lumi-slider--secondary .lumi-slider__fill {
		background: var(--lumi-color-secondary);
	}

	.lumi-slider--success .lumi-slider__fill {
		background: var(--lumi-color-success);
	}

	.lumi-slider--warning .lumi-slider__fill {
		background: var(--lumi-color-warning);
	}

	.lumi-slider--danger .lumi-slider__fill {
		background: var(--lumi-color-danger);
	}

	.lumi-slider--info .lumi-slider__fill {
		background: var(--lumi-color-info);
	}

	.lumi-slider__thumb {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 16px;
		height: 16px;
		background: var(--lumi-color-surface);
		border: 2px solid var(--lumi-color-primary);
		border-radius: var(--lumi-radius-full);
		transition:
			transform 0.15s ease,
			box-shadow 0.15s ease;
		box-shadow: var(--lumi-shadow-sm);
		z-index: 2;
		pointer-events: none;
	}

	.lumi-slider__track:hover .lumi-slider__thumb {
		transform: translate(-50%, -50%) scale(1.1);
		box-shadow: var(--lumi-shadow-md);
	}

	.lumi-slider__thumb--dragging {
		transform: translate(-50%, -50%) scale(1.2);
		cursor: grabbing;
	}

	.lumi-slider--sm .lumi-slider__thumb {
		width: 12px;
		height: 12px;
	}

	.lumi-slider--lg .lumi-slider__thumb {
		width: 20px;
		height: 20px;
	}

	/* Color variants for thumb */
	.lumi-slider--primary .lumi-slider__thumb {
		border-color: var(--lumi-color-primary);
	}

	.lumi-slider--secondary .lumi-slider__thumb {
		border-color: var(--lumi-color-secondary);
	}

	.lumi-slider--success .lumi-slider__thumb {
		border-color: var(--lumi-color-success);
	}

	.lumi-slider--warning .lumi-slider__thumb {
		border-color: var(--lumi-color-warning);
	}

	.lumi-slider--danger .lumi-slider__thumb {
		border-color: var(--lumi-color-danger);
	}

	.lumi-slider--info .lumi-slider__thumb {
		border-color: var(--lumi-color-info);
	}

	.lumi-slider__tooltip {
		position: absolute;
		bottom: calc(100% + 8px);
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
		border: 4px solid transparent;
		border-top-color: var(--lumi-color-text);
	}

	.lumi-slider__value {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text-muted);
		text-align: center;
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
