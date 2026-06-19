/**
 * Focus utilities shared by overlay primitives (dialog, drawer, popover, menu).
 *
 * Ported from the legacy `trap-focus` helper but hardened: it restores focus to
 * the previously focused element on teardown, skips hidden/disabled nodes, and
 * is SSR-safe.
 */
import type { Action } from 'svelte/action';

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'textarea:not([disabled])',
	'select:not([disabled])',
	'details > summary:first-of-type',
	'[tabindex]:not([tabindex="-1"])'
].join(',');

/**
 * Enabled, focusable descendants of `container`, in DOM order.
 *
 * Hidden ancestors are skipped via the `hidden` attribute / `aria-hidden`; we
 * intentionally avoid offset-based visibility checks because focus traps only
 * run while their container is already displayed, and offset metrics are
 * unreliable under test (jsdom) and during layout.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
		.filter(
			(el) =>
				!el.hasAttribute('disabled') &&
				el.getAttribute('aria-hidden') !== 'true' &&
				el.tabIndex !== -1 &&
				!el.closest('[hidden]')
		)
		.sort((a, b) =>
			// Grouped selectors are not guaranteed to come back in document order
			// across selector engines; normalise to DOM order.
			a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
		);
}

export interface FocusTrapOptions {
	/** When false the trap is inert (listeners detached). Default true. */
	enabled?: boolean;
	/** Move focus into the container on activation. Default true. */
	autoFocus?: boolean;
	/** Restore focus to the previously focused element on teardown. Default true. */
	restoreFocus?: boolean;
}

/**
 * Svelte action: keep keyboard focus cycling within `node` while enabled.
 *
 * @example  <div use:focusTrap={{ enabled: open }}> ... </div>
 */
export const focusTrap: Action<HTMLElement, FocusTrapOptions | undefined> = (node, params) => {
	let opts: FocusTrapOptions = { enabled: true, autoFocus: true, restoreFocus: true, ...params };
	let previouslyFocused: HTMLElement | null = null;

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const focusable = getFocusableElements(node);
		if (focusable.length === 0) {
			event.preventDefault();
			return;
		}
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		const active = document.activeElement;

		if (event.shiftKey && (active === first || active === node)) {
			last.focus();
			event.preventDefault();
		} else if (!event.shiftKey && active === last) {
			first.focus();
			event.preventDefault();
		}
	}

	function activate() {
		if (typeof document === 'undefined') return;
		previouslyFocused = document.activeElement as HTMLElement | null;
		node.addEventListener('keydown', onKeydown);
		if (opts.autoFocus) {
			const focusable = getFocusableElements(node);
			(focusable[0] ?? node).focus({ preventScroll: true });
		}
	}

	function deactivate() {
		node.removeEventListener('keydown', onKeydown);
		if (opts.restoreFocus) previouslyFocused?.focus?.({ preventScroll: true });
	}

	if (opts.enabled !== false) activate();

	return {
		update(next) {
			const wasEnabled = opts.enabled !== false;
			opts = { enabled: true, autoFocus: true, restoreFocus: true, ...next };
			const isEnabled = opts.enabled !== false;
			if (isEnabled && !wasEnabled) activate();
			else if (!isEnabled && wasEnabled) deactivate();
		},
		destroy() {
			deactivate();
		}
	};
};
