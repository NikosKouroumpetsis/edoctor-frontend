import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './modal-screen.harness.svelte';
import { zoomEnd, MODAL_ZOOM_DURATION } from './index';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import { __getLockCount } from '$shared/lib/headless';

const surface = () => screen.getByRole('dialog');

describe('ModalScreenTemplate', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1, U-04.2: one surface, two shapes by CSS — the whole screen below 744, the Airbnb dialog’s width (568, r24 — five radii) from 744', () => {
		render(Harness);
		const dialog = surface();
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(dialog).toHaveAccessibleName('Διαθεσιμότητα');
		expect(dialog).toHaveClass('fixed', 'inset-0', 'm-0', 'flex', 'flex-col', 'bg-card');
		expect(dialog).toHaveClass(
			'tablet:m-auto',
			'tablet:h-fit',
			'tablet:max-h-sheet-xl',
			'tablet:w-full',
			'tablet:max-w-dialog',
			'tablet:rounded-xl',
			'tablet:shadow-soft'
		);
		expect(dialog).not.toHaveClass('tablet:max-w-form', 'tablet:rounded-2xl');
		// The zoom owns the surface's `transform`: no class moves it (`translate-*`).
		expect(dialog.className).not.toMatch(/(^|[\s:])-?translate-/);
		const backdrop = document.body.querySelector('[data-slot="modal-screen-overlay"]');
		expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-overlay', 'hidden', 'tablet:block');
		expect(dialog.contains(document.activeElement)).toBe(true);
	});

	it('U-03.1: «←» and «×» are the 32 circles at 6 % of the route modals; a missing one keeps its blank', () => {
		const view = render(Harness, { props: { withBack: true } });
		for (const name of ['Πίσω', 'Κλείσιμο']) {
			const button = screen.getByRole('button', { name });
			expect(button.querySelector('[data-slot="icon-button-shape"]')).toHaveClass(
				'size-control-xs',
				'bg-foreground/6'
			);
		}
		expect(screen.getByTestId('back').querySelector('[data-icon="arrow-back"]')).not.toBeNull();
		view.unmount();
		render(Harness, { props: { withClose: false } });
		const header = document.querySelector('[data-slot="modal-screen-header"]');
		expect(header).toHaveClass('flex-row', 'justify-between', 'px-4', 'py-2');
		expect(header?.querySelectorAll('button')).toHaveLength(0);
		expect(header?.querySelectorAll('.size-touch')).toHaveLength(2);
	});

	it('U-03.1: «×» calls onClose and closes; Escape does the same; «←» only calls onBack', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		const onBack = vi.fn();
		render(Harness, { props: { withBack: true, onBack, onClose } });
		await user.click(screen.getByRole('button', { name: 'Πίσω' }));
		expect(onBack).toHaveBeenCalledOnce();
		expect(surface()).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Κλείσιμο' }));
		expect(onClose).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

		await user.click(screen.getByRole('button', { name: 'Άνοιγμα' }));
		expect(surface()).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledTimes(2);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1 (MINOR-7): the backdrop closes it (from 744); a press in a portalled Popover of the content does not', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		render(Harness, { props: { onClose, withPopover: true } });
		await user.click(screen.getByRole('button', { name: 'Ειδικότητα' }));
		const option = await screen.findByRole('button', { name: 'Καρδιολόγος' });
		const modal = screen.getByRole('dialog', { name: 'Διαθεσιμότητα' });
		expect(modal.contains(option)).toBe(false);
		await user.click(option);
		expect(onClose).not.toHaveBeenCalled();
		expect(modal).toBeInTheDocument();
		const backdrop = document.body.querySelector<HTMLElement>('[data-slot="modal-screen-overlay"]');
		await user.click(backdrop as HTMLElement);
		expect(onClose).toHaveBeenCalledOnce();
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Διαθεσιμότητα' })).not.toBeInTheDocument()
		);
	});

	it('U-03.1 (NIT-R2-1): a Popover of the content takes the first Escape alone; the second closes the modal', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		render(Harness, { props: { onClose, withPopover: true } });
		await user.click(screen.getByRole('button', { name: 'Ειδικότητα' }));
		await screen.findByRole('button', { name: 'Καρδιολόγος' });
		await user.keyboard('{Escape}');
		await waitFor(() =>
			expect(screen.queryByRole('button', { name: 'Καρδιολόγος' })).not.toBeInTheDocument()
		);
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.getByRole('dialog', { name: 'Διαθεσιμότητα' })).toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalledOnce();
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Διαθεσιμότητα' })).not.toBeInTheDocument()
		);
	});

	it('U-03.1 (MINOR-7): a panel of the content that handles Escape first keeps the modal open', async () => {
		const user = userEvent.setup({ delay: null });
		const onClose = vi.fn();
		render(Harness, { props: { onClose, withPanel: true } });
		screen.getByRole('textbox', { name: 'Πάνελ' }).focus();
		await user.keyboard('{Escape}');
		expect(onClose).not.toHaveBeenCalled();
		expect(surface()).toBeInTheDocument();
	});

	it('U-03.1 (NIT-5): closing gives the focus back to the control that opened it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initialOpen: false } });
		const opener = screen.getByRole('button', { name: 'Άνοιγμα' });
		opener.focus();
		await user.keyboard('{Enter}');
		expect(surface().contains(document.activeElement)).toBe(true);
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(opener).toHaveFocus();
	});

	it('U-09.7: it opens with the focus on the surface (no ring on the «×»); Tab reaches «←», then «×»', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initialOpen: false, withBack: true } });
		await user.click(screen.getByRole('button', { name: 'Άνοιγμα' }));
		expect(document.activeElement).toBe(surface());
		expect(screen.getByRole('button', { name: 'Κλείσιμο' })).not.toHaveFocus();
		await user.tab();
		expect(screen.getByRole('button', { name: 'Πίσω' })).toHaveFocus();
		await user.tab();
		expect(screen.getByRole('button', { name: 'Κλείσιμο' })).toHaveFocus();
	});

	it('U-03.1: without «×» only the modal’s own controls close it (Escape does nothing)', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { withClose: false } });
		await user.keyboard('{Escape}');
		expect(surface()).toBeInTheDocument();
	});

	it('U-03.1: the title band — display by default, compact for a sentence, a skeleton while it loads', () => {
		const view = render(Harness);
		expect(screen.getByRole('heading', { level: 2, name: 'Διαθεσιμότητα' })).toHaveClass(
			'text-display-sm',
			'font-semibold'
		);
		view.unmount();
		const compact = render(Harness, { props: { titleSize: 'compact' } });
		expect(screen.getByRole('heading', { level: 2 })).toHaveClass('text-heading-md');
		compact.unmount();
		render(Harness, { props: { isTitleLoading: true } });
		expect(screen.queryByRole('heading')).not.toBeInTheDocument();
		expect(surface()).toHaveAttribute('aria-busy', 'true');
		const band = document.querySelector('[data-slot="modal-screen-title-band"]');
		expect(band?.querySelector('[data-slot="skeleton"]')).toHaveClass(
			'h-control-sm',
			'w-2/3',
			'rounded-full'
		);
	});

	it('U-03.1: the scroll column (gutter 24, pt-1 / pb-6 → pt-2 / pb-section from 744), centring and the pinned footer', () => {
		const view = render(Harness, { props: { contentAlignment: 'center', withFooter: true } });
		const scroll = document.querySelector('[data-slot="modal-screen-scroll"]');
		expect(scroll).toHaveClass(
			'overflow-y-auto',
			'px-gutter-sm',
			'pt-1',
			'pb-6',
			'tablet:pt-2',
			'tablet:pb-section',
			'flex',
			'flex-col'
		);
		const content = document.querySelector('[data-slot="modal-screen-content"]');
		expect(content).toHaveClass(
			'mx-auto',
			'max-w-content',
			'gap-section',
			'flex-1',
			'justify-center'
		);
		const footer = document.querySelector('[data-slot="modal-screen-footer"]');
		expect(footer).toHaveClass('border-t', 'border-border/60', 'bg-card');
		expect(footer).toHaveTextContent('Επιβεβαίωση');
		view.unmount();
		render(Harness);
		expect(document.querySelector('[data-slot="modal-screen-footer"]')).toBeNull();
		expect(document.querySelector('[data-slot="modal-screen-content"]')).not.toHaveClass(
			'justify-center'
		);
	});

	it('U-03.1: scrollToOffset scrolls the template’s own column', () => {
		const scrollTo = vi.fn();
		Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
			configurable: true,
			value: scrollTo
		});
		render(Harness, { props: { scrollToOffset: 240 } });
		expect(scrollTo).toHaveBeenCalledWith({ top: 240 });
		delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo;
	});
});

describe('the modal zoom', () => {
	afterEach(() => vi.restoreAllMocks());

	// Rewritten from U-03.1 (K2.5) / U-09.8 / U-09.13 (the Svelte `zoomFromOrigin` / `riseIntoPlace` of R2, still
	// under reduced motion): the same zoom, the same 220 ms and curves, in CSS now (U-12.2), whatever the setting.
	it('U-12.2 (K2.5): the zoom end lays the surface, measured where CSS put it, over the tapped control', () => {
		expect(MODAL_ZOOM_DURATION).toBe(220);
		const box = { left: 0, top: 0, width: 400, height: 800 };
		expect(zoomEnd(box, { x: 100, y: 100, width: 200, height: 56 })).toEqual({
			transform: 'translate(0px,-272px) scale(0.5,0.07)',
			radius: '28px'
		});
		expect(zoomEnd(box, undefined)).toBeNull();
		expect(zoomEnd({ ...box, width: 0 }, { x: 0, y: 0, width: 10, height: 10 })).toBeNull();
		const css = readFileSync(resolve(process.cwd(), 'src/routes/layout.css'), 'utf8');
		expect(css).toMatch(
			/@utility modal-zoom-from \{\s*transform: var\(--modal-zoom-from\);\s*border-radius: var\(--modal-zoom-radius\);\s*\}/
		);
	});

	it('U-12.2: with a control it opens out of it on `out(cubic)` and closes back into it on `in(cubic)`, 220 ms', async () => {
		const origin = { x: 100, y: 100, width: 200, height: 56 };
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			const box = this.matches('[role="dialog"][aria-modal="true"]')
				? { left: 0, top: 0, width: 400, height: 800 }
				: { left: 0, top: 0, width: 0, height: 0 };
			return { ...box, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
		});
		const transitions = holdTransitions();
		const user = userEvent.setup();
		render(Harness, { props: { sourceLayout: origin } });
		const dialog = surface();
		expect(dialog.style.getPropertyValue('--modal-zoom-from')).toBe(
			'translate(0px,-272px) scale(0.5,0.07)'
		);
		expect(dialog.style.getPropertyValue('--modal-zoom-radius')).toBe('28px');
		for (const name of [
			'transition-[transform,border-radius,opacity]',
			'duration-zoom',
			'ease-zoom-in',
			'data-[state=closed]:ease-zoom-out',
			'starting:modal-zoom-from',
			'data-[state=closed]:modal-zoom-from'
		]) {
			expect(dialog).toHaveClass(name);
		}
		expect(dialog).not.toHaveClass('starting:opacity-0');
		// Measured, written and put back in place before the focus moved in: it is on the surface.
		expect(document.activeElement).toBe(dialog);
		expect(__getLockCount()).toBe(1);
		await user.click(screen.getByTestId('close'));
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(dialog).toHaveAttribute('inert');
		// U-12.9: the scroll lock holds until the surface leaves the DOM.
		expect(__getLockCount()).toBe(1);
		transitions.end(dialog);
		transitions.end(dialog.querySelector('[data-slot="modal-screen-panel"]') as HTMLElement);
		transitions.end(
			document.body.querySelector('[data-slot="modal-screen-overlay"]') as HTMLElement
		);
		await waitFor(() => expect(dialog.isConnected).toBe(false));
		expect(__getLockCount()).toBe(0);
	});

	it('U-12.9: a surface unmounted on its way out lets the scroll lock go', async () => {
		holdTransitions();
		const user = userEvent.setup();
		const view = render(Harness);
		const dialog = surface();
		expect(__getLockCount()).toBe(1);
		await user.click(screen.getByTestId('close'));
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(__getLockCount()).toBe(1);
		view.unmount();
		expect(__getLockCount()).toBe(0);
	});

	// Review r1, MINOR-1: R3 measured the box again on every close, mid-zoom too, where `getBoundingClientRect()`
	// carries the running zoom: a close inside the opening's 220 ms ended away from the control, at a wrong size.
	it('U-12.2: a close while the opening zoom still runs goes back into the control; at rest it measures again', async () => {
		const origin = { x: 100, y: 100, width: 200, height: 56 };
		// The surface's box as `getBoundingClientRect()` reports it: its laid-out box, or a box mid-zoom.
		let box = { left: 0, top: 0, width: 400, height: 800 };
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			const rect = this.matches('[role="dialog"][aria-modal="true"]')
				? box
				: { left: 0, top: 0, width: 0, height: 0 };
			return { ...rect, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
		});
		let surfaceMoving = true;
		const isSurface = (node: Element) => node.matches('[role="dialog"][aria-modal="true"]');
		holdTransitions((node) => (isSurface(node) ? surfaceMoving : true));
		const user = userEvent.setup();
		const opened = 'translate(0px,-272px) scale(0.5,0.07)';

		const midZoom = render(Harness, { props: { sourceLayout: origin } });
		const dialog = surface();
		expect(dialog.style.getPropertyValue('--modal-zoom-from')).toBe(opened);
		// Mid-zoom the box is the half-grown one; the close keeps the end measured at the opening.
		box = { left: 100, top: 100, width: 200, height: 400 };
		await user.click(screen.getByTestId('close'));
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(dialog.style.getPropertyValue('--modal-zoom-from')).toBe(opened);
		expect(dialog.style.getPropertyValue('--modal-zoom-radius')).toBe('28px');
		midZoom.unmount();

		// At rest the close measures where CSS draws the surface now (a box that moved since it opened).
		surfaceMoving = false;
		box = { left: 0, top: 0, width: 400, height: 800 };
		render(Harness, { props: { sourceLayout: origin } });
		const resting = surface();
		expect(resting.style.getPropertyValue('--modal-zoom-from')).toBe(opened);
		box = { left: 0, top: 100, width: 400, height: 800 };
		await user.click(screen.getByTestId('close'));
		expect(resting.style.getPropertyValue('--modal-zoom-from')).toBe(
			'translate(0px,-372px) scale(0.5,0.07)'
		);
	});

	it('U-12.2: without a control it fades on the same 220 ms; the panel rises 18 and shows past a third of the zoom', () => {
		render(Harness);
		const dialog = surface();
		expect(dialog).toHaveClass(
			'starting:opacity-0',
			'data-[state=closed]:opacity-0',
			'duration-zoom'
		);
		expect(dialog).not.toHaveClass('starting:modal-zoom-from');
		expect(dialog.style.getPropertyValue('--modal-zoom-from')).toBe('');
		const panel = dialog.querySelector('[data-slot="modal-screen-panel"]');
		for (const name of [
			'transition-[translate,opacity]',
			'duration-zoom',
			'ease-modal-panel-in',
			'data-[state=closed]:ease-modal-panel-out',
			'starting:translate-y-4.5',
			'starting:opacity-0',
			'data-[state=closed]:translate-y-4.5',
			'data-[state=closed]:opacity-0'
		]) {
			expect(panel).toHaveClass(name);
		}
	});

	it('U-12.1 (negative): under reduced motion the same zoom is written and played', () => {
		reduceMotion();
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
			() =>
				({
					left: 0,
					top: 0,
					width: 400,
					height: 800,
					right: 0,
					bottom: 0,
					x: 0,
					y: 0,
					toJSON: () => ({})
				}) as DOMRect
		);
		render(Harness, { props: { sourceLayout: { x: 100, y: 100, width: 200, height: 56 } } });
		const dialog = surface();
		expect(dialog.style.getPropertyValue('--modal-zoom-from')).not.toBe('');
		expect(dialog).toHaveClass('starting:modal-zoom-from', 'duration-zoom');
	});
});
