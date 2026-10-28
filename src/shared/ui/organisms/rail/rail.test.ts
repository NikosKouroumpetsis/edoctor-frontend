import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Snippet } from 'svelte';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { spacing, step } from '$shared/design/tokens';
import Harness from './rail.harness.svelte';
import type { RailContent, RailTrailing } from './index';

/** The kit's focus ring (`focus-visible:ring-3`, `design-tokens.md`), drawn outside a card's box, no offset. */
const RING = 3;
type Side = 'top' | 'right' | 'bottom' | 'left';
const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];
const SIDES_OF: Record<string, Side[]> = {
	'': SIDES,
	x: ['left', 'right'],
	y: ['top', 'bottom'],
	t: ['top'],
	r: ['right'],
	b: ['bottom'],
	l: ['left']
};

/** jsdom has no CSS: the padding, margin and scroll padding of each side in px, from the element's step classes. */
function boxOf(element: HTMLElement) {
	const none = (): Record<Side, number> => ({ top: 0, right: 0, bottom: 0, left: 0 });
	const box = { padding: none(), margin: none(), scrollPadding: none() };
	for (const token of element.classList) {
		const match = /^(-?)(scroll-p|p|m)([xytrbl]?)-(\d+(?:\.5)?)$/.exec(token);
		if (!match) continue;
		const [, negative, family, axis, count] = match;
		const target = family === 'p' ? box.padding : family === 'm' ? box.margin : box.scrollPadding;
		for (const side of SIDES_OF[axis]) target[side] = (negative ? -1 : 1) * step(Number(count));
	}
	return box;
}

const itemsOf = () => {
	const items = screen.getByTestId('rail').querySelector<HTMLElement>('[data-slot="rail-items"]');
	if (!items) throw new Error('rail items missing');
	return items;
};

/** jsdom has no layout: give the row a width, a content width and a position, then let it scroll. */
async function layout(
	items: HTMLElement,
	{ scrollLeft, scrollWidth = 1000 }: { scrollLeft: number; scrollWidth?: number }
) {
	Object.defineProperty(items, 'clientWidth', { configurable: true, value: 400 });
	Object.defineProperty(items, 'scrollWidth', { configurable: true, value: scrollWidth });
	Object.defineProperty(items, 'scrollLeft', { configurable: true, value: scrollLeft });
	await fireEvent.scroll(items);
}

describe('Rail', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1 (K2.3): the CarouselSection header (title 20 → 22 bold, subtitle muted) over a snapping row of cards, 12 apart', () => {
		render(Harness);
		expect(screen.getByRole('heading', { level: 2, name: 'Δημοφιλείς' })).toHaveClass(
			'text-title-lg',
			'tablet:text-heading-sm',
			'font-bold'
		);
		expect(screen.getByText('Αυτή την εβδομάδα')).toHaveClass(
			'text-body-md',
			'text-muted-foreground'
		);
		expect(screen.getByTestId('rail')).toHaveClass('gap-3.5');
		const items = itemsOf();
		expect(items).toHaveClass(
			'flex',
			'flex-row',
			'gap-3',
			'pb-1',
			'overflow-x-auto',
			'snap-x',
			'snap-mandatory',
			'*:snap-start',
			'*:shrink-0',
			'scroll-smooth'
		);
		// U-12.1: it scrolls smoothly whatever the motion setting (R2's `motion-safe:` is gone).
		expect(items).not.toHaveClass('motion-safe:scroll-smooth');
		expect(items).not.toHaveClass('container-bleed');
		expect(screen.getAllByRole('link')).toHaveLength(4);
	});

	it('U-03.1 (K2.3, MINOR-2): separated puts the application’s slot BETWEEN the cards — its 16 (20) padding and a 1 px line, outside both', () => {
		render(Harness, { props: { separated: true } });
		const items = itemsOf();
		expect(items).not.toHaveClass('gap-3');
		expect(items.className).not.toMatch(/\*:|border-l/);
		const slots = items.querySelectorAll('[data-slot="rail-separator"]');
		expect(slots).toHaveLength(3);
		for (const slot of slots) {
			expect(slot).toHaveClass(
				'flex',
				'shrink-0',
				'self-stretch',
				'items-center',
				'justify-center',
				'px-4',
				'tablet:px-5'
			);
			expect(slot).toHaveAttribute('aria-hidden', 'true');
			expect(slot.querySelector('[data-slot="separator"]')).toHaveClass(
				'w-px',
				'self-stretch',
				'bg-border/60'
			);
		}
		const cells = items.querySelectorAll('[data-slot="rail-item"]');
		expect(cells).toHaveLength(4);
		for (const cell of cells) {
			expect(cell).toHaveClass('shrink-0', 'snap-start');
			expect(cell.className).not.toMatch(/border|p[lrx]-/);
			expect(cell.firstElementChild?.className).not.toMatch(/border-l|pl-|pr-/);
		}
		expect(items.firstElementChild).toHaveAttribute('data-slot', 'rail-item');
		// U-09.15 (catalog 5ε): after the last cell the application's `endPadding` (default `sm` 12), not a slot —
		// this line pinned the end before that capability came over; the last card still has no line after it.
		expect(items.lastElementChild).toHaveAttribute('data-slot', 'rail-end');
		expect(items.lastElementChild).toHaveClass('w-3');
		expect(items.lastElementChild?.previousElementSibling).toHaveAttribute(
			'data-slot',
			'rail-item'
		);
	});

	it('U-03.1 (K2.3): bleed runs the row into the page gutters and snaps the cards to them', () => {
		render(Harness, { props: { bleed: true } });
		expect(itemsOf()).toHaveClass(
			'container-bleed',
			'scroll-px-gutter-sm',
			'split:scroll-px-gutter-md',
			'desktop:scroll-px-gutter-lg'
		);
	});

	it('U-03.1 (K2.3): a trailing arrow without an action is the static circle, hidden from assistive tech', () => {
		render(Harness, { props: { trailing: {} } });
		const header = screen.getByTestId('rail').querySelector('[data-slot="section-header"]');
		const arrow = header?.querySelector('[data-slot="icon-button"]');
		expect(arrow?.tagName).toBe('SPAN');
		expect(arrow).toHaveAttribute('aria-hidden', 'true');
		expect(arrow).toHaveClass('mt-0.5', 'size-control-sm', 'rounded-full', 'bg-card');
		expect(arrow).not.toHaveClass('size-touch');
		expect(arrow?.querySelector('[data-icon="arrow-forward"]')).not.toBeNull();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('U-03.1 (K2.3): a trailing arrow with an action is a 40 card circle named by the caller', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Harness, { props: { trailing: { label: 'Όλοι', onclick } } });
		const arrow = screen.getByRole('button', { name: 'Όλοι' });
		expect(arrow.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
			'size-control-sm',
			'bg-card'
		);
		await user.click(arrow);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1 (NIT-2, MINOR-2): an acting arrow needs its name, and separated takes items, not children', () => {
		const stub = (() => {}) as unknown as Snippet;
		const trailings: RailTrailing[] = [
			{},
			{ label: 'Όλοι', onclick: () => {} },
			{ label: 'Όλοι', href: '/el' },
			// @ts-expect-error a pressable arrow without a name
			{ onclick: () => {} },
			// @ts-expect-error a link arrow without a name
			{ href: '/el' }
		];
		const contents: RailContent<string>[] = [
			{ children: stub },
			{ variant: 'separated', items: ['α'], renderItem: stub as Snippet<[string, number]> },
			// @ts-expect-error the separated row needs its cells as items (its slot sits between two cells)
			{ variant: 'separated', children: stub }
		];
		expect([trailings.length, contents.length]).toEqual([5, 3]);
	});

	it('U-03.1 (from the application, its NIT-3): the row’s classes go with the gap row only, never with separated', () => {
		const stub = (() => {}) as unknown as Snippet;
		const cell = stub as Snippet<[string, number]>;
		const contents: RailContent<string>[] = [
			{ children: stub, itemsClass: 'pb-2' },
			{ items: ['α'], renderItem: cell, itemsClass: 'pb-2' },
			{ variant: 'separated', items: ['α'], renderItem: cell },
			// @ts-expect-error the separated row owns its geometry (the application refuses itemsClassName there)
			{ variant: 'separated', items: ['α'], renderItem: cell, itemsClass: 'pb-2' }
		];
		expect(contents).toHaveLength(4);
	});

	it('U-03.1 (K2.3): no arrows without their names; with them they show from laptop (or the zone named) and control the row', () => {
		const view = render(Harness);
		expect(screen.getByTestId('rail').querySelector('[data-slot="rail-controls"]')).toBeNull();
		view.unmount();
		const other = render(Harness, { props: { withControls: true } });
		const controls = screen.getByTestId('rail').querySelector('[data-slot="rail-controls"]');
		expect(controls).toHaveClass('hidden', 'laptop:flex');
		const previous = screen.getByRole('button', { name: 'Προηγούμενα' });
		const next = screen.getByRole('button', { name: 'Επόμενα' });
		expect(previous).toHaveAttribute('aria-controls', itemsOf().id);
		expect(next).toHaveAttribute('aria-controls', itemsOf().id);
		other.unmount();
		render(Harness, { props: { withControls: true, controlsFrom: 'tablet' } });
		expect(screen.getByTestId('rail').querySelector('[data-slot="rail-controls"]')).toHaveClass(
			'hidden',
			'tablet:flex'
		);
	});

	it('U-03.1 (K2.3): the arrows are off until the row is measured, then follow its ends and page by its width', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { withControls: true } });
		const previous = screen.getByRole('button', { name: 'Προηγούμενα' });
		const next = screen.getByRole('button', { name: 'Επόμενα' });
		expect(previous).toBeDisabled();
		expect(next).toBeDisabled();

		const items = itemsOf();
		const scrollBy = vi.fn();
		items.scrollBy = scrollBy;
		await layout(items, { scrollLeft: 0 });
		expect(previous).toBeDisabled();
		expect(next).toBeEnabled();
		await user.click(next);
		expect(scrollBy).toHaveBeenCalledWith({ left: 400 });

		await layout(items, { scrollLeft: 600 });
		expect(previous).toBeEnabled();
		expect(next).toBeDisabled();
		await user.click(previous);
		expect(scrollBy).toHaveBeenLastCalledWith({ left: -400 });
	});

	it('U-03.1 (NIT-4 of dyad 3): at an end, the focus on the arrow that turns off moves to the other arrow', async () => {
		render(Harness, { props: { withControls: true } });
		const previous = screen.getByRole('button', { name: 'Προηγούμενα' });
		const next = screen.getByRole('button', { name: 'Επόμενα' });
		const items = itemsOf();
		// A two-page row: both arrows flip in one update, at either end.
		await layout(items, { scrollLeft: 0 });
		next.focus();
		await layout(items, { scrollLeft: 600 });
		expect(next).toBeDisabled();
		expect(previous).toHaveFocus();
		await layout(items, { scrollLeft: 0 });
		expect(previous).toBeDisabled();
		expect(next).toHaveFocus();
	});

	it('U-03.1 (MINOR-3): new cells of the same height (skeletons ⇒ cards) are measured too, with no scroll', async () => {
		const view = render(Harness, { props: { withControls: true, cards: ['Α', 'Β'] } });
		const items = itemsOf();
		await layout(items, { scrollLeft: 0, scrollWidth: 400 });
		const next = screen.getByRole('button', { name: 'Επόμενα' });
		expect(next).toBeDisabled();
		Object.defineProperty(items, 'scrollWidth', { configurable: true, value: 1000 });
		await view.rerender({ withControls: true, cards: ['Α', 'Β', 'Γ', 'Δ', 'Ε', 'Ζ'] });
		await waitFor(() => expect(next).toBeEnabled());
	});

	it('U-02.1/S-28.2 (W-LIVE-2): the row holds a card’s focus ring on all four sides and a negative margin gives the room back, so no card moves (gap, separated, with arrows)', () => {
		for (const props of [{}, { separated: true }, { withControls: true }]) {
			const view = render(Harness, { props });
			const { padding, margin, scrollPadding } = boxOf(itemsOf());
			for (const side of SIDES) expect(padding[side], side).toBeGreaterThanOrEqual(RING);
			// The cards stay where they were: padding + margin = 0 above and at both sides …
			expect([
				padding.top + margin.top,
				padding.left + margin.left,
				padding.right + margin.right
			]).toEqual([0, 0, 0]);
			// … and below, the former 4 (`pb-1`) without a margin, so the page under the rail stays put.
			expect([padding.bottom, margin.bottom]).toEqual([step(1), 0]);
			// The snap port starts at the cards' edge, not the padding's: the first card snaps where it did.
			expect([scrollPadding.left, scrollPadding.right]).toEqual([padding.left, padding.right]);
			view.unmount();
		}
	});

	it('U-02.1/S-28.2 (W-LIVE-2): bleed — the gutters hold the ring at the sides (`container-bleed` alone owns them); above, the same 4 given back', () => {
		render(Harness, { props: { bleed: true } });
		const items = itemsOf();
		const { padding, margin } = boxOf(items);
		expect([padding.top, margin.top, padding.bottom, margin.bottom]).toEqual([
			step(1),
			-step(1),
			step(1),
			0
		]);
		expect(padding.top).toBeGreaterThanOrEqual(RING);
		// No step class at the sides: it would fight the bleed's own margin and padding in the cascade.
		expect([padding.left, padding.right, margin.left, margin.right]).toEqual([0, 0, 0, 0]);
		expect(items.className).not.toMatch(/(^|\s)scroll-px-1(\s|$)/);
		expect(items).toHaveClass('container-bleed', 'scroll-px-gutter-sm');
		const gutters = [spacing['gutter-sm'], spacing['gutter-md'], spacing['gutter-lg']];
		expect(Math.min(...gutters)).toBeGreaterThanOrEqual(RING);
	});

	it('U-02.1/S-28.2 (W-LIVE-2): one press of an arrow still moves the row by the cards’ visible width, not by the room', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { withControls: true } });
		const items = itemsOf();
		const { padding, scrollPadding } = boxOf(items);
		// What a browser reports for cards that see 400: the padding box is wider by the room at both sides.
		const cardsWidth = 400;
		Object.defineProperty(items, 'clientWidth', {
			configurable: true,
			value: cardsWidth + padding.left + padding.right
		});
		Object.defineProperty(items, 'scrollWidth', { configurable: true, value: 1000 });
		Object.defineProperty(items, 'scrollLeft', { configurable: true, value: 0 });
		const real = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
			element === items
				? ({ scrollPaddingLeft: `${scrollPadding.left}px` } as CSSStyleDeclaration)
				: real(element, pseudo)
		);
		const scrollBy = vi.fn();
		items.scrollBy = scrollBy;
		await fireEvent.scroll(items);
		await user.click(screen.getByRole('button', { name: 'Επόμενα' }));
		expect(scrollBy).toHaveBeenCalledWith({ left: cardsWidth });
	});

	it('U-09.15 (5ε): without a title the rail is its row alone — no section, heading, circle or arrows (the application’s)', () => {
		const { container } = render(Harness, {
			props: { separated: true, untitled: true, withControls: true }
		});
		const rail = screen.getByTestId('rail');
		expect(rail.tagName).toBe('DIV');
		expect(container.querySelector('[data-slot="section"]')).toBeNull();
		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.queryByRole('button')).toBeNull();
		expect(rail.querySelector('[data-slot="rail-items"]')).not.toBeNull();
		expect(rail.querySelectorAll('[data-slot="rail-separator"]')).toHaveLength(3);
	});

	it('U-09.15 (5ε): `separated` keeps 12 after the last cell (`sm`), 18 with `md`; the gap row keeps none', () => {
		const sm = render(Harness, { props: { separated: true } });
		const smEnd = sm.container.querySelectorAll('[data-slot="rail-items"] > *');
		expect(smEnd[smEnd.length - 1]).toHaveAttribute('data-slot', 'rail-end');
		expect(smEnd[smEnd.length - 1]).toHaveClass('w-3', 'shrink-0');
		sm.unmount();
		const md = render(Harness, { props: { separated: true, endPadding: 'md' } });
		expect(md.container.querySelector('[data-slot="rail-end"]')).toHaveClass('w-4.5');
		md.unmount();
		const gap = render(Harness);
		expect(gap.container.querySelector('[data-slot="rail-end"]')).toBeNull();
	});
});
