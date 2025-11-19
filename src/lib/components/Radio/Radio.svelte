<script lang="ts">
	import type { RadioProps } from "./types";

	let {
		group = $bindable(),
		value,
		label = "",
		name = "",
		size = "md",
		color = "primary",
		disabled = false,
		class: className = "",
		children,
		onchange
	}: RadioProps = $props();

	// Generate unique ID
	const radioId = `lumi-radio-${Math.random().toString(36).substring(2, 11)}`;

	// Computed checked state
	const isChecked = $derived(() => group === value);

	// Computed classes
	const classes = $derived(() => {
		return [
			"lumi-radio",
			`lumi-radio--${size}`,
			`lumi-radio--${color}`,
			isChecked() && "lumi-radio--checked",
			disabled && "lumi-radio--disabled",
			className
		]
			.filter(Boolean)
			.join(" ");
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
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		cursor: pointer;
		user-select: none;
		font-family: inherit;
		transition: all var(--lumi-transition-base);
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
		border: 2px solid var(--lumi-color-border);
		border-radius: 50%;
		background: var(--lumi-color-surface);
		transition: all var(--lumi-transition-base);
		flex-shrink: 0;
	}

	.lumi-radio__visual:hover {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	/* Radio circle (inner dot) */
	.lumi-radio__circle {
		border-radius: 50%;
		background: transparent;
		transform: scale(0);
		transition: all var(--lumi-transition-base);
	}

	/* Label */
	.lumi-radio__label {
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-normal);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
		transition: color var(--lumi-transition-base);
	}

	.lumi-radio__label:hover {
		color: var(--lumi-color-primary);
	}

	/* Sizes */
	.lumi-radio--sm .lumi-radio__visual {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}

	.lumi-radio--sm .lumi-radio__circle {
		width: var(--lumi-space-xs);
		height: var(--lumi-space-xs);
	}

	.lumi-radio--sm .lumi-radio__label {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-radio--md .lumi-radio__visual {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
	}

	.lumi-radio--md .lumi-radio__circle {
		width: var(--lumi-space-sm);
		height: var(--lumi-space-sm);
	}

	.lumi-radio--md .lumi-radio__label {
		font-size: var(--lumi-font-size-base);
	}

	/* Color variants - Primary */
	.lumi-radio--primary:hover .lumi-radio__visual {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	.lumi-radio--primary.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	.lumi-radio--primary.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-primary);
		transform: scale(1);
	}

	/* Color variants - Secondary */
	.lumi-radio--secondary:hover .lumi-radio__visual {
		border-color: var(--lumi-color-secondary);
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
	}

	.lumi-radio--secondary.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-secondary);
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
	}

	.lumi-radio--secondary.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-secondary);
		transform: scale(1);
	}

	/* Color variants - Success */
	.lumi-radio--success:hover .lumi-radio__visual {
		border-color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
	}

	.lumi-radio--success.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
	}

	.lumi-radio--success.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-success);
		transform: scale(1);
	}

	/* Color variants - Warning */
	.lumi-radio--warning:hover .lumi-radio__visual {
		border-color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
	}

	.lumi-radio--warning.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
	}

	.lumi-radio--warning.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-warning);
		transform: scale(1);
	}

	/* Color variants - Danger */
	.lumi-radio--danger:hover .lumi-radio__visual {
		border-color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}

	.lumi-radio--danger.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}

	.lumi-radio--danger.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-danger);
		transform: scale(1);
	}

	/* Color variants - Info */
	.lumi-radio--info:hover .lumi-radio__visual {
		border-color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 10%, transparent);
	}

	.lumi-radio--info.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 10%, transparent);
	}

	.lumi-radio--info.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-info);
		transform: scale(1);
	}

	/* Disabled state */
	.lumi-radio--disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.lumi-radio--disabled .lumi-radio__visual {
		cursor: not-allowed;
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-radio--disabled .lumi-radio__visual:hover {
		border-color: var(--lumi-color-border);
		background: var(--lumi-color-background-secondary);
	}

	.lumi-radio--disabled .lumi-radio__label {
		cursor: not-allowed;
		color: var(--lumi-color-text-muted);
	}

	.lumi-radio--disabled .lumi-radio__label:hover {
		color: var(--lumi-color-text-muted);
	}

	/* Focus styles */
	.lumi-radio:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: var(--lumi-space-xs);
		border-radius: var(--lumi-radius-base);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-radio,
		.lumi-radio__visual,
		.lumi-radio__circle,
		.lumi-radio__label {
			transition: none;
		}
	}
</style>
