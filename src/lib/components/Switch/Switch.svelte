<script lang="ts">
	import type { SwitchProps } from './types';

	let {
		checked = $bindable(false),
		name = '',
		label = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange,
		'aria-label': ariaLabel = ''
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
		{name}
		{checked}
		{disabled}
		aria-label={ariaLabel || label || undefined}
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
		--switch-track-width: calc(var(--lumi-space-xl) + var(--lumi-space-sm));
		--switch-track-height: var(--lumi-space-lg);
		--switch-thumb-size: calc(var(--switch-track-height) - var(--lumi-space-xs));
		--switch-label-size: var(--lumi-font-size-sm);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: var(--lumi-transition-opacity);
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
		width: var(--switch-track-width);
		height: var(--switch-track-height);
		background:
			linear-gradient(
				180deg,
				var(--lumi-color-border-strong) 0%,
				var(--lumi-color-border) 100%
			);
		border: var(--lumi-border-width-thin) solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
	}

	.lumi-switch__thumb {
		position: absolute;
		top: var(--lumi-space-2xs);
		left: var(--lumi-space-2xs);
		width: var(--switch-thumb-size);
		height: var(--switch-thumb-size);
		background: var(--lumi-color-white);
		border-radius: var(--lumi-radius-full);
		box-shadow: var(--lumi-shadow-sm);
		transition: var(--lumi-transition-all);
	}

	.lumi-switch__label {
		color: var(--lumi-color-text);
		font-size: var(--switch-label-size);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-normal);
		cursor: pointer;
	}

	/* Size variants */
	.lumi-switch--sm {
		--switch-track-width: calc(var(--lumi-space-xl) + var(--lumi-space-xs));
		--switch-track-height: calc(var(--lumi-space-md) + var(--lumi-space-2xs));
		--switch-label-size: var(--lumi-font-size-xs);
	}

	.lumi-switch--md {
		--switch-track-width: calc(var(--lumi-space-xl) + var(--lumi-space-sm));
		--switch-track-height: var(--lumi-space-lg);
		--switch-label-size: var(--lumi-font-size-sm);
	}

	.lumi-switch--lg {
		--switch-track-width: calc(var(--lumi-space-xxl) + var(--lumi-space-sm));
		--switch-track-height: calc(var(--lumi-space-lg) + var(--lumi-space-2xs));
		--switch-label-size: var(--lumi-font-size-base);
	}

	/* Color variants */
	.lumi-switch {
		--switch-color: var(--lumi-color-primary);
	}
	.lumi-switch--secondary {
		--switch-color: var(--lumi-color-secondary);
	}
	.lumi-switch--success {
		--switch-color: var(--lumi-color-success);
	}
	.lumi-switch--warning {
		--switch-color: var(--lumi-color-warning);
	}
	.lumi-switch--danger {
		--switch-color: var(--lumi-color-danger);
	}
	.lumi-switch--info {
		--switch-color: var(--lumi-color-info);
	}

	/* Checked state */
	.lumi-switch--checked .lumi-switch__thumb {
		transform: translateX(
			calc(var(--switch-track-width) - var(--switch-thumb-size) - var(--lumi-space-xs))
		);
	}

	.lumi-switch--checked .lumi-switch__track {
		background:
			linear-gradient(
				135deg,
				var(--switch-color) 0%,
				color-mix(in srgb, var(--switch-color) 80%, var(--lumi-color-surface)) 100%
			);
		border-color: color-mix(in srgb, var(--switch-color) 70%, var(--lumi-color-border));
		box-shadow: 0 0 0 var(--lumi-border-width-thin) color-mix(in srgb, var(--switch-color) 20%, transparent);
	}

	/* Hover effects */
	.lumi-switch:not(.lumi-switch--disabled):hover .lumi-switch__track {
		box-shadow: var(--lumi-shadow-sm);
		border-color: color-mix(in srgb, var(--switch-color) 45%, var(--lumi-color-border));
	}

	/* Focus styles */
	.lumi-switch__input:focus-visible + .lumi-switch__track {
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--switch-color);
	}

	/* Disabled state */
	.lumi-switch--disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.lumi-switch--disabled .lumi-switch__track {
		background: var(--lumi-color-border);
		border-color: var(--lumi-color-border);
	}

	/* Accessibility */
	@media (prefers-reduced-motion: reduce) {
		.lumi-switch__track,
		.lumi-switch__thumb {
			transition: none;
		}
	}
</style>
