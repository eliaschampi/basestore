<script lang="ts">
	import { onMount } from 'svelte';
	import { portal } from '$lib/actions/portal';
	import { createFloating } from '$lib/utils/floating.svelte';
	import Icon from '../Icon/Icon.svelte';
	import { getIconSize, LUMI_CONFIG } from '../config';
	import type { SelectProps } from './types';

	type OptionValue = string | number | object;

	interface NormalizedOption {
		value: OptionValue | null;
		label: string;
		disabled: boolean;
		key: string;
	}

	let {
		value = $bindable(null),
		options = [],
		placeholder = 'Select an option',
		label = '',
		name = '',
		'aria-label': ariaLabel = '',
		size = 'md',
		disabled = false,
		autocomplete = false,
		error = false,
		errorMessage = '',
		noDataText = 'No options available',
		width = '100%',
		valueKey = 'value',
		labelKey = 'label',
		disabledKey = 'disabled',
		clearable = true,
		loading = false,
		placement = 'bottom-start',
		maxHeight = 250,
		offset = 4,
		class: className = '',
		onchange,
		onopen,
		onclose,
		onsearch
	}: SelectProps = $props();

	// Refs
	let selectRef: HTMLDivElement | undefined = $state();
	let inputRef: HTMLInputElement | undefined = $state();
	let dropdownRef: HTMLDivElement | undefined = $state();
	let focusedIndex = $state(-1);
	let searchQuery = $state('');

	// Floating element management
	const floating = createFloating(
		() => selectRef,
		() => dropdownRef,
		() => ({
			placement,
			matchWidth: true,
			maxHeight,
			offset,
			zIndex: 'var(--lumi-z-dropdown)',
			strategy: 'fixed'
		})
	);

	// Utility for deep/shallow comparison
	function isEqual(a: unknown, b: unknown): boolean {
		if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
			return JSON.stringify(a) === JSON.stringify(b);
		}
		return a === b;
	}

	function toOptionKey(optionValue: OptionValue | null, index: number): string {
		if (optionValue === null || optionValue === undefined) {
			return `option-${index}`;
		}

		if (typeof optionValue === 'object') {
			try {
				return `option-${index}-${JSON.stringify(optionValue)}`;
			} catch {
				return `option-${index}`;
			}
		}

		return `${String(optionValue)}-${index}`;
	}

	// Unique ID for accessibility
	const uniqueId = Math.random().toString(36).substring(2, 11);
	const inputId = `lumi-select-${uniqueId}`;
	const dropdownId = `lumi-select-dropdown-${uniqueId}`;
	const widthStyle = $derived.by(() => (width ? `width: ${width}` : ''));
	const iconSize = $derived.by(() => `${getIconSize(size)}px`);
	const transitionDuration = `${LUMI_CONFIG.transitions.base}ms`;

	// Normalize options
	const normalizedOptions = $derived.by(() => {
		if (!options || options.length === 0) return [];

		return options.map((option, index) => {
			if (typeof option === 'object' && option !== null) {
				const optionRecord = option as Record<string, unknown>;
				const optionValue = (optionRecord[valueKey] ??
					optionRecord.value ??
					null) as OptionValue | null;
				const optionLabel = optionRecord[labelKey] ?? optionRecord.label ?? optionValue ?? '';
				const optionDisabled = Boolean(optionRecord[disabledKey] ?? optionRecord.disabled);

				return {
					value: optionValue,
					label: String(optionLabel),
					disabled: optionDisabled,
					key: toOptionKey(optionValue, index)
				} satisfies NormalizedOption;
			}

			return {
				value: option as string | number,
				label: String(option),
				disabled: false,
				key: toOptionKey(option, index)
			} satisfies NormalizedOption;
		});
	});

	const selectedOption = $derived.by(() =>
		normalizedOptions.find((option) => isEqual(option.value, value))
	);

	// Display value management
	const displayValue = $derived.by(() => {
		if (floating.isOpen && autocomplete) {
			return searchQuery;
		}
		return selectedOption?.label || '';
	});

	// Watch for changes to the selected value to update the input text
	$effect(() => {
		searchQuery = selectedOption?.label || '';
	});

	const hasValue = $derived.by(
		() =>
			value !== null && value !== undefined && !(typeof value === 'string' && value.length === 0)
	);

	const showClearButton = $derived.by(() => clearable && hasValue && !disabled && !loading);

	const styleVars = $derived.by(
		() => `--select-transition-duration: ${transitionDuration}; --select-icon-size: ${iconSize};`
	);

	const filteredOptions = $derived.by(() => {
		const enabledOptions = normalizedOptions.filter((option) => !option.disabled);

		if (!autocomplete || !searchQuery || !floating.isOpen) {
			return enabledOptions;
		}

		// When searching, don't filter out the currently selected option from the list
		const query = searchQuery.toLowerCase();
		if (selectedOption && selectedOption.label.toLowerCase() === query) {
			return enabledOptions;
		}

		return enabledOptions.filter((option) => option.label.toLowerCase().includes(query));
	});

	// Classes
	const selectClasses = $derived.by(() => {
		return [
			'lumi-select',
			`lumi-select--${size}`,
			floating.isOpen && 'lumi-select--active',
			disabled && 'lumi-select--disabled',
			error && 'lumi-select--error',
			loading && 'lumi-select--loading',
			className
		]
			.filter(Boolean)
			.join(' ');
	});

	// Methods
	function getOptionId(index: number): string {
		return `${dropdownId}-option-${index}`;
	}

	function toggleDropdown(): void {
		if (floating.isOpen) {
			closeDropdown();
		} else {
			openDropdown();
		}
	}

	function openDropdown(): void {
		if (disabled || loading || floating.isOpen) return;
		floating.open();
		focusedIndex = selectedOption
			? filteredOptions.findIndex((option) => isEqual(option.value, selectedOption.value))
			: -1;
		onopen?.();
	}

	function closeDropdown(): void {
		if (!floating.isOpen) return;
		floating.close();
		focusedIndex = -1;
		// Reset search query to the selected value's label
		searchQuery = selectedOption?.label || '';
		onclose?.();
	}

	function handleInput(event: Event): void {
		if (!autocomplete) return;
		if (!floating.isOpen) {
			openDropdown();
		}
		const val = (event.target as HTMLInputElement).value;
		searchQuery = val;
		onsearch?.(val);
	}

	function handleKeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'Enter':
				if (!floating.isOpen) {
					event.preventDefault();
					openDropdown();
				} else if (focusedIndex >= 0) {
					event.preventDefault();
					const option = filteredOptions[focusedIndex];
					if (option && !option.disabled) {
						selectOption(option);
					}
				}
				break;
			case 'Escape':
				event.preventDefault();
				closeDropdown();
				break;
			case 'ArrowDown': {
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				focusedIndex = Math.min(focusedIndex + 1, filteredOptions.length - 1);
				break;
			}
			case 'ArrowUp':
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
		}
	}

	function selectOption(option: NormalizedOption): void {
		if (option.disabled) return;
		const newValue = option.value;
		value = newValue;
		onchange?.(newValue);
		closeDropdown();
	}

	function clearValue(event: MouseEvent): void {
		event.stopPropagation();
		value = null;
		onchange?.(null);
		searchQuery = '';
		if (autocomplete) {
			inputRef?.focus();
		}
	}

	function isOptionSelected(option: NormalizedOption): boolean {
		return isEqual(option.value, value);
	}

	function handleClickOutside(event: MouseEvent): void {
		if (
			selectRef &&
			!selectRef.contains(event.target as Node) &&
			dropdownRef &&
			!dropdownRef.contains(event.target as Node)
		) {
			closeDropdown();
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside, true);
		return () => {
			document.removeEventListener('click', handleClickOutside, true);
		};
	});
</script>

<div bind:this={selectRef} class={selectClasses} style={`${widthStyle}; ${styleVars}`}>
	<!-- Label -->
	{#if label}
		<label for={inputId} class="lumi-select__label">
			{label}
		</label>
	{/if}

	<!-- Select Container -->
	<div class="lumi-select__container">
		<!-- Input Field -->
		<input
			bind:this={inputRef}
			{name}
			id={inputId}
			type="text"
			readonly={!autocomplete}
			{disabled}
			{placeholder}
			class="lumi-select__input"
			role="combobox"
			aria-expanded={floating.isOpen}
			aria-controls={dropdownId}
			aria-autocomplete={autocomplete ? 'list' : 'none'}
			aria-activedescendant={focusedIndex > -1 ? getOptionId(focusedIndex) : undefined}
			aria-label={ariaLabel || label || placeholder}
			value={displayValue}
			onclick={toggleDropdown}
			onkeydown={handleKeydown}
			oninput={handleInput}
		/>

		<!-- Loading Spinner -->
		{#if loading}
			<div class="lumi-select__icon-wrapper">
				<div class="lumi-select__spinner"></div>
			</div>
		{:else if showClearButton}
			<!-- Clear Button -->
			<button
				type="button"
				class="lumi-select__clear"
				aria-label="Clear selection"
				onclick={clearValue}
			>
				<Icon icon="x" size={iconSize} />
			</button>
		{:else}
			<!-- Dropdown Arrow -->
			<div class="lumi-select__icon-wrapper lumi-select__arrow">
				<Icon icon="chevronDown" size={iconSize} />
			</div>
		{/if}
	</div>

	<!-- Dropdown Options -->
	{#if floating.isOpen}
		<div
			bind:this={dropdownRef}
			use:portal
			id={dropdownId}
			class="lumi-select__dropdown"
			style="position: {floating.floatingStyles.position}; top: {floating.floatingStyles
				.top}; left: {floating.floatingStyles.left}; z-index: {floating.floatingStyles
				.zIndex}; {floating.floatingStyles.width
				? `width: ${floating.floatingStyles.width}`
				: ''}; {floating.floatingStyles.maxHeight
				? `max-height: ${floating.floatingStyles.maxHeight}`
				: ''}"
			role="listbox"
		>
			<div class="lumi-select__dropdown-content">
				<!-- Loading State -->
				{#if loading}
					<div class="lumi-select__loading-options">
						<div class="lumi-select__spinner"></div>
						<span>Loading options...</span>
					</div>
				{:else}
					{@const filtered = filteredOptions}
					{#if filtered.length === 0}
						<!-- No Data Message -->
						<div class="lumi-select__no-data">
							{noDataText}
						</div>
					{:else}
						<!-- Options List -->
						{#each filtered as option, index (option.key)}
							{@const isSelected = isOptionSelected(option)}
							{@const isFocused = focusedIndex === index}
							{@const isDisabled = option.disabled}
							<div
								id={getOptionId(index)}
								class="lumi-select__option"
								class:lumi-select__option--selected={isSelected}
								class:lumi-select__option--focused={isFocused}
								class:lumi-select__option--disabled={isDisabled}
								role="option"
								tabindex={isDisabled ? -1 : 0}
								aria-selected={isSelected}
								aria-disabled={isDisabled}
								onclick={() => selectOption(option)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										selectOption(option);
									}
								}}
								onmouseenter={() => (focusedIndex = index)}
							>
								{option.label}
							</div>
						{/each}
					{/if}
				{/if}
			</div>
		</div>
	{/if}

	<!-- Error Message -->
	{#if error && errorMessage}
		<div class="lumi-select__error">
			{errorMessage}
		</div>
	{/if}
</div>

<style>
	.lumi-select {
		position: relative;
		width: 100%;
		font-family: var(--lumi-font-family-sans);
		--select-border: var(--lumi-color-border);
		--select-focus: var(--lumi-color-primary);
	}

	.lumi-select__label {
		display: block;
		margin-bottom: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		transition: var(--lumi-transition-colors);
	}

	.lumi-select--active .lumi-select__label {
		color: var(--select-focus);
	}

	.lumi-select__container {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--lumi-color-surface-overlay);
		border: var(--lumi-border-width-thin) solid var(--select-border);
		border-radius: var(--lumi-radius-md);
		transition:
			border-color var(--select-transition-duration) var(--lumi-easing-default),
			box-shadow var(--select-transition-duration) var(--lumi-easing-default),
			background-color var(--select-transition-duration) var(--lumi-easing-default);
		cursor: pointer;
		overflow: hidden;
	}

	.lumi-select--active .lumi-select__container {
		border-color: var(--select-focus);
		box-shadow: 0 0 0 var(--lumi-border-width-thick)
			color-mix(in srgb, var(--select-focus) 20%, transparent);
	}

	.lumi-select__input {
		flex: 1;
		width: 100%;
		padding: var(--lumi-space-sm);
		background: transparent;
		border: none;
		outline: none;
		font-size: var(--lumi-font-size-base);
		color: var(--lumi-color-text);
		cursor: pointer;
		font-family: inherit;
	}

	.lumi-select__input::placeholder {
		color: var(--lumi-color-text-muted);
		opacity: 0.7;
	}

	.lumi-select__input:not([readonly]) {
		cursor: text;
	}

	.lumi-select__icon-wrapper {
		display: flex;
		align-items: center;
		justify-content: center;
		width: calc(var(--select-icon-size) + var(--lumi-space-xs));
		height: 100%;
		color: var(--lumi-color-text-muted);
		transition:
			transform var(--select-transition-duration) var(--lumi-easing-default),
			color var(--select-transition-duration) var(--lumi-easing-default);
	}

	.lumi-select--active .lumi-select__arrow {
		transform: rotate(180deg);
		color: var(--select-focus);
	}

	.lumi-select__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--select-icon-size);
		height: var(--select-icon-size);
		margin-right: var(--lumi-space-xs);
		padding: 0;
		background: transparent;
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition:
			background-color var(--select-transition-duration) var(--lumi-easing-default),
			color var(--select-transition-duration) var(--lumi-easing-default);
	}

	.lumi-select__clear:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-danger);
	}

	/* Dropdown */
	.lumi-select__dropdown {
		background:
			linear-gradient(
				180deg,
				rgba(var(--lumi-color-primary-rgb), 0.05) 0%,
				rgba(var(--lumi-color-primary-rgb), 0) 22%
			),
			var(--lumi-color-surface-overlay);
		border: 1px solid var(--lumi-color-border-light);
		border-radius: var(--lumi-radius-2xl);
		overflow: hidden;
		box-shadow: var(--lumi-shadow-lg);
		padding: var(--lumi-space-xs);
		display: flex;
		flex-direction: column;
		margin-top: var(--lumi-space-xs);
		backdrop-filter: blur(var(--lumi-blur-md));
		-webkit-backdrop-filter: blur(var(--lumi-blur-md));
	}

	.lumi-select__dropdown-content {
		overflow-y: auto;
		max-height: inherit;
	}

	.lumi-select__dropdown-content::-webkit-scrollbar {
		width: var(--lumi-space-2xs);
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border);
		border-radius: var(--lumi-radius-full);
	}

	.lumi-select__option {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition: var(--lumi-transition-colors);
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-select__option--selected {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
		font-weight: var(--lumi-font-weight-medium);
	}

	.lumi-select__option:hover:not(.lumi-select__option--disabled),
	.lumi-select__option--focused {
		background: var(--lumi-color-background-hover);
	}

	.lumi-select__option--selected:hover:not(.lumi-select__option--disabled) {
		background: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-select__option--disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.lumi-select__no-data {
		padding: var(--lumi-space-md);
		text-align: center;
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select__error {
		margin-top: var(--lumi-space-2xs);
		font-size: var(--lumi-font-size-xs);
		color: var(--lumi-color-danger);
	}

	/* Sizes */
	.lumi-select--sm .lumi-select__input {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}
	.lumi-select--lg .lumi-select__input {
		padding: var(--lumi-space-md);
		font-size: var(--lumi-font-size-lg);
	}

	/* States */
	.lumi-select--disabled {
		opacity: 0.6;
		pointer-events: none;
	}
	.lumi-select--error {
		--select-border: var(--lumi-color-danger);
		--select-focus: var(--lumi-color-danger);
	}

	.lumi-select__spinner {
		width: var(--lumi-icon-sm);
		height: var(--lumi-icon-sm);
		border: var(--lumi-border-width-thick) solid var(--lumi-color-border);
		border-top-color: var(--lumi-color-primary);
		border-radius: 50%;
		animation: spin var(--lumi-duration-slower) linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
