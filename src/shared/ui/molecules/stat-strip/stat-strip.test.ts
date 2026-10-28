import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import Harness from './stat-strip.harness.svelte';

/** A `ResizeObserver` the test fires by hand (jsdom draws no box). */
class ManualResizeObserver {
	static last: ManualResizeObserver | null = null;
	constructor(private readonly callback: () => void) {
		ManualResizeObserver.last = this;
	}
	observe() {}
	unobserve() {}
	disconnect() {}
	fire() {
		this.callback();
	}
}

/**
 * jsdom has no layout: the strip is `width` wide, and the wrap cell's words need `needed` of the `room` it has —
 * an unbroken word wider than its room overflows its cell.
 */
function lay(sizes: { width: number; room: number; needed: number }) {
	vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
		if (this.getAttribute('data-slot') === 'stat-strip') return sizes.width;
		return this.getAttribute('data-stat-strip-wrap') === 'true' ? sizes.room : 0;
	});
	vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
		return this.getAttribute('data-stat-strip-wrap') === 'true' ? sizes.needed : 0;
	});
}

/** The document's `FontFaceSet` (jsdom has none): an event target the test fires `loadingdone` on. */
function stubFonts(): EventTarget {
	const fonts = new EventTarget();
	Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
	return fonts;
}

const strip = () => screen.getByTestId('stats');
const cell = (id: string) => screen.getByTestId(`stat-${id}`);

describe('StatStrip', () => {
	afterEach(() => {
		Reflect.deleteProperty(document, 'fonts');
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		ManualResizeObserver.last = null;
	});

	it('U-02.2 (K5.7): one row of cells between hairlines — the wrap cell takes the rest, the others keep their width (M-23)', () => {
		render(Harness, { props: { wrapId: 'badge' } });
		expect(strip()).toHaveClass(
			'-mx-4',
			'min-h-row-lg',
			'py-3',
			'flex',
			'flex-row',
			'items-stretch'
		);
		for (const id of ['rating', 'badge', 'reviews'])
			expect(cell(id)).toHaveClass('flex', 'flex-col', 'justify-center', 'px-4');
		expect(cell('badge')).toHaveClass('min-w-0', 'flex-1');
		expect(cell('rating')).toHaveClass('shrink-0');
		expect(cell('reviews')).toHaveClass('shrink-0', 'border-l', 'border-border/40');
		expect(cell('rating')).not.toHaveClass('border-l');
		expect(screen.queryByTestId('stats-numbers')).toBeNull();
	});

	it('S-26.2: a word of the wrap cell wider than its room ⇒ that cell takes its own line ABOVE the others, whole', async () => {
		lay({ width: 320, room: 96, needed: 140 });
		render(Harness, { props: { wrapId: 'badge' } });
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
		expect(strip()).toHaveClass('-mx-4', 'min-h-row-lg', 'py-3', 'flex', 'flex-col', 'gap-3');
		expect(strip().firstElementChild).toBe(cell('badge'));
		expect(cell('badge')).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'px-4');
		const numbers = screen.getByTestId('stats-numbers');
		expect(numbers).toHaveClass('flex', 'flex-row', 'items-stretch');
		expect([...numbers.children]).toEqual([cell('rating'), cell('reviews')]);
		expect(cell('rating')).toHaveClass('flex', 'flex-1', 'flex-col', 'justify-center', 'px-4');
		expect(cell('rating')).not.toHaveClass('border-l');
		expect(cell('reviews')).toHaveClass('flex-1', 'border-l', 'border-border/40');
	});

	it('S-26.2: decided again by the strip’s OWN width — the same width keeps the line, a wider one tries the row again', async () => {
		vi.stubGlobal('ResizeObserver', ManualResizeObserver);
		const sizes = { width: 320, room: 96, needed: 140 };
		lay(sizes);
		render(Harness, { props: { wrapId: 'badge' } });
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
		// Its height changed with the layout, its width did not: no new decision, no flicker.
		ManualResizeObserver.last?.fire();
		await Promise.resolve();
		expect(strip()).toHaveAttribute('data-layout', 'own-line');
		Object.assign(sizes, { width: 900, room: 420 });
		ManualResizeObserver.last?.fire();
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'row'));
		expect(cell('badge')).toHaveClass('min-w-0', 'flex-1');
	});

	it('S-26.2: new words (another language) decide again at the same width', async () => {
		const sizes = { width: 320, room: 96, needed: 140 };
		lay(sizes);
		const view = render(Harness, { props: { wrapId: 'badge' } });
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
		sizes.needed = 80;
		await view.rerender({ wrapId: 'badge', wrapText: 'Top pick' });
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'row'));
		expect(cell('badge')).toHaveTextContent('Top pick');
	});

	it('S-26.2 (MINOR-2): in the row, a word that starts to overflow at the SAME width takes its own line, and the wrap cell is watched', async () => {
		vi.stubGlobal('ResizeObserver', ManualResizeObserver);
		const observe = vi.spyOn(ManualResizeObserver.prototype, 'observe');
		const sizes = { width: 320, room: 200, needed: 140 };
		lay(sizes);
		render(Harness, { props: { wrapId: 'badge' } });
		await waitFor(() => expect(observe).toHaveBeenCalledWith(cell('badge')));
		expect(observe).toHaveBeenCalledWith(strip());
		expect(strip()).toHaveAttribute('data-layout', 'row');
		// A larger text or longer numbers: the strip keeps its width, the badge's word no longer fits.
		sizes.needed = 260;
		ManualResizeObserver.last?.fire();
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
	});

	it('S-26.2 (MINOR-2): a font that arrives decides again — the row is tried first — and the listener goes with the strip', async () => {
		const fonts = stubFonts();
		const remove = vi.spyOn(fonts, 'removeEventListener');
		const sizes = { width: 320, room: 96, needed: 140 };
		lay(sizes);
		const view = render(Harness, { props: { wrapId: 'badge' } });
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
		sizes.needed = 80;
		fonts.dispatchEvent(new Event('loadingdone'));
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'row'));
		sizes.needed = 140;
		fonts.dispatchEvent(new Event('loadingdone'));
		await waitFor(() => expect(strip()).toHaveAttribute('data-layout', 'own-line'));
		view.unmount();
		expect(remove).toHaveBeenCalledWith('loadingdone', expect.any(Function));
	});

	it('S-26.2 (NIT-R2-1, negative): a decision still waiting when the strip goes observes nothing after the disconnect', async () => {
		vi.stubGlobal('ResizeObserver', ManualResizeObserver);
		const observe = vi.spyOn(ManualResizeObserver.prototype, 'observe');
		const disconnect = vi.spyOn(ManualResizeObserver.prototype, 'disconnect');
		lay({ width: 320, room: 200, needed: 140 });
		const view = render(Harness, { props: { wrapId: 'badge' } });
		expect(observe).toHaveBeenCalledWith(strip());
		view.unmount();
		expect(disconnect).toHaveBeenCalledTimes(1);
		await Promise.resolve();
		await Promise.resolve();
		await Promise.resolve();
		// Every microtask of the pending decision has run once a task runs.
		await new Promise((resolve) => setTimeout(resolve));
		const disconnectedAt = disconnect.mock.invocationCallOrder[0];
		expect(observe.mock.invocationCallOrder.every((order) => order < disconnectedAt)).toBe(true);
	});

	it('S-26.2 (negative): words that fit keep the row; without a wrap cell every cell keeps its width and nothing is measured', async () => {
		lay({ width: 900, room: 420, needed: 140 });
		const view = render(Harness, { props: { wrapId: 'badge' } });
		await Promise.resolve();
		await Promise.resolve();
		expect(strip()).toHaveAttribute('data-layout', 'row');
		view.unmount();
		render(Harness);
		for (const id of ['rating', 'badge', 'reviews']) expect(cell(id)).toHaveClass('shrink-0');
		expect(strip()).toHaveAttribute('data-layout', 'row');
	});

	it('U-03.1 (zones, light/dark): no zone class — the strip decides by its own box — and only theme tokens', () => {
		const { container } = render(Harness, { props: { wrapId: 'badge' } });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
