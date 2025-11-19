/**
 * Radio Component Types
 * Lumi UI - Professional Svelte 5 Component Library
 */

import type { Snippet } from 'svelte';

export type RadioSize = 'sm' | 'md';
export type RadioColor = 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';

export interface RadioProps {
	/** Selected value (bindable) */
	group?: any;
	/** Radio value */
	value: any;
	/** Label text */
	label?: string;
	/** Radio name (for grouping) */
	name?: string;
	/** Size variant */
	size?: RadioSize;
	/** Color variant */
	color?: RadioColor;
	/** Disabled state */
	disabled?: boolean;
	/** Custom CSS class */
	class?: string;
	/** Children snippet for custom label */
	children?: Snippet;
	/** Change event handler */
	onchange?: (value: any, event: Event) => void;
}
