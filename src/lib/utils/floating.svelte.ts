// Lumi UI - Floating Element Utility (Svelte 5 Runes)
// Manages floating elements positioning (dropdowns, tooltips, etc.)

export interface FloatingPosition {
	top: number;
	left: number;
	width?: number;
	maxHeight?: number;
}

export type FloatingPlacement =
	| 'bottom-start'
	| 'bottom-end'
	| 'top-start'
	| 'top-end'
	| 'bottom'
	| 'top';

export interface UseFloatingOptions {
	offset?: number;
	placement?: FloatingPlacement;
	matchWidth?: boolean;
	maxHeight?: number;
	viewportPadding?: number;
	zIndex?: string;
}

export function createFloating(
	triggerElement: () => HTMLElement | undefined,
	floatingElement: () => HTMLElement | undefined,
	options: UseFloatingOptions = {}
) {
	const {
		offset = 8,
		placement = 'bottom-start',
		matchWidth = false,
		maxHeight = 300,
		viewportPadding = 16,
		zIndex = 'var(--lumi-z-dropdown)'
	} = options;

	let isOpen = $state(false);
	let position = $state<FloatingPosition>({ top: 0, left: 0 });

	const floatingStyles = $derived(() => {
		const styles: Record<string, string> = {
			position: 'fixed',
			top: `${position.top}px`,
			left: `${position.left}px`,
			zIndex
		};

		if (position.width && matchWidth) {
			styles.width = `${position.width}px`;
		}

		if (position.maxHeight) {
			styles.maxHeight = `${position.maxHeight}px`;
		}

		return styles;
	});

	function calculatePosition(): void {
		const trigger = triggerElement();
		if (!trigger || !isOpen) return;

		const triggerRect = trigger.getBoundingClientRect();
		const viewport = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		let top = triggerRect.bottom + offset;
		let left = triggerRect.left;
		const calculatedWidth = matchWidth ? triggerRect.width : undefined;
		let calculatedMaxHeight = maxHeight;

		// Handle placement variations
		if (placement.includes('top')) {
			top = triggerRect.top - offset;
		}

		if (placement.includes('end')) {
			left = triggerRect.right;
		} else if (placement === 'bottom' || placement === 'top') {
			// Center alignment
			left = triggerRect.left + triggerRect.width / 2;
		}

		// Get floating element dimensions if available
		let floatingWidth = calculatedWidth || 200;
		let floatingHeight = calculatedMaxHeight;

		const floating = floatingElement();
		if (floating) {
			const floatingRect = floating.getBoundingClientRect();
			if (!calculatedWidth) floatingWidth = floatingRect.width || floatingWidth;
			floatingHeight = Math.min(floatingRect.height || floatingHeight, calculatedMaxHeight);
		}

		// Adjust for center alignment
		if (placement === 'bottom' || placement === 'top') {
			left -= floatingWidth / 2;
		}

		// Adjust for end alignment
		if (placement.includes('end') && !placement.includes('top') && !placement.includes('bottom')) {
			left -= floatingWidth;
		}

		// Viewport boundary adjustments - Horizontal
		if (left < viewportPadding) {
			left = viewportPadding;
		} else if (left + floatingWidth > viewport.width - viewportPadding) {
			left = viewport.width - floatingWidth - viewportPadding;
		}

		// Viewport boundary adjustments - Vertical
		if (placement.includes('top')) {
			if (top - floatingHeight < viewportPadding) {
				// Flip to bottom
				top = triggerRect.bottom + offset;
			} else {
				top = top - floatingHeight;
			}
		} else {
			if (top + floatingHeight > viewport.height - viewportPadding) {
				// Try to flip to top
				const topPlacement = triggerRect.top - offset - floatingHeight;
				if (topPlacement >= viewportPadding) {
					top = topPlacement;
				} else {
					// Keep bottom but adjust height
					calculatedMaxHeight = Math.max(100, viewport.height - top - viewportPadding);
				}
			}
		}

		position = {
			top: Math.max(viewportPadding, top),
			left: Math.max(viewportPadding, left),
			width: calculatedWidth,
			maxHeight: calculatedMaxHeight
		};
	}

	function open(): void {
		isOpen = true;
		// Use setTimeout to ensure DOM is updated
		setTimeout(() => calculatePosition(), 0);
	}

	function close(): void {
		isOpen = false;
	}

	function toggle(): void {
		if (isOpen) {
			close();
		} else {
			open();
		}
	}

	function updatePosition(): void {
		if (isOpen) {
			calculatePosition();
		}
	}

	// Auto-update on scroll/resize
	$effect(() => {
		if (isOpen) {
			window.addEventListener('scroll', updatePosition, { passive: true });
			window.addEventListener('resize', updatePosition, { passive: true });

			return () => {
				window.removeEventListener('scroll', updatePosition);
				window.removeEventListener('resize', updatePosition);
			};
		}
	});

	return {
		get isOpen() {
			return isOpen;
		},
		get position() {
			return position;
		},
		get floatingStyles() {
			return floatingStyles();
		},
		open,
		close,
		toggle,
		updatePosition
	};
}
