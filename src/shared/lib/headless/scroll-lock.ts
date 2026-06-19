/**
 * Body scroll lock with reference counting and scrollbar-width compensation.
 *
 * Ported from the legacy `useBodyScrollLock`. Multiple overlays can lock
 * concurrently; the body is only released when the last lock is freed, so a
 * dialog opened over a drawer does not prematurely restore scrolling.
 */
import type { Action } from 'svelte/action';

let lockCount = 0;
let previousPaddingRight = '';
let previousOverflow = '';

function applyLock() {
	if (typeof document === 'undefined') return;
	if (lockCount === 0) {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		previousOverflow = document.body.style.overflow;
		previousPaddingRight = document.body.style.paddingRight;
		document.body.style.overflow = 'hidden';
		if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
	}
	lockCount += 1;
}

function releaseLock() {
	if (typeof document === 'undefined') return;
	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) {
		document.body.style.overflow = previousOverflow;
		document.body.style.paddingRight = previousPaddingRight;
	}
}

/**
 * Imperative API: returns an `unlock` function. Safe to call repeatedly; the
 * returned unlock is idempotent.
 */
export function lockBodyScroll(): () => void {
	applyLock();
	let released = false;
	return () => {
		if (released) return;
		released = true;
		releaseLock();
	};
}

/** Svelte action: lock the body while `enabled` (default true). */
export const scrollLock: Action<HTMLElement, boolean | undefined> = (_node, enabled = true) => {
	let unlock: (() => void) | null = null;

	function sync(on: boolean) {
		if (on && !unlock) unlock = lockBodyScroll();
		else if (!on && unlock) {
			unlock();
			unlock = null;
		}
	}

	sync(enabled !== false);

	return {
		update(next) {
			sync(next !== false);
		},
		destroy() {
			unlock?.();
			unlock = null;
		}
	};
};

/** Test-only: read the current global lock count. */
export function __getLockCount(): number {
	return lockCount;
}
