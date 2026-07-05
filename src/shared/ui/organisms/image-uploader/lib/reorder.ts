/**
 * Pure, framework-free reorder helpers shared by the native drag-and-drop
 * handlers and the keyboard/menu reorder paths. Keeping them pure makes the
 * reorder logic deterministically testable independent of the DOM.
 */

/**
 * Move the item at index `from` to index `to`, returning a new array.
 * `to` is clamped into range; an out-of-range `from` is a no-op (copy).
 */
export function move<T>(list: readonly T[], from: number, to: number): T[] {
	const next = list.slice();
	if (from < 0 || from >= next.length) return next;
	const clampedTo = Math.max(0, Math.min(to, next.length - 1));
	if (clampedTo === from) return next;
	const [item] = next.splice(from, 1);
	next.splice(clampedTo, 0, item);
	return next;
}

/** Promote the item at index `from` to the front (index 0) — i.e. set cover. */
export function moveToFront<T>(list: readonly T[], from: number): T[] {
	return move(list, from, 0);
}
