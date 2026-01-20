<script lang="ts">
	import { Icon } from '../Icon';
	import type { InputProps } from './types';
	import { getIconSize } from '../config';

	let {
		type = 'text',
		name = '',
		value = $bindable(''),
		label = '',
		labelPlaceholder = '',
		placeholder = '',
		icon = '',
		iconAfter = false,
		iconNoBorder = false,
		color = 'primary',
		success = false,
		danger = false,
		warning = false,
		successText = '',
		dangerText = '',
		warningText = '',
		descriptionText = '',
		size = 'md',
		valIconSuccess = 'checkCircle',
		valIconDanger = 'xCircle',
		valIconWarning = 'alertTriangle',
		disabled = false,
		readonly = false,
		required = false,
		class: className = '',
		oninput,
		onfocus,
		onblur,
		'onicon-click': onIconClick
	}: InputProps = $props();

	// Local state
	let isFocused = $state(false);
	let inputElement: HTMLInputElement;
	let internalError = $state('');

	// Computed values
	const inputId = $derived(`lumi-input-${Math.random().toString(36).substring(2, 11)}`);

	const state = $derived.by(() => {
		if (success) return 'success';
		if (danger || internalError) return 'danger';
		if (warning) return 'warning';
		return 'default';
	});

	const activeColor = $derived.by(() => {
		if (state === 'success') return 'success';
		if (state === 'danger') return 'danger';
		if (state === 'warning') return 'warning';
		return color;
	});

	const message = $derived.by(() => {
		if (success && successText) return successText;
		if (danger && dangerText) return dangerText;
		if (warning && warningText) return warningText;
		if (internalError) return internalError;
		return '';
	});

	const validationIcon = $derived.by(() => {
		if (success) return valIconSuccess;
		if (danger || internalError) return valIconDanger;
		if (warning) return valIconWarning;
		return '';
	});

	const iconSizePx = $derived.by(() => {
		return `${getIconSize(size as 'xs' | 'sm' | 'md' | 'lg' | 'xl')}px`;
	});

	// CSS Variables for dynamic styling
	const styleVars = $derived(() => {
		const colorVar = `var(--lumi-color-${activeColor})`;
		return `--input-color: ${colorVar};`;
	});

	const containerClasses = $derived(() => {
		const classes = ['lumi-input-container', `lumi-input-container--${size}`];
		if (isFocused) classes.push('lumi-input-container--focused');
		if (state !== 'default') classes.push(`lumi-input-container--${state}`);
		if (disabled) classes.push('lumi-input-container--disabled');
		if (className) classes.push(className);
		return classes.join(' ');
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
		// Validation removed from blur - only validates on explicit validate() call
		if (onblur) onblur(event);
	}

	/**
	 * Public validation method
	 * Call this from form submit handlers to validate the input
	 */
	export function validate() {
		if (required && !value) {
			internalError = 'This field is required';
			return false;
		} else if (type === 'email' && value) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const isValid = emailRegex.test(String(value));
			internalError = !isValid ? 'Please enter a valid email address' : '';
			return isValid;
		} else {
			internalError = '';
			return true;
		}
	}

	function handleIconClick(event: MouseEvent) {
		inputElement?.focus();
		if (onIconClick) onIconClick(event);
	}

	export function focus() {
		inputElement?.focus();
	}
	export function blur() {
		inputElement?.blur();
	}
	export function select() {
		inputElement?.select();
	}
</script>

<div class={containerClasses()} style={styleVars()}>
	{#if label && !labelPlaceholder}
		<label for={inputId} class="lumi-input__label">
			{label}
		</label>
	{/if}

	<div class="lumi-input__wrapper">
		<input
			bind:this={inputElement}
			id={inputId}
			{name}
			{type}
			{value}
			{disabled}
			{readonly}
			{required}
			placeholder={labelPlaceholder || placeholder}
			class="lumi-input"
			class:lumi-input--has-icon={!!icon}
			class:lumi-input--icon-after={iconAfter}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
		/>

		{#if icon}
			<button
				type="button"
				class="lumi-input__icon"
				class:lumi-input__icon--after={iconAfter}
				class:lumi-input__icon--no-border={iconNoBorder}
				onclick={handleIconClick}
				tabindex="-1"
			>
				<Icon {icon} size={iconSizePx} />
			</button>
		{/if}

		{#if validationIcon}
			<div class="lumi-input__validation-icon">
				<Icon icon={validationIcon} size={iconSizePx} />
			</div>
		{/if}
	</div>

	{#if message}
		<div class="lumi-input__message lumi-input__message--{state}">
			{message}
		</div>
	{/if}

	{#if descriptionText && !message}
		<div class="lumi-input__description">
			{descriptionText}
		</div>
	{/if}
</div>

<style>
	.lumi-input-container {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
		--input-border: var(--lumi-color-border);
		--input-focus: var(--input-color);
	}

	.lumi-input-container--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	.lumi-input__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: color 0.2s;
	}

	.lumi-input-container--focused .lumi-input__label {
		color: var(--input-focus);
	}

	.lumi-input__wrapper {
		display: flex;
		align-items: center;
		position: relative;
		background: var(--lumi-color-background);
		border: 1px solid var(--input-border);
		border-radius: var(--lumi-radius-md);
		transition: all 0.2s ease;
		overflow: hidden;
	}

	.lumi-input-container--focused .lumi-input__wrapper {
		border-color: var(--input-focus);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--input-focus) 20%, transparent);
	}

	/* State colors */
	.lumi-input-container--success {
		--input-border: var(--lumi-color-success);
	}
	.lumi-input-container--danger {
		--input-border: var(--lumi-color-danger);
	}
	.lumi-input-container--warning {
		--input-border: var(--lumi-color-warning);
	}

	.lumi-input {
		flex: 1;
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		color: var(--lumi-color-text);
		font-family: inherit;
		font-size: var(--lumi-font-size-base);
		padding: var(--lumi-space-sm);
	}

	.lumi-input::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	/* Sizes */
	.lumi-input-container--sm .lumi-input {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}
	.lumi-input-container--md .lumi-input {
		padding: var(--lumi-space-sm);
	}
	.lumi-input-container--lg .lumi-input {
		padding: var(--lumi-space-md);
		font-size: var(--lumi-font-size-lg);
	}
	.lumi-input-container--xl .lumi-input {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-xl);
	}

	/* Icons */
	.lumi-input__icon {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
	}

	.lumi-input__icon:not(.lumi-input__icon--no-border):not(.lumi-input__icon--after) {
		border-right: 1px solid var(--lumi-color-border-light);
	}
	.lumi-input__icon--after:not(.lumi-input__icon--no-border) {
		border-left: 1px solid var(--lumi-color-border-light);
	}

	.lumi-input__icon:hover {
		color: var(--input-focus);
	}

	.lumi-input__validation-icon {
		display: flex;
		align-items: center;
		padding-right: var(--lumi-space-sm);
		color: var(--input-focus);
	}

	/* Messages */
	.lumi-input__message,
	.lumi-input__description {
		font-size: var(--lumi-font-size-xs);
		margin-top: -4px;
	}

	.lumi-input__message {
		color: var(--input-focus);
	}
	.lumi-input__description {
		color: var(--lumi-color-text-muted);
	}
</style>
