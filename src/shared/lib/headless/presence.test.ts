import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { reduceMotion } from '../../../../vitest-mocks/reduce-motion';
import Harness from './presence.harness.svelte';
import { leaveTimeout } from './motion';

/**
 * jsdom has no CSS, so no transition ever runs: `moving` stands for the browser's `getAnimations()` (the node's own
 * running transitions) — the nodes in it are still moving. Removed after each test.
 */
const moving = new Set<Element>();
function stubAnimations() {
	Object.defineProperty(Element.prototype, 'getAnimations', {
		configurable: true,
		value(this: Element) {
			return moving.has(this) ? [{ playState: 'running', transitionProperty: 'opacity' }] : [];
		}
	});
}

const transitionEnd = (target: Element) =>
	target.dispatchEvent(new Event('transitionend', { bubbles: true }));

describe('Presence (U-12.2)', () => {
	afterEach(() => {
		moving.clear();
		Reflect.deleteProperty(Element.prototype, 'getAnimations');
		vi.useRealTimers();
	});

	it('U-12.2: on a close the layer stays, `closed` and inert, until ITS OWN transition ends — not a child’s', async () => {
		stubAnimations();
		const view = render(Harness, { props: { open: true } });
		const layer = screen.getByTestId('layer');
		expect(layer).toHaveAttribute('data-state', 'open');
		expect(layer.inert).toBeFalsy();
		moving.add(layer);

		await view.rerender({ open: false });
		expect(screen.getByTestId('layer')).toBe(layer);
		expect(layer).toHaveAttribute('data-state', 'closed');
		expect(layer.inert).toBe(true);
		expect(layer).toHaveClass('data-[state=closed]:pointer-events-none');

		// A child's transition bubbles up to the layer: it is not the layer's own, so the layer stays.
		transitionEnd(screen.getByTestId('child'));
		flushSync();
		expect(screen.getByTestId('layer')).toBe(layer);

		moving.delete(layer);
		transitionEnd(layer);
		flushSync();
		expect(screen.queryByTestId('layer')).not.toBeInTheDocument();
	});

	it('U-12.2: a transition that never reports its end: the layer goes at the token’s 250 ms and the grace', async () => {
		stubAnimations();
		vi.useFakeTimers();
		const view = render(Harness, { props: { open: true } });
		moving.add(screen.getByTestId('layer'));
		await view.rerender({ open: false });
		vi.advanceTimersByTime(leaveTimeout('standard') - 1);
		flushSync();
		expect(screen.getByTestId('layer')).toHaveAttribute('data-state', 'closed');
		vi.advanceTimersByTime(1);
		flushSync();
		expect(screen.queryByTestId('layer')).not.toBeInTheDocument();
	});

	it('U-12.2: opening again on the way out keeps the SAME node (the CSS turns back) and calls the removal off', async () => {
		stubAnimations();
		vi.useFakeTimers();
		const view = render(Harness, { props: { open: true } });
		const layer = screen.getByTestId('layer');
		moving.add(layer);
		await view.rerender({ open: false });
		vi.advanceTimersByTime(100);
		await view.rerender({ open: true });
		expect(screen.getByTestId('layer')).toBe(layer);
		expect(layer).toHaveAttribute('data-state', 'open');
		expect(layer.inert).toBe(false);
		vi.advanceTimersByTime(leaveTimeout('standard') * 2);
		transitionEnd(layer);
		flushSync();
		expect(screen.getByTestId('layer')).toBe(layer);
	});

	it('U-12.2: where nothing moves (no transition started) the layer goes at once, with no wait', async () => {
		const view = render(Harness, { props: { open: true } });
		await view.rerender({ open: false });
		expect(screen.queryByTestId('layer')).not.toBeInTheDocument();
	});

	it('U-12.1: under reduced motion the leave is the same — it waits for the layer’s own transition', async () => {
		reduceMotion();
		stubAnimations();
		const view = render(Harness, { props: { open: true } });
		const layer = screen.getByTestId('layer');
		moving.add(layer);
		await view.rerender({ open: false });
		expect(screen.getByTestId('layer')).toHaveAttribute('data-state', 'closed');
		moving.delete(layer);
		transitionEnd(layer);
		flushSync();
		expect(screen.queryByTestId('layer')).not.toBeInTheDocument();
	});
});
