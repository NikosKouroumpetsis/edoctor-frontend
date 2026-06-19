/**
 * Arrow-key roving focus for composite widgets (tabs, radio group, toggle
 * group, menus). Ported from the legacy `useArrowNavigation`.
 *
 * Items opt in by carrying `data-roving-item` and being focusable. The owning
 * component manages the roving `tabindex` (one item `0`, the rest `-1`); this
 * helper only moves DOM focus in response to arrow / Home / End keys.
 */
export type RovingOrientation = 'horizontal' | 'vertical' | 'both';
export type RovingDirection = 'ltr' | 'rtl';

export interface RovingOptions {
	orientation?: RovingOrientation;
	loop?: boolean;
	dir?: RovingDirection;
	itemSelector?: string;
}

const DEFAULT_SELECTOR = '[data-roving-item]:not([data-disabled]):not([disabled])';

export function getRovingItems(container: HTMLElement, selector = DEFAULT_SELECTOR): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(selector));
}

/**
 * Handle a keydown for roving focus. Returns the focused element (or null).
 * Call from the container's `onkeydown`.
 */
export function handleRovingKeydown(
	event: KeyboardEvent,
	container: HTMLElement,
	options: RovingOptions = {}
): HTMLElement | null {
	const { orientation = 'both', loop = true, dir = 'ltr', itemSelector } = options;
	const items = getRovingItems(container, itemSelector);
	if (items.length === 0) return null;

	const current = document.activeElement as HTMLElement | null;
	const currentIndex = current ? items.indexOf(current) : -1;

	const horizontal = orientation === 'horizontal' || orientation === 'both';
	const vertical = orientation === 'vertical' || orientation === 'both';
	const forwardKeys = [
		vertical && 'ArrowDown',
		horizontal && (dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')
	].filter(Boolean);
	const backwardKeys = [
		vertical && 'ArrowUp',
		horizontal && (dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft')
	].filter(Boolean);

	let nextIndex: number;
	if (forwardKeys.includes(event.key)) {
		nextIndex = currentIndex + 1;
		if (nextIndex >= items.length) nextIndex = loop ? 0 : items.length - 1;
	} else if (backwardKeys.includes(event.key)) {
		nextIndex = currentIndex - 1;
		if (nextIndex < 0) nextIndex = loop ? items.length - 1 : 0;
	} else if (event.key === 'Home') {
		nextIndex = 0;
	} else if (event.key === 'End') {
		nextIndex = items.length - 1;
	} else {
		return null;
	}

	event.preventDefault();
	const next = items[nextIndex];
	next?.focus();
	return next ?? null;
}
