/**
 * Portal action: relocate a node to another container (default `document.body`)
 * so overlays escape ancestor `overflow`/`transform`/stacking contexts. Restores
 * nothing on destroy — the node is simply removed with its component.
 */
import type { Action } from 'svelte/action';

export const portal: Action<HTMLElement, (HTMLElement | string) | undefined> = (node, target) => {
	let resolved: HTMLElement | null = null;

	function mount(to: HTMLElement | string | undefined) {
		if (typeof document === 'undefined') return;
		resolved =
			typeof to === 'string' ? document.querySelector<HTMLElement>(to) : (to ?? document.body);
		resolved?.appendChild(node);
	}

	mount(target);

	return {
		update(next) {
			mount(next);
		},
		destroy() {
			node.remove();
		}
	};
};
