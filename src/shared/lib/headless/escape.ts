/**
 * Escape action scoped to one layer: it closes on an Escape pressed INSIDE the node. It listens on the document in the
 * bubble phase, after the handlers of the layer's content (Svelte delegates `onkeydown` to the document, registered
 * before any layer opens), so a panel or field that takes Escape first (`preventDefault`) keeps it, and a layer
 * portalled elsewhere (the Select or Popover of a dialog's content) never closes the layer under it. The modal
 * overlays pair it with a press on their own backdrop, never an outside pointer-down (`dismissable` stays for
 * popovers and menus).
 */
import type { Action } from 'svelte/action';

export interface EscapeKeydownOptions {
	/** When false the layer ignores Escape. Default true. */
	enabled?: boolean;
	onEscape?: () => void;
}

export const escapeKeydown: Action<HTMLElement, EscapeKeydownOptions | undefined> = (
	node,
	params
) => {
	let opts: EscapeKeydownOptions = { enabled: true, ...params };

	function onKeydown(event: KeyboardEvent) {
		if (opts.enabled === false || event.key !== 'Escape' || event.defaultPrevented) return;
		if (!(event.target instanceof Node) || !node.contains(event.target)) return;
		event.preventDefault();
		opts.onEscape?.();
	}

	if (typeof document !== 'undefined') document.addEventListener('keydown', onKeydown);

	return {
		update(next) {
			opts = { enabled: true, ...next };
		},
		destroy() {
			if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown);
		}
	};
};
