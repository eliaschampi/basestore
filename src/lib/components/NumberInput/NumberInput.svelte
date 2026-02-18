<script lang="ts">
	import type { NumberInputProps } from './types';

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		label = '',
		placeholder = '',
		color = 'primary',
		size = 'md',
		disabled = false,
		class: className = '',
		onchange
	}: NumberInputProps = $props();

	const inputId = `lumi-number-${crypto.randomUUID().slice(0, 8)}`;
	const labelId = `${inputId}-label`;
	const styleVars = $derived(`--input-accent: var(--lumi-color-${color});`);

	const classes = $derived(
		[
			'lumi-number-input',
			`lumi-number-input--${size}`,
			disabled && 'lumi-number-input--disabled',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	function clamp(val: number): number {
		let v = val;
		if (min !== undefined) v = Math.max(min, v);
		if (max !== undefined) v = Math.min(max, v);
		// Snap to step
		return min + Math.round((v - min) / step) * step;
	}

	function increment(): void {
		if (disabled) return;
		const newVal = clamp((value ?? 0) + step);
		if (newVal !== value) {
			value = newVal;
			onchange?.(value);
		}
	}

	function decrement(): void {
		if (disabled) return;
		const newVal = clamp((value ?? 0) - step);
		if (newVal !== value) {
			value = newVal;
			onchange?.(value);
		}
	}

	function handleBlur(): void {
		if (value === null || isNaN(value)) value = min;
		value = clamp(value);
		onchange?.(value);
	}

	function handleKeyDown(e: KeyboardEvent): void {
		if (disabled) return;
		if (e.key === 'ArrowUp') {
			e.preventDefault();
			increment();
		} else if (e.key === 'ArrowDown') {
			e.preventDefault();
			decrement();
		}
	}
</script>

<div class={classes} style={styleVars}>
	{#if label}
		<label id={labelId} class="lumi-number-input__label" for={inputId}>{label}</label>
	{/if}

	<div class="lumi-number-input__wrapper">
		<input
			id={inputId}
			type="number"
			bind:value
			{min}
			{max}
			{step}
			{placeholder}
			{disabled}
			onblur={handleBlur}
			onkeydown={handleKeyDown}
			class="lumi-number-input__field"
			aria-labelledby={label ? labelId : undefined}
		/>

		<div class="lumi-number-input__steppers">
			<button
				type="button"
				class="lumi-number-input__btn lumi-number-input__btn--up"
				onclick={increment}
				disabled={disabled || (max !== undefined && value >= max)}
				aria-label="Increase"
			>
				+
			</button>
			<button
				type="button"
				class="lumi-number-input__btn lumi-number-input__btn--down"
				onclick={decrement}
				disabled={disabled || (min !== undefined && value <= min)}
				aria-label="Decrease"
			>
				−
			</button>
		</div>
	</div>
</div>

<style>
	/* ============================================================
	   LUMI NUMBER INPUT — 2026 Futuristic Edition
	   Ultra-light • Zero hard-coded values • Pure token-driven
	   ============================================================ */

	.lumi-number-input {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;

		--input-accent: var(--lumi-color-primary);
	}

	.lumi-number-input__label {
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		letter-spacing: 0.01em;
	}

	/* Glass + depth wrapper */
	.lumi-number-input__wrapper {
		position: relative;
		display: flex;
		align-items: stretch;
		background: var(--lumi-color-surface);
		border: var(--lumi-border-width-base) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-xl);
		overflow: hidden;
		box-shadow: var(--lumi-shadow-sm);
		transition: var(--lumi-transition-all);
	}

	.lumi-number-input__wrapper:focus-within {
		border-color: var(--input-accent);
		box-shadow:
			var(--lumi-shadow-lg),
			0 0 0 5px color-mix(in srgb, var(--input-accent) 22%, transparent);
		transform: translateY(-1px);
	}

	/* Clean mono number field */
	.lumi-number-input__field {
		flex: 1;
		padding: 0 var(--lumi-space-lg);
		height: var(--lumi-control-height-md);
		background: transparent;
		border: none;
		font-family: var(--lumi-font-family-mono);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-semibold);
		color: var(--lumi-color-text);
		text-align: center;
		outline: none;
	}

	.lumi-number-input__field::placeholder {
		color: var(--lumi-color-text-light);
		opacity: 0.65;
	}

	/* Futuristic vertical stepper */
	.lumi-number-input__steppers {
		display: flex;
		flex-direction: column;
		width: 34px;
		border-left: 1px solid var(--lumi-color-border);
		background: color-mix(in srgb, var(--lumi-color-surface), transparent 40%);
	}

	.lumi-number-input__btn {
		flex: 1;
		background: transparent;
		border: none;
		color: var(--lumi-color-text-muted);
		font-size: 17px;
		font-weight: var(--lumi-font-weight-bold);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		display: grid;
		place-items: center;
	}

	.lumi-number-input__btn:hover:not(:disabled) {
		color: var(--input-accent);
		background: color-mix(in srgb, var(--input-accent) 12%, transparent);
	}

	.lumi-number-input__btn:active:not(:disabled) {
		transform: scale(0.88);
		background: color-mix(in srgb, var(--input-accent) 22%, transparent);
	}

	.lumi-number-input__btn--up {
		border-bottom: 1px solid var(--lumi-color-border);
	}

	/* Size variants (token-perfect) */
	.lumi-number-input--sm .lumi-number-input__field {
		height: var(--lumi-control-height-sm);
		font-size: var(--lumi-font-size-sm);
		padding: 0 var(--lumi-space-md);
	}

	.lumi-number-input--sm .lumi-number-input__steppers {
		width: 28px;
	}

	.lumi-number-input--lg .lumi-number-input__field {
		height: var(--lumi-control-height-lg);
		font-size: var(--lumi-font-size-lg);
		padding: 0 var(--lumi-space-xl);
	}

	.lumi-number-input--lg .lumi-number-input__steppers {
		width: 38px;
	}

	/* Disabled */
	.lumi-number-input--disabled {
		opacity: 0.48;
		pointer-events: none;
	}

	/* Hide native spinners */
	.lumi-number-input__field::-webkit-inner-spin-button,
	.lumi-number-input__field::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}

	/* Reduced motion */
	@media (prefers-reduced-motion: reduce) {
		.lumi-number-input__wrapper,
		.lumi-number-input__btn {
			transition: none;
		}
	}
</style>
