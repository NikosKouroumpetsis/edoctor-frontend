import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tick } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import { __getLockCount } from '$shared/lib/headless';
import Harness from './dialog.harness.svelte';

describe('Dialog', () => {
	afterEach(() => vi.restoreAllMocks());

	it('opens on trigger, labels the dialog, and moves focus inside', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('aria-modal', 'true');
		expect(dialog).toHaveAccessibleName('Confirm booking');
		// Focus moved into the dialog.
		expect(dialog.contains(document.activeElement)).toBe(true);
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1: without a size the panel is the application’s (max-w-text); the size prop applies', async () => {
		const user = userEvent.setup();
		const def = render(Harness);
		await user.click(def.getByRole('button', { name: 'Open dialog' }));
		expect(def.getByRole('dialog')).toHaveClass('max-w-text');
		expect(def.getByRole('dialog')).not.toHaveClass('max-w-form');
		def.unmount();

		const form = render(Harness, { props: { size: 'md' } });
		await user.click(form.getByRole('button', { name: 'Open dialog' }));
		expect(form.getByRole('dialog')).toHaveClass('max-w-form');
		form.unmount();

		const lg = render(Harness, { props: { size: 'lg' } });
		await user.click(lg.getByRole('button', { name: 'Open dialog' }));
		expect(lg.getByRole('dialog')).toHaveClass('max-w-content');
	});

	it('U-03.1: the «×» is the application’s: a 48 box in the panel’s corner, the 16 glyph at 70 %', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const close = screen.getByRole('button', { name: 'Close' });
		expect(close).toHaveClass('absolute', 'top-0', 'right-0', 'size-touch', 'opacity-70');
		expect(close.querySelector('[data-icon="close"]')).toHaveClass('icon-sm');
		await user.click(close);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1 (MINOR-4): on the phone the panel keeps 24 to the screen edges, as the application’s backdrop p-6', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveClass(
			'fixed',
			'inset-x-6',
			'top-1/2',
			'mx-auto',
			'-translate-y-1/2',
			'max-w-text'
		);
		expect(dialog).not.toHaveClass('left-1/2', '-translate-x-1/2', 'w-full');
	});

	it('U-03.1 (MINOR-7): the backdrop closes it; a press in a portalled Popover of its content does not', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { withPopover: true } });
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Specialty' }));
		const option = await screen.findByRole('button', { name: 'Cardiology' });
		const dialog = screen.getByRole('dialog', { name: 'Confirm booking' });
		expect(dialog.contains(option)).toBe(false);
		await user.click(option);
		expect(dialog).toBeInTheDocument();
		await user.click(document.body.querySelector('[data-slot="dialog-overlay"]') as HTMLElement);
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Confirm booking' })).not.toBeInTheDocument()
		);
	});

	it('U-03.1 (NIT-R2-1): a Popover of its content takes the first Escape alone; the second closes the dialog', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { withPopover: true } });
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Specialty' }));
		await screen.findByRole('button', { name: 'Cardiology' });
		await user.keyboard('{Escape}');
		await waitFor(() =>
			expect(screen.queryByRole('button', { name: 'Cardiology' })).not.toBeInTheDocument()
		);
		expect(screen.getByRole('dialog', { name: 'Confirm booking' })).toBeInTheDocument();
		await user.keyboard('{Escape}');
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Confirm booking' })).not.toBeInTheDocument()
		);
	});

	it('U-03.1 (NIT-1 of dyad 3): a second Escape while the Popover still fades out (250 ms) closes the dialog', async () => {
		holdTransitions((node) => node.matches('[data-slot="popover-content"]'));
		const user = userEvent.setup();
		render(Harness, { props: { withPopover: true } });
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Specialty' }));
		const option = await screen.findByRole('button', { name: 'Cardiology' });
		const popover = option.closest('[data-slot="popover-content"]') as HTMLElement;
		fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
		await tick();
		// Its CSS leave has started (`Presence` marks the leaving node `inert`) and the node is still there.
		expect(popover.isConnected).toBe(true);
		expect(popover).toHaveAttribute('inert');
		fireEvent.keyDown(document.activeElement as HTMLElement, { key: 'Escape' });
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: 'Confirm booking' })).not.toBeInTheDocument()
		);
	});

	it('U-03.1 (NIT-R2-3): the panel, focusable by script and by a press on its surface, draws no browser outline', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('tabindex', '-1');
		expect(dialog).toHaveClass('outline-none');
	});

	it('closes via a DialogClose button', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	/**
	 * 🔴 S-26.6: the backdrop uses the theme's named `overlay` colour (the application's name), never a static
	 * colour with an opacity such as `bg-black/50`; the colour itself is 50% black in light and dark.
	 */
	it('S-26.6: the dialog and sheet backdrop use the named overlay colour', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));

		const backdrop = document.body.querySelector('[data-slot="dialog-overlay"]');
		expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-overlay');
		expect(backdrop?.className).not.toMatch(/bg-[\w-]+\/\d+/);
	});

	it('S-26.6: exposes a 50% black overlay, identical in light and dark, as a css variable', () => {
		const css = readFileSync(resolve(process.cwd(), 'src/routes/layout.css'), 'utf8');
		const block = (selector: string) =>
			new RegExp(`(?:^|\n)${selector}\\s*\\{([^}]*)\\}`).exec(css)?.[1] ?? '';

		expect(block(':root')).toMatch(/--overlay:\s*#00000080;/);
		expect(block('\\.dark')).toMatch(/--overlay:\s*#00000080;/);
		expect(block('@theme inline')).toMatch(/--color-overlay:\s*var\(--overlay\);/);
	});

	it('U-09.7: it opens with the focus on the panel, never on the «×» (no ring on open); Tab reaches the «×» first', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		const close = screen.getByRole('button', { name: 'Close' });
		expect(document.activeElement).toBe(dialog);
		expect(close).not.toHaveFocus();
		expect(dialog).toHaveAttribute('tabindex', '-1');
		expect(dialog).toHaveClass('outline-none');
		// The keyboard's ring stays (WCAG 2.4.7): only on `focus-visible`, never on a plain focus.
		expect(close.className).toMatch(/focus-visible:ring-3/);
		expect(close.className).not.toMatch(/(^|\s)(focus|active):(ring|outline)/);
		await user.tab();
		expect(close).toHaveFocus();
		await user.tab({ shift: true });
		expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
	});

	it('U-09.7: closing gives the focus back to the trigger', async () => {
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('button', { name: 'Open dialog' });
		await user.click(trigger);
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		expect(trigger).toHaveFocus();
	});

	// Rewritten from U-09.8 / U-09.13 (a Svelte `overlayFade` / `overlayPop`, in place under reduced motion, R2):
	// the motion is CSS now (U-12.2) and plays whatever the device's setting (U-12.1).
	it('U-12.2: the backdrop fades and the panel grows from 95 % in CSS, 250 ms on Airbnb’s curve, in and out', async () => {
		const animate = vi.spyOn(Element.prototype, 'animate');
		const css = holdTransitions();
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('button', { name: 'Open dialog' });
		await user.click(trigger);
		const dialog = screen.getByRole('dialog');
		const backdrop = document.body.querySelector('[data-slot="dialog-overlay"]') as HTMLElement;
		const fade = ['transition-opacity', 'duration-standard', 'ease-standard'];
		for (const name of [...fade, 'starting:opacity-0', 'data-[state=closed]:opacity-0']) {
			expect(backdrop).toHaveClass(name);
		}
		const pop = ['transition-[opacity,scale]', 'duration-standard', 'ease-standard'];
		for (const name of [
			...pop,
			'starting:scale-95',
			'starting:opacity-0',
			'data-[state=closed]:scale-95',
			'data-[state=closed]:opacity-0',
			'data-[state=closed]:pointer-events-none'
		]) {
			expect(dialog).toHaveClass(name);
		}
		expect(dialog).toHaveAttribute('data-state', 'open');
		expect(__getLockCount()).toBe(1);

		await user.keyboard('{Escape}');
		// On its way out: the same nodes, closed and inert; the trap and the focus let go at once, the scroll lock
		// only when the dialog leaves the DOM (review r1 §8: no page shift under a backdrop still fading).
		expect(screen.getByRole('dialog', { hidden: true })).toBe(dialog);
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(backdrop).toHaveAttribute('data-state', 'closed');
		// The panel spreads its props, so Svelte writes the attribute; the backdrop takes the property (jsdom has none).
		expect(dialog).toHaveAttribute('inert');
		expect(backdrop.inert).toBe(true);
		expect(trigger).toHaveFocus();
		expect(__getLockCount()).toBe(1);
		css.end(dialog);
		expect(dialog.isConnected).toBe(true);
		expect(__getLockCount()).toBe(1);
		css.end(backdrop);
		await waitFor(() => expect(dialog.isConnected).toBe(false));
		expect(backdrop.isConnected).toBe(false);
		expect(__getLockCount()).toBe(0);
		expect(animate).not.toHaveBeenCalled();
	});

	// Review r1 §8: R3 let the lock go as the leave started (`scrollLock={ctx.modal && presence.open}`), so with bars
	// that take room the page under the fading backdrop moved by the bar's width for 250 ms.
	it('U-12.2: the scroll lock holds through the leave and through an opening again mid-way; it goes with the node', async () => {
		holdTransitions();
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('button', { name: 'Open dialog' });
		await user.click(trigger);
		const dialog = screen.getByRole('dialog');
		expect(__getLockCount()).toBe(1);
		await user.keyboard('{Escape}');
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(__getLockCount()).toBe(1);
		// Opened again on the way out: the same node, one lock (never released, never doubled).
		await user.click(trigger);
		expect(screen.getByRole('dialog')).toBe(dialog);
		expect(dialog).toHaveAttribute('data-state', 'open');
		expect(__getLockCount()).toBe(1);
		await user.keyboard('{Escape}');
		expect(__getLockCount()).toBe(1);
		// The focus went back to the trigger at the leave's start, as before.
		expect(trigger).toHaveFocus();
	});

	it('U-12.1 (negative): under reduced motion the same CSS motion plays — no class or wait is dropped', async () => {
		reduceMotion();
		holdTransitions();
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveClass('starting:scale-95', 'duration-standard');
		expect(dialog.className).not.toMatch(/motion-(reduce|safe):/);
		await user.keyboard('{Escape}');
		expect(dialog).toHaveAttribute('data-state', 'closed');
		expect(dialog.isConnected).toBe(true);
	});
});
