import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { __getLockCount } from '$shared/lib/headless';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import Harness from './search-panel.harness.svelte';
import { coversScreen } from './index';

/** jsdom has no CSS: draw the panel the way the phone's CSS does (fixed, on screen). */
function asPhone() {
	const real = window.getComputedStyle;
	vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
		const style = real(element, pseudo);
		if ((element as HTMLElement).dataset?.slot === 'search-panel')
			return { ...style, position: 'fixed' } as CSSStyleDeclaration;
		return style;
	});
	vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
		new DOMRect(0, 0, 375, 812)
	] as unknown as DOMRectList);
}

/** jsdom draws nothing: give every element one box, so the panel counts as shown (the dropdown from 744). */
function drawn() {
	vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([
		new DOMRect(0, 0, 744, 400)
	] as unknown as DOMRectList);
}

const panelOf = () => screen.getByTestId('panel');

describe('SearchPanel', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-05.4 (zones by CSS): the whole screen below 744, the dropdown card under the bar from 744', () => {
		render(Harness, { props: { open: true } });
		expect(panelOf()).toHaveAttribute('role', 'dialog');
		expect(panelOf()).toHaveAccessibleName('Αναζήτηση');
		expect(panelOf()).toHaveClass('fixed', 'inset-0', 'z-50', 'flex', 'flex-col', 'bg-background');
		expect(panelOf()).toHaveClass(
			'tablet:absolute',
			'tablet:inset-auto',
			'tablet:top-full',
			'tablet:left-0',
			'tablet:mt-3',
			'tablet:max-h-sheet-md',
			'tablet:w-full',
			'tablet:rounded-xl',
			'tablet:bg-card',
			'tablet:shadow-overlay'
		);
		const header = panelOf().querySelector('[data-slot="search-panel-header"]');
		expect(header).toHaveClass('tablet:hidden');
		expect(header?.querySelector('h2')).toHaveTextContent('Αναζήτηση');
		expect(screen.getByRole('button', { name: 'Κλείσιμο' })).toBeInTheDocument();
		expect(panelOf().querySelector('[data-slot="search-panel-scroll"]')).toHaveClass(
			'min-h-0',
			'flex-1',
			'overflow-y-auto',
			'px-3.5',
			'pb-section',
			'tablet:px-2',
			'tablet:pt-4',
			'tablet:pb-6'
		);
		expect(panelOf().querySelector('[data-slot="search-panel-footer"]')).toHaveClass(
			'tablet:hidden'
		);
	});

	it('U-05.4 (dropdown): not modal — no trap, no scroll lock, the focus stays on the bar', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		const opener = screen.getByRole('button', { name: 'Πού' });
		await user.click(opener);
		expect(panelOf()).toHaveAttribute('data-shape', 'dropdown');
		expect(panelOf()).not.toHaveAttribute('aria-modal');
		expect(opener).toHaveFocus();
		expect(__getLockCount()).toBe(0);
	});

	it('U-05.4 (phone): modal — the focus moves in and is held, the page does not scroll; it comes back on close', async () => {
		const user = userEvent.setup({ delay: null });
		asPhone();
		const onClose = vi.fn();
		render(Harness, { props: { onClose } });
		const opener = screen.getByRole('button', { name: 'Πού' });
		await user.click(opener);
		await waitFor(() => expect(panelOf()).toHaveAttribute('data-shape', 'screen'));
		expect(panelOf()).toHaveAttribute('aria-modal', 'true');
		const close = screen.getByRole('button', { name: 'Κλείσιμο' });
		// U-09.7 moved the first focus from the «×» to the panel itself (no ring on open); Tab reaches the «×».
		expect(document.activeElement).toBe(panelOf());
		expect(close).not.toHaveFocus();
		expect(__getLockCount()).toBe(1);
		await user.tab({ shift: true });
		expect(screen.getByRole('button', { name: 'Αναζήτηση γιατρών' })).toHaveFocus();
		await user.tab();
		expect(close).toHaveFocus();
		await user.click(close);
		await waitFor(() => expect(screen.queryByTestId('panel')).not.toBeInTheDocument());
		expect(onClose).toHaveBeenCalledOnce();
		expect(opener).toHaveFocus();
		expect(__getLockCount()).toBe(0);
	});

	it('U-05.4: Escape and a press outside close it; a press on the bar (its anchor) does not', async () => {
		const user = userEvent.setup({ delay: null });
		drawn();
		const onClose = vi.fn();
		render(Harness, { props: { open: true, onClose } });
		await user.click(screen.getByTestId('anchor'));
		expect(panelOf()).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Αθήνα' }));
		expect(panelOf()).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByTestId('panel')).not.toBeInTheDocument());
		expect(onClose).toHaveBeenCalledTimes(1);
		await user.click(screen.getByRole('button', { name: 'Πού' }));
		await user.click(screen.getByRole('button', { name: 'Έξω' }));
		await waitFor(() => expect(screen.queryByTestId('panel')).not.toBeInTheDocument());
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it('U-05.4 (negative, NIT-1): a fixed panel in a hidden parent (the bar below 744) never takes the screen', () => {
		const panel = document.createElement('div');
		panel.dataset.slot = 'search-panel';
		document.body.append(panel);
		const real = window.getComputedStyle;
		vi.spyOn(window, 'getComputedStyle').mockImplementation(
			(element, pseudo) => ({ ...real(element, pseudo), position: 'fixed' }) as CSSStyleDeclaration
		);
		const rects = vi
			.spyOn(Element.prototype, 'getClientRects')
			.mockReturnValue([] as unknown as DOMRectList);
		expect(coversScreen(panel)).toBe(false);
		rects.mockReturnValue([new DOMRect(0, 0, 375, 812)] as unknown as DOMRectList);
		expect(coversScreen(panel)).toBe(true);
		vi.mocked(window.getComputedStyle).mockImplementation(
			(element, pseudo) =>
				({ ...real(element, pseudo), position: 'absolute' }) as CSSStyleDeclaration
		);
		expect(coversScreen(panel)).toBe(false);
		panel.remove();
	});

	it('U-05.4 (negative, NIT-2): an open panel that is not drawn keeps neither the page’s Escape nor its presses', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		const hidden = render(Harness, { props: { open: true, onClose } });
		expect(panelOf()).toBeInTheDocument();
		expect(await fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(true);
		await user.click(screen.getByRole('button', { name: 'Έξω' }));
		expect(panelOf()).toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
		hidden.unmount();
		// The same panel drawn: the Escape is its own (consumed) and closes it.
		drawn();
		render(Harness, { props: { open: true, onClose } });
		expect(await fireEvent.keyDown(document.body, { key: 'Escape' })).toBe(false);
		expect(onClose).toHaveBeenCalledOnce();
	});

	// Rewritten from U-09.8 / U-09.13 (a Svelte `overlayFade`, in place under reduced motion, R2): the fade is CSS
	// now (U-12.2), Airbnb's 0.25 s in and out, and it plays whatever the setting (U-12.1).
	it('U-12.2: it fades in and out on Airbnb’s 0.25 s in CSS; its trap and keys let go as the fade out starts, its lock at the end', async () => {
		const user = userEvent.setup({ delay: null });
		const animate = vi.spyOn(Element.prototype, 'animate');
		const css = holdTransitions();
		asPhone();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Πού' }));
		const panel = panelOf() as HTMLElement;
		for (const name of [
			'transition-opacity',
			'duration-standard',
			'ease-standard',
			'starting:opacity-0',
			'data-[state=closed]:opacity-0',
			'data-[state=closed]:pointer-events-none'
		]) {
			expect(panel).toHaveClass(name);
		}
		await waitFor(() => expect(__getLockCount()).toBe(1));
		await user.keyboard('{Escape}');
		expect(panel).toHaveAttribute('data-state', 'closed');
		expect(panel).toHaveAttribute('inert');
		// The scroll lock goes with the panel, at the fade out's end (review r1 §8).
		expect(__getLockCount()).toBe(1);
		css.end(panel);
		await waitFor(() => expect(panel.isConnected).toBe(false));
		expect(__getLockCount()).toBe(0);
		expect(animate).not.toHaveBeenCalled();
	});

	it('U-12.1 (negative): under reduced motion the panel still fades out (it waits for its transition)', async () => {
		reduceMotion();
		holdTransitions();
		render(Harness, { props: { open: true } });
		const panel = panelOf() as HTMLElement;
		expect(panel).toHaveClass('starting:opacity-0', 'duration-standard');
		await fireEvent.click(screen.getByRole('button', { name: 'Κλείσιμο' }));
		expect(panel).toHaveAttribute('data-state', 'closed');
		expect(panel.isConnected).toBe(true);
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { baseElement } = render(Harness, { props: { open: true } });
		expect(baseElement.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
