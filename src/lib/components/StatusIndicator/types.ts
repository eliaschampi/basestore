// Lumi UI - StatusIndicator Component Types

export type StatusIndicatorStatus =
	| 'default'
	| 'active'
	| 'inactive'
	| 'pending'
	| 'error'
	| 'primary'
	| 'secondary'
	| 'success'
	| 'warning'
	| 'danger'
	| 'info';

export interface StatusIndicatorProps {
	/** Status type or custom color */
	status?: StatusIndicatorStatus | string;

	/** Whether to show pulse animation */
	animated?: boolean;

	/** Whether to show pulse animation (alias for animated) */
	pulse?: boolean;

	/** Tooltip text */
	tooltip?: string;

	/** Custom class */
	class?: string;
}
