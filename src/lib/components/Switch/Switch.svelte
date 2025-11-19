<script lang="ts">
	import type { SwitchProps } from './types';

	let {
		checked = $bindable(false),
		label = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange
	}: SwitchProps = $props();

	const switchId = `lumi-switch-${Math.random().toString(36).substring(2, 11)}`;

	const classes = $derived(
		[
			'lumi-switch',
			`lumi-switch--${size}`,
			`lumi-switch--${color}`,
			checked && 'lumi-switch--checked',
			disabled && 'lumi-switch--disabled',
			className
		]
			.filter(Boolean)
			.join(' ')
	);

	const handleChange = (event: Event) => {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		checked = target.checked;
		onchange?.(checked, event);
	};
</script>

<label for={switchId} class={classes}>
	<input
		id={switchId}
		type="checkbox"
		{checked}
		{disabled}
		class="lumi-switch__input"
		onchange={handleChange}
	/>

	<div class="lumi-switch__track">
		<div class="lumi-switch__thumb"></div>
	</div>

	{#if label || children}
		<span class="lumi-switch__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	/* ============================================================================
	 * SWITCH COMPONENT - Modern Toggle Switch
	 * ============================================================================ */

	.lumi-switch {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: opacity 0.2s ease;
	}

	.lumi-switch__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	.lumi-switch__track {
		position: relative;
		width: 2.75rem;
		height: 1.5rem;
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-full);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		flex-shrink: 0;
	}

	.lumi-switch__thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: calc(1.5rem - 4px);
		height: calc(1.5rem - 4px);
		background: var(--lumi-color-white);
		border-radius: var(--lumi-radius-full);
		box-shadow: var(--lumi-shadow-sm);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.lumi-switch__label {
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		cursor: pointer;
	}

	/* Size variants */
	.lumi-switch--sm .lumi-switch__track {
		width: 2.25rem;
		height: 1.25rem;
	}

	.lumi-switch--sm .lumi-switch__thumb {
		width: calc(1.25rem - 4px);
		height: calc(1.25rem - 4px);
	}

	.lumi-switch--sm .lumi-switch__label {
		font-size: var(--lumi-font-size-xs);
	}

	.lumi-switch--md .lumi-switch__track {
		width: 2.75rem;
		height: 1.5rem;
	}

	.lumi-switch--md .lumi-switch__thumb {
		width: calc(1.5rem - 4px);
		height: calc(1.5rem - 4px);
	}

	.lumi-switch--md .lumi-switch__label {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-switch--lg .lumi-switch__track {
		width: 3.25rem;
		height: 1.75rem;
	}

	.lumi-switch--lg .lumi-switch__thumb {
		width: calc(1.75rem - 4px);
		height: calc(1.75rem - 4px);
	}

	.lumi-switch--lg .lumi-switch__label {
		font-size: var(--lumi-font-size-base);
	}

	/* Checked state */
	.lumi-switch--checked .lumi-switch__thumb {
		transform: translateX(1.25rem);
	}

	.lumi-switch--sm.lumi-switch--checked .lumi-switch__thumb {
		transform: translateX(1rem);
	}

	.lumi-switch--lg.lumi-switch--checked .lumi-switch__thumb {
		transform: translateX(1.5rem);
	}

	/* Color variants */
	.lumi-switch--checked.lumi-switch--primary .lumi-switch__track {
		background: var(--lumi-color-primary);
	}

	.lumi-switch--checked.lumi-switch--secondary .lumi-switch__track {
		background: var(--lumi-color-secondary);
	}

	.lumi-switch--checked.lumi-switch--success .lumi-switch__track {
		background: var(--lumi-color-success);
	}

	.lumi-switch--checked.lumi-switch--warning .lumi-switch__track {
		background: var(--lumi-color-warning);
	}

	.lumi-switch--checked.lumi-switch--danger .lumi-switch__track {
		background: var(--lumi-color-danger);
	}

	.lumi-switch--checked.lumi-switch--info .lumi-switch__track {
		background: var(--lumi-color-info);
	}

	/* Hover effects */
	.lumi-switch:not(.lumi-switch--disabled):hover .lumi-switch__track {
		box-shadow: var(--lumi-shadow-sm);
	}

	/* Focus styles */
	.lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-primary);
	}

	.lumi-switch--secondary .lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-secondary);
	}

	.lumi-switch--success .lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-success);
	}

	.lumi-switch--warning .lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-warning);
	}

	.lumi-switch--danger .lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-danger);
	}

	.lumi-switch--info .lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-info);
	}

	/* Disabled state */
	.lumi-switch--disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.lumi-switch--disabled .lumi-switch__track {
		background: var(--lumi-color-border);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-switch__track,
		.lumi-switch__thumb {
			transition: none;
		}
	}
</style>
