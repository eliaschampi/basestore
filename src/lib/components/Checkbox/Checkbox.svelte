<script lang="ts">
	import type { CheckboxProps } from "./types";

	let {
		checked = $bindable(false),
		label = "",
		size = "md",
		color = "primary",
		disabled = false,
		class: className = "",
		children,
		onchange
	}: CheckboxProps = $props();

	// Generate unique ID
	const checkboxId = `lumi-checkbox-${Math.random().toString(36).substring(2, 11)}`;

	// Computed classes
	const classes = $derived(() => {
		return [
			"lumi-checkbox",
			`lumi-checkbox--${size}`,
			`lumi-checkbox--${color}`,
			checked && "lumi-checkbox--checked",
			disabled && "lumi-checkbox--disabled",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	// Handle change event
	const handleChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		checked = target.checked;
		if (onchange) onchange(checked, event);
	};
</script>

<label for={checkboxId} class={classes()}>
	<!-- Hidden input -->
	<input
		id={checkboxId}
		type="checkbox"
		{checked}
		{disabled}
		class="lumi-checkbox__input"
		onchange={handleChange}
	/>

	<!-- Visual checkbox -->
	<div class="lumi-checkbox__visual">
		{#if checked}
			<svg
				class="lumi-checkbox__icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="20,6 9,17 4,12"></polyline>
			</svg>
		{/if}
	</div>

	<!-- Label -->
	{#if label || children}
		<span class="lumi-checkbox__label">
			{#if children}
				{@render children()}
			{:else}
				{label}
			{/if}
		</span>
	{/if}
</label>

<style>
	.lumi-checkbox {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: all var(--lumi-transition-base);
	}

	/* Hidden input */
	.lumi-checkbox__input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 0;
		height: 0;
	}

	/* Visual checkbox */
	.lumi-checkbox__visual {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 2px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-md);
		background: var(--lumi-color-surface);
		transition: all var(--lumi-transition-base);
		flex-shrink: 0;
	}

	/* Check mark icon */
	.lumi-checkbox__icon {
		color: var(--lumi-color-white);
		opacity: 0;
		transform: scale(0.5);
		transition: all var(--lumi-transition-base);
	}

	/* Label */
	.lumi-checkbox__label {
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-normal);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
		transition: color var(--lumi-transition-base);
	}

	.lumi-checkbox__label:hover {
		color: var(--lumi-color-primary);
	}

	/* Sizes */
	.lumi-checkbox--sm .lumi-checkbox__visual {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}

	.lumi-checkbox--sm .lumi-checkbox__icon {
		width: var(--lumi-space-xs);
		height: var(--lumi-space-xs);
	}

	.lumi-checkbox--sm .lumi-checkbox__label {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-checkbox--md .lumi-checkbox__visual {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
	}

	.lumi-checkbox--md .lumi-checkbox__icon {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}

	.lumi-checkbox--md .lumi-checkbox__label {
		font-size: var(--lumi-font-size-base);
	}

	/* Hover effects */
	.lumi-checkbox:not(.lumi-checkbox--disabled):hover .lumi-checkbox__visual {
		transform: translateY(-1px);
		box-shadow: var(--lumi-shadow-sm);
	}

	/* Active state */
	.lumi-checkbox:not(.lumi-checkbox--disabled):active .lumi-checkbox__visual {
		transform: translateY(0);
	}

	/* Color variants - Primary */
	.lumi-checkbox--primary:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-primary);
		background: color-mix(in srgb, var(--lumi-color-primary) 10%, transparent);
	}

	.lumi-checkbox--primary.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-primary);
		border-color: var(--lumi-color-primary);
	}

	/* Color variants - Secondary */
	.lumi-checkbox--secondary:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-secondary);
		background: color-mix(in srgb, var(--lumi-color-secondary) 10%, transparent);
	}

	.lumi-checkbox--secondary.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-secondary);
		border-color: var(--lumi-color-secondary);
	}

	/* Color variants - Success */
	.lumi-checkbox--success:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-success);
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
	}

	.lumi-checkbox--success.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-success);
		border-color: var(--lumi-color-success);
	}

	/* Color variants - Warning */
	.lumi-checkbox--warning:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-warning);
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
	}

	.lumi-checkbox--warning.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-warning);
		border-color: var(--lumi-color-warning);
	}

	/* Color variants - Danger */
	.lumi-checkbox--danger:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-danger);
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
	}

	.lumi-checkbox--danger.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-danger);
		border-color: var(--lumi-color-danger);
	}

	/* Color variants - Info */
	.lumi-checkbox--info:hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-info);
		background: color-mix(in srgb, var(--lumi-color-info) 10%, transparent);
	}

	.lumi-checkbox--info.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-info);
		border-color: var(--lumi-color-info);
	}

	/* Checked state */
	.lumi-checkbox--checked .lumi-checkbox__icon {
		opacity: 1;
		transform: scale(1);
	}

	/* Disabled state */
	.lumi-checkbox--disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.lumi-checkbox--disabled .lumi-checkbox__visual {
		cursor: not-allowed;
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-checkbox--disabled .lumi-checkbox__visual:hover {
		border-color: var(--lumi-color-border);
		background: var(--lumi-color-background-secondary);
	}

	.lumi-checkbox--disabled .lumi-checkbox__label {
		cursor: not-allowed;
		color: var(--lumi-color-text-muted);
	}

	.lumi-checkbox--disabled .lumi-checkbox__label:hover {
		color: var(--lumi-color-text-muted);
	}

	/* Focus styles */
	.lumi-checkbox:focus-within .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-primary);
	}

	/* Reduced motion support */
	@media (prefers-reduced-motion: reduce) {
		.lumi-checkbox,
		.lumi-checkbox__visual,
		.lumi-checkbox__icon,
		.lumi-checkbox__label {
			transition: none;
		}
	}
</style>
