/**
 * Lumi UI - Icon Component Types
 */

export interface IconProps {
	/** Icon name from the icon registry */
	icon?: string;

	/** Icon color - semantic or custom CSS color */
	color?: "primary" | "secondary" | "success" | "warning" | "danger" | "info" | "muted" | string;

	/** Background color variant */
	bg?: "primary" | "secondary" | "success" | "warning" | "danger" | "info" | string;

	/** Icon size - predefined or custom CSS size */
	size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | string;

	/** Apply rounded background */
	round?: boolean;

	/** Stroke width for the icon */
	stroke?: number;

	/** Additional CSS classes */
	class?: string;

	/** Click handler */
	onclick?: (event: MouseEvent) => void;
}
