// Lumi UI - List Component Types

export type ListSize = "sm" | "md";
export type ListColor = "primary" | "secondary" | "success" | "warning" | "danger" | "info";

export interface ListProps {
	/** Size variant */
	size?: ListSize;

	/** Color variant */
	color?: ListColor;

	/** Disabled state */
	disabled?: boolean;

	/** Custom class */
	class?: string;
}

export interface ListItemProps {
	/** Item title */
	title?: string;

	/** Item subtitle */
	subtitle?: string;

	/** Icon name */
	icon?: string;

	/** Whether item has avatar */
	avatar?: boolean;

	/** Disabled state */
	disabled?: boolean;

	/** Whether item is clickable */
	clickable?: boolean;

	/** Active state */
	active?: boolean;

	/** Custom class */
	class?: string;

	/** Click handler */
	onclick?: (event: MouseEvent) => void;
}

export interface ListHeaderProps {
	/** Header title */
	title?: string;

	/** Color variant */
	color?: ListColor;

	/** Icon name */
	icon?: string;

	/** Custom class */
	class?: string;
}
