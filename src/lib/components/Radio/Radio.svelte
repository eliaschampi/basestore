<script lang="ts">
	import type { RadioProps } from './types';

	let {
		group = $bindable(),
		value,
		label = '',
		name = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange,
		'aria-label': ariaLabel = ''
	}: RadioProps = $props();

	// Generate unique ID
	const radioId = `lumi-radio-${Math.random().toString(36).substring(2, 11)}`;

	// Computed checked state
	const isChecked = $derived(() => group === value);

	// Computed classes
	const classes = $derived(() => {
		return [
			'lumi-radio',
			`lumi-radio--${size}`,
			`lumi-radio--${color}`,
			isChecked() && 'lumi-radio--checked',
			disabled && 'lumi-radio--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	// Handle change event
	const handleChange = (event: Event) => {
		if (!disabled) {
			group = value;
			if (onchange) onchange(value, event);
		}
	};
</script>

<label for={radioId} class={classes()}>
	<!-- Hidden input -->
	<input
		id={radioId}
		type="radio"
		{name}
		{value}
		checked={isChecked()}
		{disabled}
		aria-label={ariaLabel || label || undefined}
		class="lumi-radio__input"
		onchange={handleChange}
	/>

	<!-- Visual radio -->
	<div class="lumi-radio__visual">
		<div class="lumi-radio__circle"></div>
	</div>

	<!-- Label -->
	{#if label || children}
		<span class="lumi-radio__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	.lumi-radio {
		--radio-size: var(--lumi-icon-md);
		--radio-dot-size: var(--lumi-icon-xs);
		--radio-label-size: var(--lumi-font-size-base);
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: var(--lumi-transition-opacity);
	}

	/* Hidden input */
	.lumi-radio__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* Visual radio button */
	.lumi-radio__visual {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--radio-size);
		height: var(--radio-size);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-radius: 50%;
		background: var(--lumi-color-surface);
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
	}

	/* Radio circle (inner dot) */
	.lumi-radio__circle {
		width: var(--radio-dot-size);
		height: var(--radio-dot-size);
		border-radius: 50%;
		background: transparent;
		transform: scale(0);
		transition: var(--lumi-transition-all);
	}

	/* Label */
	.lumi-radio__label {
		color: var(--lumi-color-text);
		font-size: var(--radio-label-size);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
	}

	/* Sizes */
	.lumi-radio--sm {
		--radio-size: var(--lumi-icon-sm);
		--radio-dot-size: var(--lumi-space-xs);
		--radio-label-size: var(--lumi-font-size-sm);
	}

	.lumi-radio--md {
		--radio-size: var(--lumi-icon-md);
		--radio-dot-size: var(--lumi-space-sm);
		--radio-label-size: var(--lumi-font-size-base);
	}

	/* Color variants */
	.lumi-radio {
		--radio-color: var(--lumi-color-primary);
	}
	.lumi-radio--secondary {
		--radio-color: var(--lumi-color-secondary);
	}
	.lumi-radio--success {
		--radio-color: var(--lumi-color-success);
	}
	.lumi-radio--warning {
		--radio-color: var(--lumi-color-warning);
	}
	.lumi-radio--danger {
		--radio-color: var(--lumi-color-danger);
	}
	.lumi-radio--info {
		--radio-color: var(--lumi-color-info);
	}

	/* Hover effects */
	.lumi-radio:not(.lumi-radio--disabled):hover .lumi-radio__visual {
		border-color: var(--radio-color);
		background: var(--lumi-color-background-hover);
	}

	.lumi-radio--checked:not(.lumi-radio--disabled):hover .lumi-radio__visual {
		background: var(--lumi-color-surface);
	}

	/* Checked state */
	.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--radio-color);
	}

	.lumi-radio--checked .lumi-radio__circle {
		background: var(--radio-color);
		transform: scale(1);
	}

	/* Focus styles */
	.lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) var(--lumi-color-background),
			0 0 0 calc(var(--lumi-border-width-thick) * 2) var(--radio-color);
	}

	/* Disabled state */
	.lumi-radio--disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.lumi-radio--disabled .lumi-radio__visual {
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-radio--disabled.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-border);
	}

	.lumi-radio--disabled.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-text-muted);
	}
</style>
