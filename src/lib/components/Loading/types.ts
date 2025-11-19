/**
 * Lumi UI - Loading Component Types
 */

export type LoadingColor = "primary" | "secondary" | "success" | "warning" | "danger" | "info";

export interface LoadingProps {
	/** Color variant */
	color?: LoadingColor;

	/** Loading text */
	text?: string;

	/** Additional CSS classes */
	class?: string;
}
