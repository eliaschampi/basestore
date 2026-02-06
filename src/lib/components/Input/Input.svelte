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
		iconLabel = '',
		actionIcon = '',
		actionLabel = '',
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
		'aria-label': ariaLabel = '',
		class: className = '',
		oninput,
		onfocus,
		onblur,
		'onicon-click': onIconClick,
		'onaction-click': onActionClick
	}: InputProps = $props();

	// Local state
	let isFocused = $state(false);
	let internalError = $state('');
	let inputElement: HTMLInputElement;

	// Computed values
	const inputId = $derived(`lumi-input-${Math.random().toString(36).substring(2, 11)}`);

	const inputState = $derived.by(() => {
		if (success) return 'success';
		if (danger || internalError) return 'danger';
		if (warning) return 'warning';
		return 'default';
	});

	const activeColor = $derived.by(() => {
		if (inputState === 'success') return 'success';
		if (inputState === 'danger') return 'danger';
		if (inputState === 'warning') return 'warning';
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
		const colorRgbVar = `var(--lumi-color-${activeColor}-rgb)`;
		return `--input-color: ${colorVar}; --input-color-rgb: ${colorRgbVar};`;
	});

	const containerClasses = $derived(() => {
		const classes = ['lumi-input-container', `lumi-input-container--${size}`];
		if (isFocused) classes.push('lumi-input-container--focused');
		if (inputState !== 'default') classes.push(`lumi-input-container--${inputState}`);
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

	function handleActionClick(event: MouseEvent) {
		inputElement?.focus();
		if (onActionClick) onActionClick(event);
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
		{#if icon && !iconAfter}
			<button
				type="button"
				class="lumi-input__icon lumi-input__icon--before"
				class:lumi-input__icon--no-border={iconNoBorder}
				aria-label={iconLabel || 'Input icon'}
				onclick={handleIconClick}
			>
				<Icon {icon} size={iconSizePx} />
			</button>
		{/if}

		<input
			bind:this={inputElement}
			id={inputId}
			{name}
			{type}
			{value}
			{disabled}
			{readonly}
			{required}
			aria-label={ariaLabel || label || placeholder || undefined}
			placeholder={labelPlaceholder || placeholder}
			class="lumi-input"
			class:lumi-input--has-prefix={!!(icon && !iconAfter)}
			class:lumi-input--has-suffix={!!(validationIcon || actionIcon || (icon && iconAfter))}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
		/>

		{#if validationIcon || actionIcon || (icon && iconAfter)}
			<div class="lumi-input__suffix">
				{#if validationIcon}
					<div class="lumi-input__validation-icon lumi-input__suffix-item" aria-hidden="true">
						<Icon icon={validationIcon} size={iconSizePx} />
					</div>
				{/if}

				{#if actionIcon}
					<button
						type="button"
						class="lumi-input__action lumi-input__suffix-item"
						aria-label={actionLabel || 'Input action'}
						onclick={handleActionClick}
					>
						<Icon icon={actionIcon} size={iconSizePx} />
					</button>
				{/if}

				{#if icon && iconAfter}
					<button
						type="button"
						class="lumi-input__icon lumi-input__icon--after lumi-input__suffix-item"
						class:lumi-input__icon--no-border={iconNoBorder}
						aria-label={iconLabel || 'Input icon'}
						onclick={handleIconClick}
					>
						<Icon {icon} size={iconSizePx} />
					</button>
				{/if}
			</div>
		{/if}
	</div>

	{#if message}
		<div class="lumi-input__message lumi-input__message--{inputState}">
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
		transition: var(--lumi-transition-colors);
	}

	.lumi-input-container--focused .lumi-input__label {
		color: var(--input-focus);
	}

	.lumi-input__wrapper {
		display: flex;
		align-items: center;
		position: relative;
		background: var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--input-border);
		border-radius: var(--lumi-radius-md);
		transition: var(--lumi-transition-all);
		overflow: hidden;
	}

	.lumi-input__suffix {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding-right: var(--lumi-space-sm);
		flex-shrink: 0;
	}

	.lumi-input__suffix-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.lumi-input-container--focused .lumi-input__wrapper {
		border-color: var(--input-focus);
		box-shadow:
			0 0 0 var(--lumi-border-width-thick) color-mix(in srgb, var(--input-focus) 22%, transparent);
	}

	.lumi-input-container--focused .lumi-input__icon,
	.lumi-input-container--focused .lumi-input__action {
		color: var(--input-focus);
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
		line-height: var(--lumi-line-height-normal);
		padding: var(--lumi-space-sm);
	}

	.lumi-input--has-prefix {
		padding-left: var(--lumi-space-2xs);
	}

	.lumi-input--has-suffix {
		padding-right: var(--lumi-space-2xs);
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

	.lumi-input-container--sm .lumi-input__icon,
	.lumi-input-container--sm .lumi-input__action {
		padding: 0 var(--lumi-space-xs);
	}

	.lumi-input-container--lg .lumi-input__icon,
	.lumi-input-container--lg .lumi-input__action {
		padding: 0 var(--lumi-space-md);
	}

	.lumi-input-container--xl .lumi-input__icon,
	.lumi-input-container--xl .lumi-input__action {
		padding: 0 var(--lumi-space-lg);
	}

	/* Icons */
	.lumi-input__icon,
	.lumi-input__action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0 var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		transition: var(--lumi-transition-colors);
		flex-shrink: 0;
	}

	.lumi-input__icon:focus-visible,
	.lumi-input__action:focus-visible {
		outline: var(--lumi-border-width-thick) solid color-mix(in srgb, var(--input-focus) 35%, transparent);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-input__icon--before:not(.lumi-input__icon--no-border) {
		border-right: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.lumi-input__icon--after:not(.lumi-input__icon--no-border) {
		border-left: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	.lumi-input__icon:hover,
	.lumi-input__action:hover {
		color: var(--input-focus);
	}

	.lumi-input__validation-icon {
		display: inline-flex;
		align-items: center;
		color: var(--input-focus);
	}

	/* Messages */
	.lumi-input__message,
	.lumi-input__description {
		font-size: var(--lumi-font-size-xs);
		margin-top: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-input__message {
		color: var(--input-focus);
	}
	.lumi-input__description {
		color: var(--lumi-color-text-muted);
	}
</style>
