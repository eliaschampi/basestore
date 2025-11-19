// Lumi UI - TagIndicator Component Types

export interface Tag {
	name: string;
	color: string;
	hash?: string;
}

export interface TagIndicatorProps {
	/** Tag object */
	tag: Tag;

	/** Whether selected */
	selected?: boolean;

	/** Size variant */
	size?: "sm" | "md" | "lg";

	/** Show check icon when selected */
	showIcon?: boolean;

	/** Whether clickable */
	clickable?: boolean;

	/** Tooltip text */
	tooltip?: string;

	/** Orientation */
	orientation?: "horizontal" | "vertical";

	/** Whether disabled */
	disabled?: boolean;

	/** Custom class */
	class?: string;

	/** Click event handler */
	onclick?: (tag: Tag) => void;
}
