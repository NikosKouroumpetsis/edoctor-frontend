import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import Harness from './search-bar.harness.svelte';

const segmentOf = (id: string) => screen.getByTestId(`search-bar-${id}`);
const inputOf = (id: string) => screen.getByTestId(`search-bar-${id}-input`);
const rowOf = () =>
	screen.getByTestId('search-bar').querySelector('[data-slot="search-bar-row"]') as HTMLElement;
const pillOf = () =>
	screen.getByTestId('search-bar').querySelector('[data-slot="search-bar-pill"]') as HTMLElement;

describe('SearchBar', () => {
	// jsdom draws nothing: one box per element, so the open panel counts as shown (NIT-2) — the dropdown from 744.
	beforeEach(() => {
		vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
			new DOMRect(0, 0, 744, 400)
		] as unknown as DOMRectList);
	});
	afterEach(() => vi.restoreAllMocks());

	it('U-05.4 + U-05.5 (zones by CSS): only from 744, centred, Airbnb’s 850 × 66 from 950', () => {
		render(Harness);
		const bar = screen.getByTestId('search-bar');
		expect(bar).toHaveClass(
			'relative',
			'mx-auto',
			'hidden',
			'w-full',
			'tablet:block',
			'split:max-w-search-bar-w'
		);
		expect(bar).not.toHaveClass('split:max-w-content');
		expect(rowOf()).toHaveClass('min-h-search-pill', 'split:min-h-search-bar-h');
		for (const id of ['what', 'where', 'when'])
			expect(segmentOf(id)).toHaveClass('min-h-search-pill', 'split:min-h-search-bar-h');
	});

	it('U-05.4 (Airbnb): one 64 pill of segments — each its label (12 semibold) over its value or muted placeholder', () => {
		render(Harness);
		expect(rowOf()).toHaveClass(
			'flex',
			'min-h-search-pill',
			'w-full',
			'flex-row',
			'items-center',
			'rounded-full',
			'border',
			'border-border',
			'bg-card',
			'shadow-floating'
		);
		const what = segmentOf('what');
		expect(what).toHaveClass('min-h-search-pill', 'flex-1', 'rounded-full', 'px-6');
		expect(what).toHaveAttribute('aria-expanded', 'false');
		expect(what).toHaveAttribute('aria-haspopup', 'dialog');
		expect(screen.getByText('Τι')).toHaveClass('text-label-md', 'font-semibold', 'text-foreground');
		expect(screen.getByText('Καρδιολόγος')).toHaveClass(
			'line-clamp-1',
			'text-body-sm',
			'text-foreground'
		);
		expect(screen.getByText('Περιοχή')).toHaveClass('text-muted-foreground');
		expect(
			screen.getByTestId('search-bar').querySelectorAll('[data-slot="search-bar-divider"]')
		).toHaveLength(2);
		const submit = screen.getByRole('button', { name: 'Αναζήτηση' });
		expect(submit).toHaveClass(
			'min-h-touch',
			'min-w-touch',
			'rounded-full',
			'bg-accent',
			'text-secondary-foreground'
		);
		expect(submit.querySelector('[data-icon="search"]')).not.toBeNull();
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('U-05.4 (Airbnb): the open segment is a card island on the muted bar, its panel under the bar; the button grows its words', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('where'));
		expect(rowOf()).toHaveClass('bg-muted');
		// U-09.10: the island's card surface is the ONE sliding pill under the segment, no longer the segment's own.
		expect(pillOf()).toHaveClass('bg-card', 'shadow-floating', 'rounded-full');
		expect(pillOf()).toHaveAttribute('data-state', 'open');
		expect(segmentOf('where')).not.toHaveClass('bg-card');
		expect(segmentOf('where')).toHaveAttribute('data-state', 'open');
		expect(inputOf('where')).toHaveAttribute('aria-expanded', 'true');
		expect(segmentOf('what')).not.toHaveClass('bg-card');
		const dividers = screen
			.getByTestId('search-bar')
			.querySelectorAll('[data-slot="search-bar-divider"]');
		expect(dividers[0]).toHaveClass('invisible');
		expect(dividers[1]).toHaveClass('invisible');
		const panel = screen.getByRole('dialog', { name: 'Αναζήτηση' });
		expect(panel).toHaveAttribute('data-testid', 'search-bar-panel');
		expect(screen.getByTestId('search-bar').contains(panel)).toBe(true);
		const submit = screen.getByRole('button', { name: 'Αναζήτηση' });
		expect(submit).toHaveClass('px-4');
		expect(submit).toHaveTextContent('Αναζήτηση');
	});

	// 🔴 Owner 28/10: the search button's words came and went at once and the button jumped from circle to pill; then
	// the lens jumped 17 px on the first frame (centred ⇒ padded) and the words showed cut while their room opened.
	it('U-13.2: the search button grows its words and shrinks back with a motion, the lens steady, the words never cut', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		const submit = screen.getByRole('button', { name: 'Αναζήτηση' });
		const column = submit.querySelector('[data-slot="search-bar-submit-label"]') as HTMLElement;
		const words = submit.querySelector('[data-slot="search-bar-submit-words"]') as HTMLElement;
		expect(submit).toHaveAttribute('data-state', 'closed');
		// 14 + the 20 lens + 14 = the 48 circle: the closed button pads the lens where it already sits.
		expect(submit).toHaveClass(
			'px-3.5',
			'min-w-touch',
			'transition-[padding]',
			'duration-standard'
		);
		expect(submit.querySelector('[data-icon="search"]')).toHaveClass('icon-md');
		expect(column).toHaveClass(
			'grid',
			'grid-cols-[0fr]',
			'transition-[grid-template-columns]',
			'duration-standard',
			'ease-zoom-out'
		);
		expect(words).toHaveClass(
			'opacity-0',
			'transition-opacity',
			'duration-segment',
			'ease-zoom-in'
		);
		expect(column).toHaveAttribute('aria-hidden', 'true');

		await user.click(segmentOf('where'));
		expect(submit).toHaveAttribute('data-state', 'open');
		expect(submit).toHaveClass('px-4');
		expect(submit.querySelector('[data-slot="search-bar-submit-words"]')).toBe(words);
		expect(column).toHaveClass('grid-cols-[1fr]', 'ease-standard');
		expect(words).toHaveClass('opacity-100', 'duration-standard', 'ease-zoom-out');

		await user.keyboard('{Escape}');
		expect(submit).toHaveAttribute('data-state', 'closed');
		expect(submit.querySelector('[data-slot="search-bar-submit-words"]')).toBe(words);
		expect(column).toHaveClass('grid-cols-[0fr]');
		expect(words).toHaveClass('opacity-0');
	});

	it('S-28.2 (Airbnb): choosing «Πού» moves on to «Πότε», the focus with it (MINOR-3); another segment switches the panel without closing', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('where'));
		await user.click(screen.getByRole('option', { name: 'Αττική' }));
		expect(segmentOf('when')).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('Panel when')).toBeInTheDocument();
		await waitFor(() => expect(segmentOf('when')).toHaveFocus());
		expect(segmentOf('where')).toHaveTextContent('Αττική');
		await user.click(segmentOf('what'));
		expect(screen.getByRole('option', { name: 'Καρδιολόγος' })).toBeInTheDocument();
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		await waitFor(() => expect(inputOf('what')).toHaveFocus());
	});

	it('U-05.6 (Airbnb): «Τι» turns into its field in the island, the caret in it; the panel is its listbox', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('what'));
		const input = inputOf('what');
		await waitFor(() => expect(input).toHaveFocus());
		expect(input.tagName).toBe('INPUT');
		expect(screen.getByRole('combobox', { name: 'Τι' })).toBe(input);
		expect(input).toHaveAttribute('aria-autocomplete', 'list');
		expect(input).toHaveAttribute('placeholder', 'Ειδικότητα ή γιατρός');
		const listbox = screen.getByRole('listbox', { name: 'Προτάσεις' });
		expect(input).toHaveAttribute('aria-controls', listbox.id);
		expect(screen.getByRole('dialog').contains(listbox)).toBe(true);
		expect(segmentOf('what')).toHaveClass(
			'flex-row',
			'items-center',
			'gap-2',
			'rounded-full',
			'px-6'
		);
		// U-09.10: the island under the field is the one pill (its card surface), the segment itself is clear.
		expect(segmentOf('what')).not.toHaveClass('bg-card');
		expect(segmentOf('what')).not.toHaveClass('shadow-floating');
		expect(pillOf()).toHaveClass('bg-card', 'shadow-floating');
		expect(screen.getByText('Τι')).toHaveClass('text-label-md', 'font-semibold', 'text-foreground');
		// Every web field writes 16, so iOS Safari never zooms (review R2 of dyad 4, MINOR-1); 48 − 24 of its line.
		expect(input).toHaveClass(
			'-my-3',
			'min-h-touch',
			'w-full',
			'bg-transparent',
			'text-body-lg',
			'text-foreground',
			'placeholder:text-muted-foreground'
		);
		expect(input).not.toHaveClass('text-body-sm');
		expect(input).not.toHaveClass('-my-3.5');
		expect(segmentOf('where').tagName).toBe('BUTTON');
		expect(segmentOf('when').tagName).toBe('BUTTON');
	});

	it('U-05.6: typing filters the panel; the arrows move the active row, Enter picks it — the focus stays in the field', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('what'));
		const input = inputOf('what');
		await waitFor(() => expect(input).toHaveFocus());
		await user.keyboard('καρδ');
		expect(screen.getAllByRole('option')).toHaveLength(2);
		expect(input).toHaveAttribute('aria-expanded', 'true');
		expect(input).not.toHaveAttribute('aria-activedescendant');
		await user.keyboard('{ArrowDown}');
		expect(input).toHaveAttribute('aria-activedescendant', 'harness-what-cardiology');
		expect(screen.getByRole('option', { name: 'Καρδιολόγος' })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await user.keyboard('{ArrowDown}{Enter}');
		expect(input).toHaveValue('Καρδιοχειρουργός');
		expect(input).toHaveFocus();
		await user.clear(input);
		await user.keyboard('ζζζ');
		expect(screen.queryAllByRole('option')).toHaveLength(0);
		expect(input).toHaveAttribute('aria-expanded', 'false');
		await user.keyboard('{ArrowDown}');
		expect(input).not.toHaveAttribute('aria-activedescendant');
	});

	it('U-05.6 + MINOR-2: a press on a row picks it and leaves the caret in the field; the «×» empties it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('what'));
		const input = inputOf('what');
		await user.click(screen.getByRole('option', { name: 'Παθολόγος' }));
		expect(input).toHaveValue('Παθολόγος');
		expect(input).toHaveFocus();
		await user.click(screen.getByRole('button', { name: 'Καθαρισμός' }));
		expect(input).toHaveValue('');
		expect(input).toHaveFocus();
		expect(screen.queryByRole('button', { name: 'Καθαρισμός' })).toBeNull();
		expect(screen.getAllByRole('option')).toHaveLength(3);
	});

	it('U-05.6 (negative): a typed segment without a clear name draws no «×»; «Πότε» is never a field', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('where'));
		await user.keyboard('Αττ');
		expect(inputOf('where')).toHaveValue('Αττ');
		expect(screen.queryByTestId('search-bar-where-clear')).toBeNull();
		await user.click(segmentOf('when'));
		expect(segmentOf('when').tagName).toBe('BUTTON');
		expect(screen.queryByTestId('search-bar-when-input')).toBeNull();
	});

	it('MINOR-3 (S-28.2, keyboard): Enter on «Αττική» in the «Πού» field puts the focus on «Πότε»', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('where'));
		await waitFor(() => expect(inputOf('where')).toHaveFocus());
		await user.keyboard('Αττ{ArrowDown}{Enter}');
		expect(segmentOf('when')).toHaveAttribute('aria-expanded', 'true');
		await waitFor(() => expect(segmentOf('when')).toHaveFocus());
		expect(document.activeElement).not.toBe(document.body);
	});

	it('MINOR-3: Escape from inside the panel or from a field gives the focus back to the segment', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('when'));
		// «Πότε» ⇒ the search button ⇒ the phone header's «×» (jsdom applies no `tablet:hidden`) ⇒ the panel's row.
		await user.tab();
		await user.tab();
		await user.tab();
		expect(screen.getByRole('button', { name: 'Σήμερα' })).toHaveFocus();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await waitFor(() => expect(segmentOf('when')).toHaveFocus());
		await user.click(segmentOf('what'));
		await waitFor(() => expect(inputOf('what')).toHaveFocus());
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await waitFor(() => expect(segmentOf('what')).toHaveFocus());
		expect(segmentOf('what').tagName).toBe('BUTTON');
	});

	it('U-05.6 (Safari): a pressed segment that did not take the focus still puts the caret in its field', async () => {
		render(Harness);
		expect(document.body).toHaveFocus();
		await fireEvent.click(segmentOf('where'));
		await waitFor(() => expect(inputOf('where')).toHaveFocus());
	});

	it('MINOR-3 (negative): a press outside the bar keeps the focus where the user took it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('what'));
		await waitFor(() => expect(inputOf('what')).toHaveFocus());
		const outside = screen.getByRole('button', { name: 'Έξω' });
		await user.click(outside);
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(outside).toHaveFocus();
	});

	it('U-05.4: Escape or a press outside closes the panel; the search button submits', async () => {
		const user = userEvent.setup({ delay: null });
		const onSubmit = vi.fn();
		render(Harness, { props: { onSubmit } });
		await user.click(segmentOf('when'));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		expect(rowOf()).toHaveClass('bg-card');
		await user.click(segmentOf('when'));
		await user.click(screen.getByRole('button', { name: 'Έξω' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
		await user.click(screen.getByRole('button', { name: 'Αναζήτηση' }));
		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it('U-05.4 (negative): without a panel the segments open nothing and promise no popup', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { withPanel: false } });
		expect(segmentOf('what')).not.toHaveAttribute('aria-haspopup');
		await user.click(segmentOf('what'));
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByRole('combobox')).toBeNull();
	});

	// Rewritten from U-09.10 (R2: the pill was `hidden` while closed, appeared and vanished at once, and its slide
	// carried `motion-reduce:transition-none`, so the owner saw it jump, U-12): U-12.3.
	it('U-12.3: ONE pill node moves as a whole between segments either way, 0.25 s on Airbnb’s curve; it fades in and out in place', async () => {
		// jsdom lays nothing out: each segment reports a box of its own, 200 wide and 200 apart along the row.
		const order = ['what', 'where', 'when'];
		const box = (element: HTMLElement, side: 'left' | 'width') => {
			const index = order.indexOf(element.dataset.segmentId ?? '');
			if (index < 0) return 0;
			return side === 'left' ? index * 200 : 180 + index * 10;
		};
		// The pill as the browser styles it when the bar reads its box (the commit before it may glide).
		const frames: { transform: string; className: string }[] = [];
		vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			return box(this, 'left');
		});
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			if (this.dataset.slot === 'search-bar-pill') {
				frames.push({ transform: this.style.transform, className: this.className });
			}
			return box(this, 'width');
		});
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(66);
		vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockReturnValue(0);
		const user = userEvent.setup({ delay: null });
		render(Harness);
		const bar = screen.getByTestId('search-bar');
		const pill = pillOf();

		// Closed: drawn but transparent (no `hidden`), on no segment yet; the fade is its only motion.
		expect(bar.querySelectorAll('[data-slot="search-bar-pill"]')).toHaveLength(1);
		expect(pill).not.toHaveAttribute('hidden');
		expect(pill).toHaveAttribute('aria-hidden', 'true');
		expect(pill).toHaveAttribute('data-state', 'closed');
		for (const name of [
			'absolute',
			'pointer-events-none',
			'transition-opacity',
			'duration-standard',
			'ease-standard',
			'data-[state=closed]:opacity-0'
		]) {
			expect(pill).toHaveClass(name);
		}
		expect(pill.className).not.toMatch(/motion-(reduce|safe):/);

		await user.click(segmentOf('where'));
		await waitFor(() => expect(pill.style.transform).toBe('translate(200px, 0px)'));
		expect(pill).toHaveAttribute('data-state', 'open');
		expect(pill.style.width).toBe('190px');
		expect(pill.style.height).toBe('66px');
		// It took its first place, committed, while it fades in alone (no slide from the corner), then it glides.
		const first = frames.find((frame) => frame.transform === 'translate(200px, 0px)');
		expect(first?.className).toMatch(/(^|\s)transition-opacity(\s|$)/);
		await waitFor(() => expect(pill).toHaveClass('transition-[transform,width,height,opacity]'));

		await user.click(segmentOf('when'));
		await waitFor(() => expect(pill.style.transform).toBe('translate(400px, 0px)'));
		expect(pillOf()).toBe(pill);
		expect(pill.style.width).toBe('200px');
		expect(pill).toHaveClass('transition-[transform,width,height,opacity]', 'duration-standard');
		// Back the other way, «Πότε» ⇒ «Τι»: the same node glides back.
		await user.click(segmentOf('what'));
		await waitFor(() => expect(pill.style.transform).toBe('translate(0px, 0px)'));
		expect(pillOf()).toBe(pill);
		expect(pill).toHaveClass('transition-[transform,width,height,opacity]');
		expect(bar.querySelectorAll('[data-slot="search-bar-pill"]')).toHaveLength(1);

		// Closing: it fades out where it is (its place kept), then waits unseen.
		await user.keyboard('{Escape}');
		await waitFor(() => expect(pill).toHaveAttribute('data-state', 'closed'));
		expect(pill.style.transform).toBe('translate(0px, 0px)');
		expect(pillOf()).toBe(pill);
		await waitFor(() => expect(pill).toHaveClass('transition-opacity'));

		// Opening on another segment: it takes that place unseen and fades in there (no slide across the bar).
		frames.length = 0;
		await user.click(segmentOf('when'));
		await waitFor(() => expect(pill.style.transform).toBe('translate(400px, 0px)'));
		const moved = frames.find((frame) => frame.transform === 'translate(400px, 0px)');
		expect(moved?.className).toMatch(/(^|\s)transition-opacity(\s|$)/);
		expect(pillOf()).toBe(pill);
	});

	it('U-12.3: closing, the panel keeps showing its segment while it fades out', async () => {
		const css = holdTransitions((node) => node.matches('[data-slot="search-panel"]'));
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('when'));
		const panel = screen.getByTestId('search-bar-panel');
		expect(panel).toHaveTextContent('Panel when');
		await user.click(screen.getByRole('button', { name: 'Έξω' }));
		expect(panel).toHaveAttribute('data-state', 'closed');
		expect(panel).toHaveTextContent('Panel when');
		css.end(panel);
		await waitFor(() => expect(panel.isConnected).toBe(false));
	});

	it('U-09.10: the pill follows the open segment’s own box when only that box changes (a long value, a font)', async () => {
		const observed: Element[] = [];
		const callbacks: ResizeObserverCallback[] = [];
		const original = window.ResizeObserver;
		window.ResizeObserver = class {
			constructor(callback: ResizeObserverCallback) {
				callbacks.push(callback);
			}
			observe(target: Element) {
				observed.push(target);
			}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
		onTestFinished(() => {
			window.ResizeObserver = original;
		});
		let width = 180;
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			return this.dataset.segmentId === 'where' ? width : 0;
		});
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(segmentOf('where'));
		await waitFor(() => expect(pillOf().style.width).toBe('180px'));
		expect(observed).toContain(segmentOf('where'));
		// The row keeps its width; only the open segment grows.
		width = 240;
		for (const callback of callbacks) callback([], {} as ResizeObserver);
		await waitFor(() => expect(pillOf().style.width).toBe('240px'));
	});

	it('U-09.10 (negative): no segment draws a card surface of its own, open or closed', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		for (const id of ['what', 'where', 'when']) {
			await user.click(segmentOf(id));
			for (const other of ['what', 'where', 'when']) {
				expect(segmentOf(other)).not.toHaveClass('bg-card');
				expect(segmentOf(other)).not.toHaveClass('shadow-floating');
			}
		}
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', async () => {
		const { baseElement } = render(Harness, { props: { active: 'what' } });
		expect(baseElement.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
