import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './bottom-sheet.harness.svelte';
import { snapHeight } from './index';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';

describe('BottomSheet', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1: the drawer from the bottom on the dimmed overlay, card surface rounded xl, the body padding its own', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const sheet = screen.getByRole('dialog', { name: 'Επιλογή χώρας' });
		expect(sheet).toHaveAttribute('data-slot', 'bottom-sheet');
		expect(sheet).toHaveAttribute('data-direction', 'bottom');
		expect(sheet).toHaveClass('bottom-0', 'rounded-t-xl', 'bg-card', 'max-h-sheet-lg');
		expect(sheet.querySelector('[data-slot="drawer-handle"]')).not.toBeNull();
		const body = sheet.querySelector('[data-slot="drawer-body"]');
		expect(body).toHaveClass('p-0', 'gap-0');
		expect(body).not.toHaveClass('p-card');
		const backdrop = document.body.querySelector('[data-slot="drawer-overlay"]');
		expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-overlay');
	});

	it('U-03.1: onDismiss follows every close — Escape, and the sheet’s own control setting open to false', async () => {
		const user = userEvent.setup({ delay: null });
		const onDismiss = vi.fn();
		render(Harness, { props: { onDismiss } });
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(onDismiss).toHaveBeenCalledOnce();
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		await user.click(screen.getByRole('button', { name: 'Έτοιμο' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(onDismiss).toHaveBeenCalledTimes(2);
	});

	it('U-03.1: with dismissOnBackdropPress off, no Escape, outside press or drag closes it — only its own control', async () => {
		const user = userEvent.setup({ delay: null });
		const onDismiss = vi.fn();
		render(Harness, { props: { dismissOnBackdropPress: false, onDismiss } });
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const sheet = screen.getByRole('dialog');
		await user.keyboard('{Escape}');
		await fireEvent.pointerDown(document.body, { pointerId: 2, button: 0 });
		await fireEvent.pointerDown(sheet, { pointerId: 1, button: 0, clientY: 0 });
		await fireEvent.pointerMove(sheet, { pointerId: 1, clientY: 300 });
		await fireEvent.pointerUp(sheet, { pointerId: 1, clientY: 300 });
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		expect(onDismiss).not.toHaveBeenCalled();
		await user.click(screen.getByRole('button', { name: 'Έτοιμο' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it('U-03.1: scrollable scrolls the body inside the sheet’s height and ends a section above the edge', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { scrollable: true } });
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const scroll = screen.getByRole('dialog').querySelector('[data-slot="bottom-sheet-scroll"]');
		expect(scroll).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto', 'pb-section');
		expect(scroll).toHaveTextContent('Επιλογή χώρας');
	});

	it('U-03.1 (MINOR-5): gorhom’s handle — a 4-high full muted-foreground bar in a 24 band', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const handle = screen.getByRole('dialog').querySelector('[data-slot="drawer-handle"]');
		expect(handle).toHaveClass(
			'my-2.5',
			'h-1',
			'rounded-xs',
			'bg-muted-foreground',
			'w-drawer-handle'
		);
		expect(handle).not.toHaveClass('h-1.5', 'mt-3', 'bg-muted-foreground/40', 'rounded-full');
	});

	// Rewritten from U-03.1 (NIT-7) / U-09.13 («in place under reduced motion»): cancelled by U-12.1, and the rise
	// of U-09.8 (gorhom's 250 ms `out(exp)` of Android, near its iOS spring) is CSS now (U-12.2).
	it('U-12.2: the sheet rises from below its whole height on gorhom’s 250 ms in CSS and goes back down on close', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const css = holdTransitions();
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const sheet = screen.getByRole('dialog');
		for (const name of [
			'transition-[translate,transform]',
			'duration-sheet',
			'ease-sheet',
			'starting:translate-y-full',
			'data-[state=closed]:translate-y-full'
		]) {
			expect(sheet).toHaveClass(name);
		}
		const backdrop = document.body.querySelector('[data-slot="drawer-overlay"]') as HTMLElement;
		expect(backdrop).toHaveClass(
			'duration-sheet',
			'starting:opacity-0',
			'data-[state=closed]:opacity-0'
		);
		// No inline opacity at rest: it would outrank the CSS fade.
		expect(backdrop.style.opacity).toBe('');
		await user.keyboard('{Escape}');
		expect(sheet).toHaveAttribute('data-state', 'closed');
		expect(sheet.isConnected).toBe(true);
		css.end(sheet);
		css.end(backdrop);
		await waitFor(() => expect(sheet.isConnected).toBe(false));
		expect(animate).not.toHaveBeenCalled();
	});

	it('U-12.1 (negative): under reduced motion the sheet still rises and goes back down', async () => {
		reduceMotion();
		holdTransitions();
		const user = userEvent.setup({ delay: null });
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const sheet = screen.getByRole('dialog');
		expect(sheet).toHaveClass('starting:translate-y-full', 'duration-sheet');
		await user.keyboard('{Escape}');
		expect(sheet).toHaveAttribute('data-state', 'closed');
		expect(sheet.isConnected).toBe(true);
	});

	it('U-09.8 (R7-6): one snap point is a sheet of that fixed height — a share of the screen, or pixels', async () => {
		expect(snapHeight('50%')).toBe('50dvh');
		expect(snapHeight(320)).toBe('320px');
		expect(snapHeight('auto')).toBe('auto');
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { snapPoints: ['50%'] } });
		await user.click(screen.getByRole('button', { name: 'Χώρα' }));
		const sheet = screen.getByRole('dialog');
		expect(sheet).toHaveAttribute('data-snap', 'fixed');
		expect(sheet.style.height).toBe('50dvh');
	});

	it('U-03.1 (NIT-5): closing gives the focus back to the control that opened it', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		const opener = screen.getByRole('button', { name: 'Χώρα' });
		opener.focus();
		await user.keyboard('{Enter}');
		// U-09.7: the focus is on the panel itself, not on a control inside it (no ring on open).
		expect(document.activeElement).toBe(screen.getByRole('dialog'));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(opener).toHaveFocus();
	});
});
