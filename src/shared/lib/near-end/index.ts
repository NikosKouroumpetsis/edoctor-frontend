import type { Action } from 'svelte/action';

/**
 * The next page as the end of a list nears the screen (screen 50's list, the inbox's way; wave 5.1 · D-W51-29 the
 * doctor's «Ιστορικό» too): `onNear` runs each time the node starts to show. Without an `IntersectionObserver` (the
 * server's render, an old browser) nothing is observed. A caller that wants another look after a page that left the
 * node on screen draws the node again (`{#key}`): observing starts with the node's state.
 */
export const nearEnd: Action<HTMLElement, () => void> = (node, onNear) => {
	if (typeof IntersectionObserver === 'undefined') return;
	let current = onNear;
	const observer = new IntersectionObserver(([entry]) => {
		if (entry?.isIntersecting) current();
	});
	observer.observe(node);
	return {
		update(next) {
			current = next;
		},
		destroy() {
			observer.disconnect();
		}
	};
};
