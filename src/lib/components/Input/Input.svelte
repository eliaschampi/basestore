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

	let isFocused = $state(false);
	let internalError = $state('');
	let inputElement: HTMLInputElement;

	const inputId = `lumi-input-${crypto.randomUUID().slice(0, 8)}`;

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

	const hasState = $derived(inputState !== 'default');

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

	const iconSizePx = $derived(`${getIconSize(size as 'xs' | 'sm' | 'md' | 'lg' | 'xl')}px`);

	const hasPrefix = $derived(!!(icon && !iconAfter));
	const hasSuffix = $derived(!!(validationIcon || actionIcon || (icon && iconAfter)));

	const styleVars = $derived.by(() => {
		const colorVar = `var(--lumi-color-${activeColor})`;
		const colorRgbVar = `var(--lumi-color-${activeColor}-rgb)`;
		return `--input-color: ${colorVar}; --input-color-rgb: ${colorRgbVar};`;
	});

	const containerClasses = $derived.by(() => {
		const classes = ['lumi-input-container', `lumi-input-container--${size}`];
		if (isFocused) classes.push('lumi-input-container--focused');
		if (hasState) classes.push(`lumi-input-container--${inputState}`);
		if (disabled) classes.push('lumi-input-container--disabled');
		if (className) classes.push(className);
		return classes.join(' ');
	});

	function handleInput(event: Event) {
		const target = event.target as HTMLInputElement;
		value = target.value;
		oninput?.(event);
	}

	function handleFocus(event: FocusEvent) {
		isFocused = true;
		onfocus?.(event);
	}

	function handleBlur(event: FocusEvent) {
		isFocused = false;
		onblur?.(event);
	}

	export function validate() {
		if (required && !value) {
			internalError = 'This field is required';
			return false;
		}
		if (type === 'email' && value) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			const isValid = emailRegex.test(String(value));
			internalError = isValid ? '' : 'Please enter a valid email address';
			return isValid;
		}
		internalError = '';
		return true;
	}

	function handleIconClick(event: MouseEvent) {
		inputElement?.focus();
		onIconClick?.(event);
	}

	function handleActionClick(event: MouseEvent) {
		inputElement?.focus();
		onActionClick?.(event);
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

<div class={containerClasses} style={styleVars}>
	{#if label && !labelPlaceholder}
		<label for={inputId} class="lumi-input__label">
			{label}
		</label>
	{/if}

	<div class="lumi-input__wrapper">
		{#if hasPrefix}
			<button
				type="button"
				class="lumi-input__icon lumi-input__icon--before"
				class:lumi-input__icon--no-border={iconNoBorder}
				aria-label={iconLabel || 'Input icon'}
				tabindex="-1"
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
			aria-invalid={inputState === 'danger' || undefined}
			aria-describedby={message ? `${inputId}-msg` : undefined}
			placeholder={labelPlaceholder || placeholder}
			class="lumi-input"
			class:lumi-input--has-prefix={hasPrefix}
			class:lumi-input--has-suffix={hasSuffix}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
		/>

		{#if hasSuffix}
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
						tabindex="-1"
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
						tabindex="-1"
						onclick={handleIconClick}
					>
						<Icon {icon} size={iconSizePx} />
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div
		id="{inputId}-msg"
		class="lumi-input__footer"
		class:lumi-input__footer--visible={!!(message || (descriptionText && !message))}
		aria-live="polite"
	>
		{#if message}
			<span class="lumi-input__message lumi-input__message--{inputState}">
				{message}
			</span>
		{:else if descriptionText}
			<span class="lumi-input__description">
				{descriptionText}
			</span>
		{/if}
	</div>
</div>

<style>
	.lumi-input-container {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
		--input-border: var(--lumi-color-border);
		--input-focus: var(--input-color);
		--input-bg: color-mix(
			in srgb,
			var(--lumi-color-background-hover) 60%,
			var(--lumi-color-surface) 40%
		);
		--input-bg-focus: color-mix(in srgb, var(--lumi-color-surface) 95%, var(--input-focus) 5%);
	}

	.lumi-input-container--disabled {
		opacity: 0.6;
		pointer-events: none;
	}

	/* ── Label ────────────────────────────────── */
	.lumi-input__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.lumi-input-container--focused .lumi-input__label {
		color: var(--input-focus);
	}

	/* ── Wrapper ──────────────────────────────── */
	.lumi-input__wrapper {
		display: flex;
		align-items: center;
		position: relative;
		background: var(--input-bg);
		border: var(--lumi-border-width-thin) solid var(--input-border);
		border-radius: var(--lumi-radius-md);
		transition:
			border-color 0.2s ease,
			background-color 0.2s ease,
			box-shadow 0.2s ease;
		overflow: hidden;
	}

	.lumi-input-container:not(
			.lumi-input-container--success,
			.lumi-input-container--danger,
			.lumi-input-container--warning
		)
		.lumi-input__wrapper:hover:not(:focus-within) {
		border-color: var(--lumi-color-border-strong);
	}

	.lumi-input-container--focused .lumi-input__wrapper {
		border-color: var(--input-focus);
		background: var(--input-bg-focus);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--input-focus) 22%, transparent);
	}

	/* ── State borders ────────────────────────── */
	.lumi-input-container--success {
		--input-border: var(--lumi-color-success);
	}
	.lumi-input-container--danger {
		--input-border: var(--lumi-color-danger);
	}
	.lumi-input-container--warning {
		--input-border: var(--lumi-color-warning);
	}

	/* ── Input ────────────────────────────────── */
	.lumi-input {
		flex: 1;
		width: 100%;
		min-width: 0;
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
		padding-inline-start: var(--lumi-space-2xs);
	}
	.lumi-input--has-suffix {
		padding-inline-end: var(--lumi-space-2xs);
	}

	.lumi-input::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	.lumi-input:-webkit-autofill,
	.lumi-input:-webkit-autofill:hover,
	.lumi-input:-webkit-autofill:focus {
		-webkit-text-fill-color: var(--lumi-color-text);
		caret-color: var(--lumi-color-text);
		-webkit-box-shadow: 0 0 0 1000px var(--input-bg) inset;
		box-shadow: 0 0 0 1000px var(--input-bg) inset;
		transition: background-color 99999s ease-out 0s;
	}

	.lumi-input-container--focused .lumi-input:-webkit-autofill,
	.lumi-input-container--focused .lumi-input:-webkit-autofill:hover,
	.lumi-input-container--focused .lumi-input:-webkit-autofill:focus {
		-webkit-box-shadow: 0 0 0 1000px var(--input-bg-focus) inset;
		box-shadow: 0 0 0 1000px var(--input-bg-focus) inset;
	}

	/* ── Sizes ────────────────────────────────── */
	.lumi-input-container--xs .lumi-input {
		padding-block: var(--lumi-space-2xs);
		padding-inline: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-xs);
	}
	.lumi-input-container--sm .lumi-input {
		padding-block: var(--lumi-space-xs);
		padding-inline: var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}
	.lumi-input-container--md .lumi-input {
		padding-block: var(--lumi-space-sm);
		padding-inline: var(--lumi-space-sm);
	}
	.lumi-input-container--lg .lumi-input {
		padding-block: var(--lumi-space-md);
		padding-inline: var(--lumi-space-md);
		font-size: var(--lumi-font-size-lg);
	}
	.lumi-input-container--xl .lumi-input {
		padding-block: var(--lumi-space-md);
		padding-inline: var(--lumi-space-lg);
		font-size: var(--lumi-font-size-xl);
	}

	.lumi-input-container--xs .lumi-input--has-prefix,
	.lumi-input-container--sm .lumi-input--has-prefix,
	.lumi-input-container--md .lumi-input--has-prefix,
	.lumi-input-container--lg .lumi-input--has-prefix,
	.lumi-input-container--xl .lumi-input--has-prefix {
		padding-inline-start: var(--lumi-space-2xs);
	}
	.lumi-input-container--xs .lumi-input--has-suffix,
	.lumi-input-container--sm .lumi-input--has-suffix,
	.lumi-input-container--md .lumi-input--has-suffix,
	.lumi-input-container--lg .lumi-input--has-suffix,
	.lumi-input-container--xl .lumi-input--has-suffix {
		padding-inline-end: var(--lumi-space-2xs);
	}

	/* ── Suffix ───────────────────────────────── */
	.lumi-input__suffix {
		display: inline-flex;
		align-items: center;
		gap: var(--lumi-space-xs);
		padding-inline-end: var(--lumi-space-sm);
		flex-shrink: 0;
	}

	.lumi-input__suffix-item {
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	/* ── Icons & Actions ──────────────────────── */
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
		transition: color 0.2s ease;
		flex-shrink: 0;
	}

	.lumi-input-container--focused .lumi-input__icon,
	.lumi-input-container--focused .lumi-input__action {
		color: var(--input-focus);
	}

	.lumi-input__icon:hover,
	.lumi-input__action:hover {
		color: var(--input-focus);
	}

	.lumi-input__icon:focus-visible,
	.lumi-input__action:focus-visible {
		outline: var(--lumi-border-width-thick) solid
			color-mix(in srgb, var(--input-focus) 35%, transparent);
		outline-offset: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-input__icon--before:not(.lumi-input__icon--no-border) {
		border-right: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}
	.lumi-input__icon--after:not(.lumi-input__icon--no-border) {
		border-left: var(--lumi-border-width-thin) solid var(--lumi-color-border-light);
	}

	/* Icon size scaling per container size */
	.lumi-input-container--xs .lumi-input__icon,
	.lumi-input-container--xs .lumi-input__action {
		padding: 0 var(--lumi-space-2xs);
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

	.lumi-input__validation-icon {
		display: inline-flex;
		align-items: center;
		color: var(--input-focus);
	}

	/* ── Footer (messages) ────────────────────── */
	.lumi-input__footer {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.2s ease;
		overflow: hidden;
		margin-top: calc(var(--lumi-space-2xs) * -1);
	}

	.lumi-input__footer--visible {
		grid-template-rows: 1fr;
	}

	.lumi-input__footer > span {
		overflow: hidden;
		min-height: 0;
	}

	.lumi-input__message,
	.lumi-input__description {
		font-size: var(--lumi-font-size-xs);
		padding-top: var(--lumi-space-2xs);
	}

	.lumi-input__message {
		color: var(--input-focus);
	}
	.lumi-input__description {
		color: var(--lumi-color-text-muted);
	}
</style>
