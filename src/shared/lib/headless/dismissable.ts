/**
 * Dismissable-layer action: invokes a handler on outside pointer-down or the
 * Escape key. Used by every dismissible overlay (popover, dropdown, dialog,
 * tooltip, combobox).
 *
 * Replaces the legacy `onFocusOutside` helper with pointer + keyboard coverage
 * and an `ignore` list so the triggering element does not self-dismiss.
 */
import type { Action } from 'svelte/action';

export interface DismissableOptions {
	/** When false the layer is inert. Default true. */
	enabled?: boolean;
	/** Called on outside pointer-down OR Escape. */
	onDismiss?: () => void;
	/** Called specifically on outside pointer-down (before `onDismiss`). */
	onPointerDownOutside?: (event: PointerEvent) => void;
	/** Called specifically on Escape (before `onDismiss`). */
	onEscapeKeydown?: (event: KeyboardEvent) => void;
	/** Elements (e.g. the trigger) whose interactions must NOT dismiss. */
	ignore?: (HTMLElement | null | undefined)[];
}

export const dismissable: Action<HTMLElement, DismissableOptions | undefined> = (node, params) => {
	let opts: DismissableOptions = { enabled: true, ...params };

	function isIgnored(target: Node | null): boolean {
		if (!target) return false;
		if (node.contains(target)) return true;
		return (opts.ignore ?? []).some((el) => el?.contains(target));
	}

	function onPointerDown(event: PointerEvent) {
		if (opts.enabled === false) return;
		if (isIgnored(event.target as Node)) return;
		opts.onPointerDownOutside?.(event);
		if (!event.defaultPrevented) opts.onDismiss?.();
	}

	function onKeydown(event: KeyboardEvent) {
		if (opts.enabled === false) return;
		if (event.key !== 'Escape') return;
		opts.onEscapeKeydown?.(event);
		if (!event.defaultPrevented) opts.onDismiss?.();
	}

	function attach() {
		if (typeof document === 'undefined') return;
		// Capture phase so we react before inner stopPropagation handlers.
		document.addEventListener('pointerdown', onPointerDown, true);
		document.addEventListener('keydown', onKeydown, true);
	}

	function detach() {
		if (typeof document === 'undefined') return;
		document.removeEventListener('pointerdown', onPointerDown, true);
		document.removeEventListener('keydown', onKeydown, true);
	}

	attach();

	return {
		update(next) {
			opts = { enabled: true, ...next };
		},
		destroy() {
			detach();
		}
	};
};
