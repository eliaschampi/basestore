import { tick } from 'svelte';

/**
 * Usage: <div use:portal={'css-selector'}> or <div use:portal={element}>
 * Default target is document.body
 */
export function portal(node: HTMLElement, target: HTMLElement | string = 'body') {
	let targetEl: HTMLElement | null = null;

	async function update(newTarget: HTMLElement | string) {
		targetEl = typeof newTarget === 'string' ? document.querySelector(newTarget) : newTarget;
		if (targetEl) {
			targetEl.appendChild(node);
			node.hidden = false;
		} else {
			// If target doesn't exist yet, wait a tick and try again
			await tick();
			targetEl = typeof newTarget === 'string' ? document.querySelector(newTarget) : newTarget;
			if (targetEl) {
				targetEl.appendChild(node);
				node.hidden = false;
			}
		}
	}

	function destroy() {
		if (node.parentNode) {
			node.parentNode.removeChild(node);
		}
	}

	update(target);

	return {
		update,
		destroy
	};
}
