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
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: opacity 0.2s ease;
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
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		flex-shrink: 0;
	}

	/* Radio circle (inner dot) */
	.lumi-radio__circle {
		border-radius: 50%;
		background: transparent;
		transform: scale(0);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Label */
	.lumi-radio__label {
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
	}

	/* Sizes */
	.lumi-radio--sm .lumi-radio__visual {
		width: 16px;
		height: 16px;
	}

	.lumi-radio--sm .lumi-radio__circle {
		width: 8px;
		height: 8px;
	}

	.lumi-radio--sm .lumi-radio__label {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-radio--md .lumi-radio__visual {
		width: 20px;
		height: 20px;
	}

	.lumi-radio--md .lumi-radio__circle {
		width: 10px;
		height: 10px;
	}

	.lumi-radio--md .lumi-radio__label {
		font-size: var(--lumi-font-size-base);
	}

	/* Hover effects */
	.lumi-radio:not(.lumi-radio--disabled):hover .lumi-radio__visual {
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-background-hover);
	}

	/* Checked state */
	.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-primary);
	}

	.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-primary);
		transform: scale(1);
	}

	/* Focus styles */
	.lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-primary);
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

	/* Color variants */
	.lumi-radio--secondary:hover .lumi-radio__visual {
		border-color: var(--lumi-color-secondary);
	}
	.lumi-radio--secondary.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-secondary);
	}
	.lumi-radio--secondary.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-secondary);
	}
	.lumi-radio--secondary .lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-secondary);
	}

	.lumi-radio--success:hover .lumi-radio__visual {
		border-color: var(--lumi-color-success);
	}
	.lumi-radio--success.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-success);
	}
	.lumi-radio--success.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-success);
	}
	.lumi-radio--success .lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-success);
	}

	.lumi-radio--warning:hover .lumi-radio__visual {
		border-color: var(--lumi-color-warning);
	}
	.lumi-radio--warning.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-warning);
	}
	.lumi-radio--warning.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-warning);
	}
	.lumi-radio--warning .lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-warning);
	}

	.lumi-radio--danger:hover .lumi-radio__visual {
		border-color: var(--lumi-color-danger);
	}
	.lumi-radio--danger.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-danger);
	}
	.lumi-radio--danger.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-danger);
	}
	.lumi-radio--danger .lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-danger);
	}

	.lumi-radio--info:hover .lumi-radio__visual {
		border-color: var(--lumi-color-info);
	}
	.lumi-radio--info.lumi-radio--checked .lumi-radio__visual {
		border-color: var(--lumi-color-info);
	}
	.lumi-radio--info.lumi-radio--checked .lumi-radio__circle {
		background: var(--lumi-color-info);
	}
	.lumi-radio--info .lumi-radio__input:focus-visible + .lumi-radio__visual {
		box-shadow: 0 0 0 2px var(--lumi-color-background), 0 0 0 4px var(--lumi-color-info);
	}
</style>
