/** The two arrows of a scroller (a rail, a gallery) and whether each one can still move it. */
export type ScrollArrows = { previous: HTMLElement | null; next: HTMLElement | null };
export type ScrollArrowsEnabled = { previous: boolean; next: boolean };

/**
 * At an end of the scroller, the arrow that holds the focus is about to turn disabled, and a disabled button drops
 * the focus to the page body: the focus moves to the other arrow instead (review R1 of dyad 3, NIT-4). Called from
 * `$effect.pre` with the new states, so it reads the focus before the DOM changes; the move waits a microtask, for
 * the other arrow may be turning on in the same update (a two-page rail). One helper for `Rail` and `PhotoCarousel`.
 */
export function keepArrowFocus(arrows: ScrollArrows, enabled: ScrollArrowsEnabled): void {
	if (typeof document === 'undefined') return;
	const focused = document.activeElement;
	const target =
		focused === arrows.next && !enabled.next && enabled.previous
			? arrows.previous
			: focused === arrows.previous && !enabled.previous && enabled.next
				? arrows.next
				: null;
	if (target) queueMicrotask(() => target.focus({ preventScroll: true }));
}
