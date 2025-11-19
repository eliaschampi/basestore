<script lang="ts">
	import type { TextareaProps } from './types';

	let {
		value = $bindable(''),
		label = '',
		placeholder = '',
		error = false,
		hint = '',
		maxlength = undefined,
		disabled = false,
		readonly = false,
		rows = 3,
		size = 'md',
		color = 'primary',
		resize = 'vertical',
		required = false,
		showCount = false,
		autosize = false,
		autofocus = false,
		resizable = true,
		class: className = '',
		oninput,
		onfocus,
		onblur,
		onkeydown
	}: TextareaProps = $props();

	let textareaRef: HTMLTextAreaElement | undefined = $state();
	let isFocused = $state(false);

	// Generate unique ID
	const id = `lumi-textarea-${Math.random().toString(36).substring(2, 11)}`;

	// Computed classes
	const classes = $derived(() => {
		return [
			'lumi-textarea',
			`lumi-textarea--${size}`,
			`lumi-textarea--${color}`,
			isFocused && 'lumi-textarea--focused',
			error && 'lumi-textarea--error',
			disabled && 'lumi-textarea--disabled',
			readonly && 'lumi-textarea--readonly',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	// Character count
	const charCount = $derived(() => value?.length || 0);

	// Event handlers
	const handleInput = (event: Event) => {
		const target = event.target as HTMLTextAreaElement;
		value = target.value;
		if (oninput) oninput(event);
	};

	const handleFocus = (event: FocusEvent) => {
		isFocused = true;
		if (onfocus) onfocus(event);
	};

	const handleBlur = (event: FocusEvent) => {
		isFocused = false;
		if (onblur) onblur(event);
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (onkeydown) onkeydown(event);
	};

	// Public methods (exposed via bind:this)
	export const focus = () => textareaRef?.focus();
	export const blur = () => textareaRef?.blur();
</script>

<div class={classes()}>
	{#if label}
		<label for={id} class="lumi-textarea__label">
			{label}
			{#if required}
				<span class="lumi-textarea__required">*</span>
			{/if}
		</label>
	{/if}

	<div class="lumi-textarea__wrapper">
		<textarea
			{id}
			bind:this={textareaRef}
			{placeholder}
			{disabled}
			{readonly}
			{rows}
			{maxlength}
			{autofocus}
			{value}
			class="lumi-textarea__input"
			style:resize={resizable ? resize : 'none'}
			oninput={handleInput}
			onfocus={handleFocus}
			onblur={handleBlur}
			onkeydown={handleKeydown}
		></textarea>

		{#if maxlength && showCount}
			<div class="lumi-textarea__counter">{charCount()}/{maxlength}</div>
		{/if}
	</div>

	{#if error && typeof error === 'string'}
		<div class="lumi-textarea__error">{error}</div>
	{/if}

	{#if hint}
		<div class="lumi-textarea__hint">{hint}</div>
	{/if}
</div>

<style>
	.lumi-textarea {
		display: flex;
		flex-direction: column;
		gap: var(--lumi-space-xs);
		width: 100%;
	}

	.lumi-textarea__label {
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		cursor: pointer;
	}

	.lumi-textarea__required {
		color: var(--lumi-color-danger);
		margin-left: var(--lumi-space-2xs);
	}

	.lumi-textarea__wrapper {
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.lumi-textarea__input {
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		background: var(--lumi-color-background);
		border: 2px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		font-family: inherit;
		font-size: var(--lumi-font-size-base);
		line-height: 1.5;
		color: var(--lumi-color-text);
		resize: vertical;
		min-height: calc(var(--lumi-space-md) * 2 + 1.5em);
		transition: var(--lumi-transition-all);
	}

	.lumi-textarea__input::placeholder {
		color: var(--lumi-color-text-muted);
	}

	.lumi-textarea__input:focus {
		outline: none;
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-surface);
	}

	.lumi-textarea__input:hover:not(:focus):not(:disabled) {
		border-color: var(--lumi-color-border-strong);
		background: var(--lumi-color-surface);
	}

	.lumi-textarea__input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
	}

	.lumi-textarea__input:read-only {
		cursor: default;
		background: var(--lumi-color-surface);
	}

	.lumi-textarea__counter {
		position: absolute;
		bottom: var(--lumi-space-xs);
		right: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-text-muted);
		background: var(--lumi-color-surface);
		padding: var(--lumi-space-2xs) var(--lumi-space-xs);
		border-radius: var(--lumi-radius-xl);
		pointer-events: none;
	}

	.lumi-textarea__error {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-danger);
		margin-top: var(--lumi-space-2xs);
	}

	.lumi-textarea__hint {
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-text-muted);
		margin-top: var(--lumi-space-2xs);
	}

	/* Size variants */
	.lumi-textarea--sm .lumi-textarea__input {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-textarea--sm .lumi-textarea__counter {
		font-size: var(--lumi-font-size-xs);
		padding: calc(var(--lumi-space-2xs) / 2) var(--lumi-space-2xs);
	}

	.lumi-textarea--md .lumi-textarea__input {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		font-size: var(--lumi-font-size-base);
	}

	.lumi-textarea--lg .lumi-textarea__input {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	/* Color variants */
	.lumi-textarea--primary .lumi-textarea__input:focus {
		border-color: var(--lumi-color-primary);
	}

	.lumi-textarea--secondary .lumi-textarea__input:focus {
		border-color: var(--lumi-color-secondary);
	}

	.lumi-textarea--success .lumi-textarea__input:focus {
		border-color: var(--lumi-color-success);
	}

	.lumi-textarea--warning .lumi-textarea__input:focus {
		border-color: var(--lumi-color-warning);
	}

	.lumi-textarea--danger .lumi-textarea__input:focus {
		border-color: var(--lumi-color-danger);
	}

	.lumi-textarea--info .lumi-textarea__input:focus {
		border-color: var(--lumi-color-info);
	}

	/* State variants */
	.lumi-textarea--focused .lumi-textarea__input {
		border-color: var(--lumi-color-primary);
		background: var(--lumi-color-surface);
	}

	.lumi-textarea--error .lumi-textarea__input {
		border-color: var(--lumi-color-danger);
	}

	.lumi-textarea--error .lumi-textarea__input:focus {
		border-color: var(--lumi-color-danger);
	}

	.lumi-textarea--disabled .lumi-textarea__input {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--lumi-color-surface);
		border-color: var(--lumi-color-border);
	}

	.lumi-textarea--readonly .lumi-textarea__input {
		cursor: default;
		background: var(--lumi-color-surface);
	}
</style>
