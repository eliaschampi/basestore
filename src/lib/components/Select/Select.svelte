<script lang="ts">
	import { onMount } from "svelte";
	import { createFloating } from "$lib/utils/floating.svelte";
	import Icon from "../Icon/Icon.svelte";
	import type { SelectOption, SelectProps } from "./types";

	let {
		value = $bindable(null),
		options = [],
		placeholder = "Select an option",
		label = "",
		name = "",
		size = "md",
		disabled = false,
		autocomplete = false,
		error = false,
		errorMessage = "",
		noDataText = "No options available",
		width = "auto",
		valueKey = "value",
		labelKey = "label",
		disabledKey = "disabled",
		clearable = true,
		loading = false,
		placement = "bottom-start",
		maxHeight = 200,
		offset = 8,
		class: className = "",
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
	let searchQuery = $state("");

	// Floating element management
	const floating = createFloating(
		() => selectRef,
		() => dropdownRef,
		{
			placement,
			matchWidth: true,
			maxHeight,
			offset,
			zIndex: "var(--lumi-z-dropdown)"
		}
	);

	// Utility for deep/shallow comparison
	function isEqual(a: unknown, b: unknown): boolean {
		if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
			return JSON.stringify(a) === JSON.stringify(b);
		}
		return a === b;
	}

	// Unique ID for accessibility
	const uniqueId = Math.random().toString(36).substring(2, 11);
	const inputId = $derived(`lumi-select-${uniqueId}`);
	const widthStyle = $derived(width ? `width: ${width}` : "");

	// Normalize options to handle string arrays or objects consistently
	const normalizedOptions = $derived(() => {
		if (!options || options.length === 0) return [];

		if (options.every((opt) => typeof opt !== "object" || opt === null)) {
			return options.map((opt) => ({
				[valueKey]: opt,
				[labelKey]: String(opt)
			})) as SelectOption[];
		}
		return options as SelectOption[];
	});

	const selectedOption = $derived(() => {
		const opts = normalizedOptions();
		if (!opts || !Array.isArray(opts)) return undefined;
		return opts.find((opt) => isEqual(opt[valueKey], value));
	});

	// Display value management
	const displayValue = $derived(() => {
		if (floating.isOpen && autocomplete) {
			return searchQuery;
		}
		const selected = selectedOption();
		return selected?.[labelKey] || "";
	});

	// Watch for changes to the selected value to update the input text
	$effect(() => {
		const selected = selectedOption();
		if (selected) {
			searchQuery = selected[labelKey] as string;
		} else {
			searchQuery = "";
		}
	});

	const showClearButton = $derived(
		clearable && value !== null && value !== undefined && !disabled && !loading
	);

	const filteredOptions = $derived(() => {
		const opts = normalizedOptions();
		const enabledOpts = opts.filter((opt) => !(opt[disabledKey] as boolean));

		if (!autocomplete || !searchQuery || !floating.isOpen) {
			return enabledOpts;
		}

		// When searching, don't filter out the currently selected option from the list
		const query = searchQuery.toLowerCase();
		const selected = selectedOption();
		if (selected && (selected[labelKey] as string).toLowerCase() === query) {
			return enabledOpts;
		}

		return enabledOpts.filter((opt) => (opt[labelKey] as string).toLowerCase().includes(query));
	});

	// Classes
	const selectClasses = $derived(() => {
		return [
			"lumi-select",
			`lumi-select--${size}`,
			floating.isOpen && "lumi-select--active",
			disabled && "lumi-select--disabled",
			error && "lumi-select--error",
			loading && "lumi-select--loading",
			className
		]
			.filter(Boolean)
			.join(" ");
	});

	// Methods
	function getOptionKey(option: SelectOption, index: number): string {
		const val = option[valueKey] as string | number | object;
		return val !== null && val !== undefined ? String(val) : `option-${index}`;
	}

	function toggleDropdown(): void {
		if (disabled || loading) return;
		floating.toggle();
	}

	function openDropdown(): void {
		if (disabled || loading || floating.isOpen) return;
		floating.open();
		const selected = selectedOption();
		const filtered = filteredOptions();
		focusedIndex = selected ? filtered.indexOf(selected) : -1;
		onopen?.();
	}

	function closeDropdown(): void {
		if (!floating.isOpen) return;
		floating.close();
		focusedIndex = -1;
		// Reset search query to the selected value's label
		const selected = selectedOption();
		searchQuery = selected ? (selected[labelKey] as string) : "";
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
			case "Enter":
				if (!floating.isOpen) {
					event.preventDefault();
					openDropdown();
				} else if (focusedIndex >= 0) {
					event.preventDefault();
					const filtered = filteredOptions();
					const option = filtered[focusedIndex];
					if (option && !(option[disabledKey] as boolean)) {
						selectOption(option);
						closeDropdown();
					}
				}
				break;
			case "Escape":
				event.preventDefault();
				closeDropdown();
				break;
			case "ArrowDown": {
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				const filtered = filteredOptions();
				focusedIndex = Math.min(focusedIndex + 1, filtered.length - 1);
				break;
			}
			case "ArrowUp":
				event.preventDefault();
				if (!floating.isOpen) openDropdown();
				focusedIndex = Math.max(focusedIndex - 1, 0);
				break;
		}
	}

	function selectOption(option: SelectOption): void {
		if (option[disabledKey] as boolean) return;
		const newValue = option[valueKey] as string | number | object;
		value = newValue;
		onchange?.(newValue);
		closeDropdown();
	}

	function clearValue(event: MouseEvent): void {
		event.stopPropagation();
		value = null;
		onchange?.(null);
		searchQuery = "";
		if (autocomplete) {
			inputRef?.focus();
		}
	}

	function isOptionSelected(option: SelectOption): boolean {
		const optionValue = option[valueKey] as string | number | object;
		return isEqual(optionValue, value);
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
		document.addEventListener("click", handleClickOutside);
		return () => {
			document.removeEventListener("click", handleClickOutside);
		};
	});
</script>

<div bind:this={selectRef} class={selectClasses()} style={widthStyle}>
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
			name={name}
			id={inputId}
			type="text"
			readonly={!autocomplete}
			{disabled}
			{placeholder}
			class="lumi-select__input"
			role="combobox"
			aria-expanded={floating.isOpen}
			aria-controls="dropdown-{inputId}"
			aria-activedescendant={focusedIndex > -1 ? `option-${inputId}-${focusedIndex}` : undefined}
			value={displayValue()}
			onclick={toggleDropdown}
			onkeydown={handleKeydown}
			oninput={handleInput}
		/>

		<!-- Loading Spinner -->
		{#if loading}
			<div class="lumi-select__loading-spinner">
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
				<Icon icon="x" size="16px" />
			</button>
		{:else}
			<!-- Dropdown Arrow -->
			<div class="lumi-select__arrow">
				<Icon icon="chevronDown" size="16px" />
			</div>
		{/if}
	</div>

	<!-- Dropdown Options -->
	{#if floating.isOpen}
		<div
			bind:this={dropdownRef}
			id="dropdown-{inputId}"
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
				{:else if filteredOptions.length === 0}
					<!-- No Data Message -->
					<div class="lumi-select__no-data">
						{noDataText}
					</div>
				{:else}
					<!-- Options List -->
					{#each filteredOptions() as option, index (getOptionKey(option, index))}
						{@const isSelected = isOptionSelected(option)}
						{@const isFocused = focusedIndex === index}
						{@const isDisabled = option[disabledKey] as boolean}
						<div
							id="option-{inputId}-{index}"
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
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									selectOption(option);
								}
							}}
							onmouseenter={() => (focusedIndex = index)}
						>
							{option[labelKey]}
						</div>
					{/each}
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
	}

	.lumi-select__label {
		display: block;
		margin-bottom: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-sm);
		font-weight: var(--lumi-font-weight-medium);
		color: var(--lumi-color-text);
		line-height: 1.2;
	}

	.lumi-select__container {
		position: relative;
		display: flex;
		align-items: center;
		background: var(--lumi-color-background);
		border: 2px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		transition: var(--lumi-transition-all);
		cursor: pointer;
	}

	.lumi-select__container:hover {
		border-color: var(--lumi-color-border-strong);
	}

	.lumi-select__input {
		flex: 1;
		width: 100%;
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		background: transparent;
		border: none;
		outline: none;
		font-size: var(--lumi-font-size-base);
		color: var(--lumi-color-text);
		cursor: pointer;
		transition: var(--lumi-transition-all);
	}

	.lumi-select__input::placeholder {
		color: var(--lumi-color-text-muted);
	}

	.lumi-select__input:not([readonly]) {
		cursor: text;
	}

	.lumi-select__input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.lumi-select__clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
		padding: 0;
		background: var(--lumi-color-background-hover);
		border: none;
		border-radius: var(--lumi-radius-full);
		color: var(--lumi-color-text-muted);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		position: absolute;
		right: var(--lumi-space-sm);
	}

	.lumi-select__clear:hover {
		background: var(--lumi-color-background-hover);
		color: var(--lumi-color-text);
	}

	.lumi-select__clear:active {
		transform: scale(0.95);
	}

	.lumi-select__loading-spinner {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		position: absolute;
		right: var(--lumi-space-md);
	}

	.lumi-select__spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--lumi-color-gray-300);
		border-top: 2px solid var(--lumi-color-primary);
		border-radius: 50%;
		animation: lumi-spin 1s linear infinite;
	}

	.lumi-select__arrow {
		display: flex;
		align-items: center;
		justify-content: center;
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
		position: absolute;
		right: var(--lumi-space-sm);
		color: var(--lumi-color-text-muted);
		transition: var(--lumi-transition-all);
		pointer-events: none;
	}

	.lumi-select--active .lumi-select__arrow {
		transform: rotate(180deg);
	}

	.lumi-select__dropdown {
		background: var(--lumi-color-surface);
		border: 2px solid var(--lumi-color-border);
		border-radius: var(--lumi-radius-2xl);
		overflow: hidden;
		box-shadow: var(--lumi-shadow-lg);
		padding: var(--lumi-space-xs);
		display: flex;
		flex-direction: column;
	}

	.lumi-select__dropdown-content {
		overflow-y: auto;
		max-height: inherit;
	}

	.lumi-select__dropdown-content::-webkit-scrollbar {
		width: 6px;
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-track {
		background: var(--lumi-color-background);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-thumb {
		background: var(--lumi-color-border-strong);
		border-radius: var(--lumi-radius-base);
	}

	.lumi-select__dropdown-content::-webkit-scrollbar-thumb:hover {
		background: var(--lumi-color-text-muted);
	}

	.lumi-select__option {
		padding: var(--lumi-space-sm) var(--lumi-space-md);
		cursor: pointer;
		transition: var(--lumi-transition-all);
		user-select: none;
		color: var(--lumi-color-text);
		font-size: var(--lumi-font-size-base);
		line-height: var(--lumi-line-height-normal);
		border-radius: var(--lumi-radius-md);
	}

	.lumi-select__option--selected {
		background: var(--lumi-color-primary-bg);
		color: var(--lumi-color-primary);
		font-weight: var(--lumi-font-weight-medium);
	}

	.lumi-select__option--focused,
	.lumi-select__option:hover:not(.lumi-select__option--disabled) {
		background: var(--lumi-color-background-hover);
		outline: none;
	}

	.lumi-select__option--disabled {
		opacity: 0.5;
		cursor: not-allowed;
		pointer-events: none;
		color: var(--lumi-color-text-muted);
	}

	.lumi-select__option--selected.lumi-select__option--focused,
	.lumi-select__option--selected:hover:not(.lumi-select__option--disabled) {
		background: color-mix(in srgb, var(--lumi-color-primary) 15%, transparent);
	}

	.lumi-select__option--focused {
		box-shadow: inset 0 0 0 2px var(--lumi-color-primary);
	}

	.lumi-select__no-data {
		padding: var(--lumi-space-md);
		text-align: center;
		color: var(--lumi-color-text-muted);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select__loading-options {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--lumi-space-lg);
		color: var(--lumi-color-text-muted);
		gap: var(--lumi-space-sm);
	}

	.lumi-select__loading-options span {
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select__error {
		margin-top: var(--lumi-space-xs);
		font-size: var(--lumi-font-size-sm);
		color: var(--lumi-color-danger);
		line-height: 1.2;
	}

	/* Size Variants */
	.lumi-select--sm .lumi-select__input {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select--sm .lumi-select__label {
		font-size: var(--lumi-font-size-xs);
		margin-bottom: var(--lumi-space-xs);
	}

	.lumi-select--sm .lumi-select__option {
		padding: var(--lumi-space-xs) var(--lumi-space-sm);
		font-size: var(--lumi-font-size-sm);
	}

	.lumi-select--sm .lumi-select__clear,
	.lumi-select--sm .lumi-select__arrow,
	.lumi-select--sm .lumi-select__loading-spinner {
		width: var(--lumi-space-md);
		height: var(--lumi-space-md);
	}

	.lumi-select--lg .lumi-select__input {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-select--lg .lumi-select__label {
		font-size: var(--lumi-font-size-base);
		margin-bottom: var(--lumi-space-sm);
	}

	.lumi-select--lg .lumi-select__option {
		padding: var(--lumi-space-md) var(--lumi-space-lg);
		font-size: var(--lumi-font-size-lg);
	}

	.lumi-select--lg .lumi-select__clear,
	.lumi-select--lg .lumi-select__arrow {
		width: var(--lumi-space-xl);
		height: var(--lumi-space-xl);
	}

	.lumi-select--lg .lumi-select__loading-spinner {
		width: var(--lumi-space-lg);
		height: var(--lumi-space-lg);
	}

	/* State Variants */
	.lumi-select--active .lumi-select__container {
		border-color: var(--lumi-color-primary);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.lumi-select--disabled {
		opacity: 0.6;
		cursor: not-allowed;
		pointer-events: none;
	}

	.lumi-select--disabled .lumi-select__container {
		background: var(--lumi-color-background-secondary);
		border-color: var(--lumi-color-border);
		cursor: not-allowed;
	}

	.lumi-select--disabled .lumi-select__input {
		cursor: not-allowed;
		color: var(--lumi-color-text-muted);
	}

	.lumi-select--disabled .lumi-select__arrow,
	.lumi-select--disabled .lumi-select__clear {
		opacity: 0.5;
		pointer-events: none;
	}

	.lumi-select--error .lumi-select__container {
		border-color: var(--lumi-color-danger);
		box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
	}

	.lumi-select--error .lumi-select__container:hover {
		border-color: var(--lumi-color-danger);
	}

	.lumi-select--error .lumi-select__input {
		color: var(--lumi-color-danger);
	}

	.lumi-select--loading .lumi-select__container {
		cursor: wait;
	}

	.lumi-select--loading .lumi-select__input {
		cursor: wait;
	}

	@keyframes lumi-spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.lumi-select * {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}

		.lumi-select__spinner {
			animation: none;
		}
	}
</style>
