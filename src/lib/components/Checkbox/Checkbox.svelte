<script lang="ts">
	import type { CheckboxProps } from './types';

	let {
		checked = $bindable(false),
		indeterminate = $bindable(false),
		label = '',
		size = 'md',
		color = 'primary',
		disabled = false,
		class: className = '',
		children,
		onchange
	}: CheckboxProps = $props();

	// Generate unique ID
	const checkboxId = `lumi-checkbox-${Math.random().toString(36).substring(2, 11)}`;

	// Computed classes
	const classes = $derived(() => {
		return [
			'lumi-checkbox',
			`lumi-checkbox--${size}`,
			`lumi-checkbox--${color}`,
			(checked || indeterminate) && 'lumi-checkbox--checked',
			disabled && 'lumi-checkbox--disabled',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	// Handle change event
	const handleChange = (event: Event) => {
		if (disabled) return;
		const target = event.target as HTMLInputElement;
		checked = target.checked;
		indeterminate = false; // Reset indeterminate on user interaction
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
		bind:indeterminate
	/>

	<!-- Visual checkbox -->
	<div class="lumi-checkbox__visual">
		{#if indeterminate}
			<svg
				class="lumi-checkbox__icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
		{:else if checked}
			<svg
				class="lumi-checkbox__icon"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="20 6 9 17 4 12"></polyline>
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
		gap: var(--lumi-space-sm);
		cursor: pointer;
		user-select: none;
		font-family: var(--lumi-font-family-sans);
		transition: opacity 0.2s ease;
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
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		flex-shrink: 0;
		overflow: hidden;
	}

	/* Check mark icon */
	.lumi-checkbox__icon {
		color: var(--lumi-color-white);
		width: 100%;
		height: 100%;
		padding: 2px;
		opacity: 0;
		transform: scale(0.5);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Label */
	.lumi-checkbox__label {
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		font-weight: var(--lumi-font-weight-medium);
		line-height: var(--lumi-line-height-tight);
		cursor: pointer;
	}

	/* Sizes */
	.lumi-checkbox--sm .lumi-checkbox__visual {
		width: 16px;
		height: 16px;
		border-radius: var(--lumi-radius-sm);
	}

	.lumi-checkbox--sm .lumi-checkbox__label {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-checkbox--md .lumi-checkbox__visual {
		width: 20px;
		height: 20px;
	}

	.lumi-checkbox--md .lumi-checkbox__label {
		font-size: var(--lumi-font-size-base);
	}

	/* Hover effects */
	.lumi-checkbox:not(.lumi-checkbox--disabled):hover .lumi-checkbox__visual {
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-background-hover);
	}

	/* Checked / Indeterminate state */
	.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-primary);
		border-color: var(--lumi-color-primary);
	}

	.lumi-checkbox--checked .lumi-checkbox__icon {
		opacity: 1;
		transform: scale(1);
	}

	/* Focus styles */
	.lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-primary);
	}

	/* Disabled state */
	.lumi-checkbox--disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}

	.lumi-checkbox--disabled .lumi-checkbox__visual {
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-checkbox--disabled.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-border);
		border-color: var(--lumi-color-border);
	}

	/* Color variants */
	.lumi-checkbox--secondary.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-secondary);
		border-color: var(--lumi-color-secondary);
	}
	.lumi-checkbox--secondary .lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-secondary);
	}

	.lumi-checkbox--success.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-success);
		border-color: var(--lumi-color-success);
	}
	.lumi-checkbox--success .lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-success);
	}

	.lumi-checkbox--warning.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-warning);
		border-color: var(--lumi-color-warning);
	}
	.lumi-checkbox--warning .lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-warning);
	}

	.lumi-checkbox--danger.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-danger);
		border-color: var(--lumi-color-danger);
	}
	.lumi-checkbox--danger .lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-danger);
	}

	.lumi-checkbox--info.lumi-checkbox--checked .lumi-checkbox__visual {
		background: var(--lumi-color-info);
		border-color: var(--lumi-color-info);
	}
	.lumi-checkbox--info .lumi-checkbox__input:focus-visible + .lumi-checkbox__visual {
		box-shadow:
			0 0 0 2px var(--lumi-color-background),
			0 0 0 4px var(--lumi-color-info);
	}

	/* Animation for checkmark */
	@keyframes check-draw {
		from {
			stroke-dasharray: 0 100;
		}
		to {
			stroke-dasharray: 100 0;
		}
	}

	.lumi-checkbox--checked .lumi-checkbox__icon polyline {
		animation: check-draw 0.2s ease forwards;
	}
</style>
