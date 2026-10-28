import { onTestFinished } from 'vitest';

/**
 * CSS leaves for the rest of one test (U-12.2). jsdom runs no CSS, so a leaving layer (`Presence`) finds nothing
 * moving and goes at once. Here the nodes `moving` accepts report a running transition of their own
 * (`getAnimations()`), as a browser's would during a CSS leave, until `end(node)` finishes it and fires its
 * `transitionend`. The stub is taken off when the test finishes.
 */
export function holdTransitions(moving: (node: Element) => boolean = () => true) {
	const ended = new WeakSet<Element>();
	Object.defineProperty(Element.prototype, 'getAnimations', {
		configurable: true,
		value(this: Element) {
			return moving(this) && !ended.has(this)
				? [{ playState: 'running', transitionProperty: 'opacity' }]
				: [];
		}
	});
	onTestFinished(() => {
		Reflect.deleteProperty(Element.prototype, 'getAnimations');
	});
	return {
		/** The node's own transition ends. */
		end(node: Element) {
			ended.add(node);
			node.dispatchEvent(new Event('transitionend', { bubbles: true }));
		}
	};
}
