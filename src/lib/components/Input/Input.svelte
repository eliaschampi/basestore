<script lang="ts">
	import { Icon } from "../Icon";
	import type { InputProps } from "./types";

	let {
		type = "text",
		name = "",
		value = $bindable(""),
		label = "",
		labelPlaceholder = "",
		placeholder = "",
		autofocus = false,
		icon = "",
		iconAfter = false,
		iconNoBorder = false,
		color = "primary",
		success = false,
		danger = false,
		warning = false,
		successText = "",
		dangerText = "",
		warningText = "",
		descriptionText = "",
		size = "md",
		valIconSuccess = "",
		valIconDanger = "",
		valIconWarning = "",
		disabled = false,
		readonly = false,
		required = false,
		class: className = "",
		oninput,
		onfocus,
		onblur,
		"onicon-click": onIconClick
	}: InputProps = $props();

	// Local state
	let isFocused = $state(false);
	let inputElement: HTMLInputElement;
	let internalError = $state("");

	// Computed values
	const inputId = $derived(`lumi-input-${Math.random().toString(36).substring(2, 11)}`);

	const validationState = $derived(() => {
		if (success) return "success";
		if (danger) return "danger";
		if (warning) return "warning";
		if (internalError) return "danger";
		return null;
	});

	const validationMessage = $derived(() => {
		if (success && successText) return successText;
		if (danger && dangerText) return dangerText;
		if (warning && warningText) return warningText;
		if (internalError) return internalError;
		return null;
	});

	const validationIcon = $derived(() => {
		if (success) return valIconSuccess || "checkCircle";
		if (danger) return valIconDanger || "xCircle";
		if (warning) return valIconWarning || "alertTriangle";
		return null;
	});

	const iconSize = $derived(() => {
		switch (size) {
			case "sm":
				return "16px";
			case "lg":
				return "20px";
			case "xl":
				return "24px";
			default:
				return "18px"; // md
		}
	});

	const containerClasses = $derived(() => {
		const classes = ["lumi-input-container", `lumi-input-container--${size}`];

		if (isFocused) classes.push("lumi-input-container--focused");
		if (success) classes.push("lumi-input-container--success");
		if (danger) classes.push("lumi-input-container--danger");
		if (warning) classes.push("lumi-input-container--warning");
		if (disabled) classes.push("lumi-input-container--disabled");
		if (className) classes.push(className);

		return classes.join(" ");
	});

	const inputClasses = $derived(() => {
		const classes = ["lumi-input", `lumi-input--${size}`, `lumi-input--${color}`];

		if (icon) classes.push("lumi-input--has-icon");
		if (iconAfter) classes.push("lumi-input--icon-after");

		return classes.join(" ");
	});

	const iconClasses = $derived(() => {
		const classes = ["lumi-input__icon"];

		if (iconAfter) classes.push("lumi-input__icon--after");
		if (iconNoBorder) classes.push("lumi-input__icon--no-border");

		return classes.join(" ");
	});

	// Event handlers
	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		if (oninput) oninput(event);
	}

	function handleFocus(event: FocusEvent) {
		isFocused = true;
		if (onfocus) onfocus(event);
	}

	function handleBlur(event: FocusEvent) {
		isFocused = false;
		
		// Validate on blur
		if (required && !value) {
			internalError = "This field is required";
		} else if (type === "email" && value) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(String(value))) {
				internalError = "Please enter a valid email address";
			} else {
				internalError = "";
			}
		} else {
			internalError = "";
		}
		
		if (onblur) onblur(event);
	}

	function handleIconClick(event: MouseEvent) {
		focusInput();
		if (onIconClick) onIconClick(event);
	}

	function focusInput() {
		inputElement?.focus();
	}

	// Handle keyboard events for icon
	function handleIconKeyDown(event: KeyboardEvent) {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			handleIconClick(event as unknown as MouseEvent);
		}
	}

	// Expose methods
	export function focus() {
		focusInput();
	}

	export function blur() {
		inputElement?.blur();
	}

	export function select() {
		inputElement?.select();
	}
</script>

<div class={containerClasses()}>
	<!-- Label -->
	{#if label && !labelPlaceholder}
		<label for={inputId} class="lumi-input__label">
			{label}
		</label>
	{/if}

	<!-- Input Container -->
	<div class="lumi-input__wrapper">
		<!-- Input Element -->
		<input
			bind:this={inputElement}
			id={inputId}
			name={name}
			{type}
			{value}
			{disabled}
			{readonly}
			{required}
			{autofocus}
			placeholder={labelPlaceholder || placeholder}
			class={inputClasses()}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
		/>

		<!-- Icon -->
		{#if icon}
			<button
				type="button"
				class={iconClasses()}
				onclick={handleIconClick}
				onkeydown={handleIconKeyDown}
				tabindex="0"
				aria-label="Icon action"
			>
				<Icon {icon} size={iconSize()} />
			</button>
		{/if}

		<!-- Validation Icon -->
		{#if validationState() && validationIcon()}
			<div class="lumi-input__validation-icon lumi-input__validation-icon--{validationState()}">
				<Icon icon={validationIcon() || ""} size={iconSize()} />
			</div>
		{/if}
	</div>

	<!-- Validation Messages -->
	{#if validationMessage()}
		<div class="lumi-input__validation-message">
			<span class="lumi-input__validation-text lumi-input__validation-text--{validationState()}">
				{validationMessage()}
			</span>
		</div>
	{/if}

	<!-- Description Text -->
	{#if descriptionText}
		<div class="lumi-input__description">
			<span class="lumi-input__description-text">{descriptionText}</span>
		</div>
	{/if}
</div>

<style>
	/* ============================================================================
	   INPUT COMPONENT - Clean and consistent design (Lumi UI Design System)
	   ============================================================================ */

	.lumi-input-container {
		/* Base container styles */
		position: relative;
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
	}

	/* State variants */
	.lumi-input-container--focused .lumi-input__label {
		color: var(--lumi-color-primary);
	}

	.lumi-input-container--success .lumi-input__wrapper {
		border-color: var(--lumi-color-success);
	}

	.lumi-input-container--success .lumi-input__wrapper:focus-within {
		border-color: var(--lumi-color-success);
	}

	.lumi-input-container--success .lumi-input__label {
		color: var(--lumi-color-success);
	}

	.lumi-input-container--danger .lumi-input__wrapper {
		border-color: var(--lumi-color-danger);
	}

	.lumi-input-container--danger .lumi-input__wrapper:focus-within {
		border-color: var(--lumi-color-danger);
	}

	.lumi-input-container--danger .lumi-input__label {
		color: var(--lumi-color-danger);
	}

	.lumi-input-container--warning .lumi-input__wrapper {
		border-color: var(--lumi-color-warning);
	}

	.lumi-input-container--warning .lumi-input__wrapper:focus-within {
		border-color: var(--lumi-color-warning);
	}

	.lumi-input-container--warning .lumi-input__label {
		color: var(--lumi-color-warning);
	}

	.lumi-input-container--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.lumi-input-container--disabled .lumi-input__wrapper {
		cursor: not-allowed;
	}

	/* Input label */
	.lumi-input__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: color var(--lumi-transition-colors);
	}

	.lumi-input__label:hover {
		color: var(--lumi-color-primary);
	}

	/* Input wrapper */
	.lumi-input__wrapper {
		display: flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		background: var(--lumi-color-background);
		border: 2px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		transition: var(--lumi-transition-all);
		overflow: hidden;
	}

	.lumi-input__wrapper:focus-within {
		border-color: var(--lumi-color-primary);
		transform: translateY(-1px);
	}

	/* Input element */
	.lumi-input {
		flex: 1;
		padding: var(--lumi-space-sm);
		font-family: var(--lumi-font-family-sans);
		font-size: var(--lumi-font-size-base);
		background: transparent;
		border: none;
		outline: none;
		color: var(--lumi-color-text);
	}

	/* Size variants */
	.lumi-input--sm {
		padding: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-input--md {
		padding: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-input--lg {
		padding: var(--lumi-space-md);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-input--xl {
		padding: var(--lumi-space-md);
		font-size: var(--lumi-font-size-xl);
	}

	/* Disabled state */
	.lumi-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Placeholder */
	.lumi-input::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	/* Input icon */
	.lumi-input__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-xs);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		flex-shrink: 0;
		background: transparent;
		border: none;
		outline: none;
		font: inherit;
	}

	.lumi-input__icon:not(.lumi-input__icon--after) {
		border-right: 1px solid var(--lumi-color-border);
	}

	.lumi-input__icon--after {
		border-left: 1px solid var(--lumi-color-border);
	}

	.lumi-input__icon--no-border {
		border-right: none !important;
		border-left: none !important;
	}

	.lumi-input__icon:hover {
		color: var(--lumi-color-primary);
		transform: scale(1.1);
	}

	.lumi-input__icon:focus-visible {
		outline: 2px solid var(--lumi-color-primary);
		outline-offset: 2px;
		border-radius: var(--lumi-radius-sm);
	}

	/* Validation icon */
	.lumi-input__validation-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-xs);
		border-radius: var(--lumi-radius-full);
		flex-shrink: 0;
	}

	.lumi-input__validation-icon--success {
		background: color-mix(in srgb, var(--lumi-color-success) 10%, transparent);
		color: var(--lumi-color-success);
	}

	.lumi-input__validation-icon--danger {
		background: color-mix(in srgb, var(--lumi-color-danger) 10%, transparent);
		color: var(--lumi-color-danger);
	}

	.lumi-input__validation-icon--warning {
		background: color-mix(in srgb, var(--lumi-color-warning) 10%, transparent);
		color: var(--lumi-color-warning);
	}

	/* Validation message */
	.lumi-input__validation-message {
		margin-top: 0;
	}

	.lumi-input__validation-text {
		font-size: var(--lumi-font-size-xs);
		font-weight: var(--lumi-font-weight-normal);
	}

	.lumi-input__validation-text--success {
		color: var(--lumi-color-success);
	}

	.lumi-input__validation-text--danger {
		color: var(--lumi-color-danger);
	}

	.lumi-input__validation-text--warning {
		color: var(--lumi-color-warning);
	}

	/* Description text */
	.lumi-input__description {
		margin-top: 0;
	}

	.lumi-input__description-text {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		line-height: 1.5;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.lumi-input--lg,
		.lumi-input--xl {
			padding: var(--lumi-space-sm);
			font-size: var(--lumi-font-size-base);
		}
	}
</style>
