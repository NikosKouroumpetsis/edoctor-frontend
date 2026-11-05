/** Where a keyed child stands, by its `data-flip-key`. */
export type FlipPositions = Map<string, { left: number; top: number }>;

const KEYED = '[data-flip-key]';
// Under half a pixel is the page's rounding, not a move.
const STILL = 0.5;

/** First: where the keyed children of `container` stand, before the list changes. */
export function measureFlip(container: HTMLElement): FlipPositions {
	const positions: FlipPositions = new Map();
	for (const child of container.querySelectorAll<HTMLElement>(KEYED)) {
		const { left, top } = child.getBoundingClientRect();
		positions.set(child.dataset.flipKey ?? '', { left, top });
	}
	return positions;
}

/**
 * Last, invert, play (U-12.2: the JS only measures, the motion is the child's own CSS `transition`): each child that
 * has moved starts where it stood, with its transition off for that one frame, then its inline styles go and the CSS
 * carries it to its new place. A child `before` does not know, or one that stayed, is left alone.
 */
export function playFlip(container: HTMLElement, before: FlipPositions) {
	for (const child of container.querySelectorAll<HTMLElement>(KEYED)) {
		const from = before.get(child.dataset.flipKey ?? '');
		if (!from) continue;
		const { left, top } = child.getBoundingClientRect();
		const dx = from.left - left;
		const dy = from.top - top;
		if (Math.abs(dx) < STILL && Math.abs(dy) < STILL) continue;
		child.style.transition = 'none';
		child.style.transform = `translate(${dx}px, ${dy}px)`;
		void child.offsetWidth;
		child.style.transition = '';
		child.style.transform = '';
	}
}
