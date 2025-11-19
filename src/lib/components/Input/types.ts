/**
 * Lumi UI - Input Component Types
 */

export type InputType =
	| 'text'
	| 'password'
	| 'email'
	| 'number'
	| 'tel'
	| 'url'
	| 'search'
	| 'date'
	| 'time'
	| 'datetime-local'
	| 'month'
	| 'week';

export type InputSize = 'sm' | 'md' | 'lg' | 'xl';

export type InputColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface InputProps {
	name?: string;

	/** Input type */
	type?: InputType;

	/** Input value (bindable) */
	value?: string | number;

	/** Label text */
	label?: string;

	/** Placeholder label (floating label) */
	labelPlaceholder?: string;

	/** Placeholder text */
	placeholder?: string;

	/** Whether to autofocus on mount */
	autofocus?: boolean;

	/** Icon name to display */
	icon?: string;

	/** Whether to show icon after input */
	iconAfter?: boolean;

	/** Whether icon has no border */
	iconNoBorder?: boolean;

	/** Color variant */
	color?: InputColor;

	/** Success state */
	success?: boolean;

	/** Danger state */
	danger?: boolean;

	/** Warning state */
	warning?: boolean;

	/** Success message text */
	successText?: string;

	/** Danger message text */
	dangerText?: string;

	/** Warning message text */
	warningText?: string;

	/** Description text below input */
	descriptionText?: string;

	/** Size variant */
	size?: InputSize;

	/** Success validation icon */
	valIconSuccess?: string;

	/** Danger validation icon */
	valIconDanger?: string;

	/** Warning validation icon */
	valIconWarning?: string;

	/** Whether input is disabled */
	disabled?: boolean;

	/** Whether input is readonly */
	readonly?: boolean;

	/** Whether input is required */
	required?: boolean;

	/** Additional CSS classes */
	class?: string;

	/** Input event handler */
	oninput?: (event: Event) => void;

	/** Focus event handler */
	onfocus?: (event: FocusEvent) => void;

	/** Blur event handler */
	onblur?: (event: FocusEvent) => void;

	/** Icon click handler */
	'onicon-click'?: (event: MouseEvent) => void;
}
