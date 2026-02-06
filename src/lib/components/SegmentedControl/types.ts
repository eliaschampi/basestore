// Lumi UI - SegmentedControl Component Types

export interface SegmentedControlOption {
	/** Unique value */
	value: string | number;

	/** Visible label */
	label: string;

	/** Optional icon name */
	icon?: string;

	/** Whether disabled */
	disabled?: boolean;
}

export type SegmentedControlColor =
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'info';

export interface SegmentedControlProps {
	/** Selected value */
	value?: string | number;

	/** Array of options */
	options: SegmentedControlOption[];

	/** Color variant */
	color?: SegmentedControlColor;

	/** Whether disabled */
	disabled?: boolean;

	/** Custom class */
	class?: string;

	/** Change event handler */
	onchange?: (value: string | number) => void;

	/** Accessible group label */
	'aria-label'?: string;
}
