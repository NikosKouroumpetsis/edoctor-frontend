import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { holdTransitions } from '../../../../../vitest-mocks/css-transitions';
import { reduceMotion } from '../../../../../vitest-mocks/reduce-motion';
import { __getLockCount } from '$shared/lib/headless';
import type { SheetSide } from './sheet-content.svelte';
import Harness from './sheet.harness.svelte';

describe('Sheet', () => {
	afterEach(() => vi.restoreAllMocks());

	it('opens from the trigger with the requested side and closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { side: 'left' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));

		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('data-side', 'left');
		expect(dialog).toHaveAccessibleName('Filters');

		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('U-03.1: without a size a side panel is the application’s (w-3/4 max-w-narrow); the size prop applies', async () => {
		const user = userEvent.setup();
		const def = render(Harness, { props: { side: 'right' } });
		await user.click(def.getByRole('button', { name: 'Open sheet' }));
		expect(def.getByRole('dialog')).toHaveClass('w-3/4', 'max-w-narrow');
		expect(def.getByRole('dialog')).not.toHaveClass('max-w-text');
		def.unmount();

		const text = render(Harness, { props: { side: 'right', size: 'md' } });
		await user.click(text.getByRole('button', { name: 'Open sheet' }));
		expect(text.getByRole('dialog')).toHaveClass('max-w-text');
		text.unmount();

		const bottom = render(Harness, { props: { side: 'bottom' } });
		await user.click(bottom.getByRole('button', { name: 'Open sheet' }));
		expect(bottom.getByRole('dialog')).toHaveClass('h-auto');
		expect(bottom.getByRole('dialog')).not.toHaveClass('h-1/4');
		const close = bottom.getByRole('button', { name: 'Close' });
		expect(close).toHaveClass('top-0', 'right-0', 'opacity-70');
		expect(close.querySelector('[data-icon="close"]')).toHaveClass('icon-sm');
	});

	it('U-03.1 (NIT-R2-3): the panel, focusable by script and by a press on its surface, draws no browser outline', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		const dialog = screen.getByRole('dialog');
		expect(dialog).toHaveAttribute('tabindex', '-1');
		expect(dialog).toHaveClass('outline-none');
	});

	// 🔴 S-26.6: the same backdrop as the dialog's: the theme's `overlay`, never a static colour with an opacity.
	it('S-26.6: the dialog and sheet backdrop use the named overlay colour', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));

		const backdrop = document.body.querySelector('[data-slot="sheet-overlay"]');
		expect(backdrop).toHaveClass('fixed', 'inset-0', 'bg-overlay');
		expect(backdrop?.className).not.toMatch(/bg-[\w-]+\/\d+/);
	});

	it('U-03.1 (MINOR-7): only its own backdrop closes it — a press in a portalled layer outside the panel does not', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		// What a Select or Popover of the content portals to <body>: outside the panel, not the backdrop.
		const layer = document.createElement('div');
		layer.setAttribute('data-testid', 'portalled-layer');
		document.body.append(layer);
		await user.pointer({ keys: '[MouseLeft]', target: layer });
		expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
		layer.remove();
		await user.click(document.body.querySelector('[data-slot="sheet-overlay"]') as HTMLElement);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	// Rewritten from U-09.8 (a Svelte `slideFrom`, R2): the slide is CSS now (U-12.2), the same 100 % and 0.25 s.
	it('U-12.2: the panel slides in from its side and back to it, its whole size, as the backdrop fades (0.25 s)', async () => {
		const sides: Record<SheetSide, string> = {
			right: 'translate-x-full',
			left: '-translate-x-full',
			top: '-translate-y-full',
			bottom: 'translate-y-full'
		};
		const user = userEvent.setup();
		for (const [side, slide] of Object.entries(sides)) {
			const view = render(Harness, { props: { side: side as SheetSide } });
			await user.click(view.getByRole('button', { name: 'Open sheet' }));
			const panel = screen.getByRole('dialog');
			for (const name of [
				'transition-[translate]',
				'duration-standard',
				'ease-standard',
				`starting:${slide}`,
				`data-[state=closed]:${slide}`
			]) {
				expect(panel, side).toHaveClass(name);
			}
			expect(document.body.querySelector('[data-slot="sheet-overlay"]')).toHaveClass(
				'transition-opacity',
				'starting:opacity-0',
				'data-[state=closed]:opacity-0'
			);
			view.unmount();
		}
		const css = holdTransitions();
		render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		const panel = screen.getByRole('dialog');
		expect(__getLockCount()).toBe(1);
		await user.keyboard('{Escape}');
		expect(panel).toHaveAttribute('data-state', 'closed');
		expect(panel).toHaveAttribute('inert');
		// U-12.9: the scroll lock holds until the panel leaves the DOM.
		expect(__getLockCount()).toBe(1);
		css.end(panel);
		css.end(document.body.querySelector('[data-slot="sheet-overlay"]') as HTMLElement);
		await waitFor(() => expect(panel.isConnected).toBe(false));
		expect(__getLockCount()).toBe(0);
	});

	it('U-12.9: a sheet unmounted on its way out lets the scroll lock go', async () => {
		holdTransitions();
		const user = userEvent.setup();
		const view = render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		await user.keyboard('{Escape}');
		expect(screen.getByRole('dialog', { hidden: true })).toHaveAttribute('data-state', 'closed');
		expect(__getLockCount()).toBe(1);
		view.unmount();
		expect(__getLockCount()).toBe(0);
	});

	it('U-09.7: it opens with the focus on the panel, not on the «×»; Tab reaches the «×» first', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { side: 'left' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		expect(document.activeElement).toBe(screen.getByRole('dialog'));
		await user.tab();
		expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
	});

	// Rewritten from U-09.13 («in place under reduced motion»): cancelled by U-12.1.
	it('U-12.1 (negative): under reduced motion it still slides out — the leave waits for its CSS transition', async () => {
		reduceMotion();
		holdTransitions();
		const user = userEvent.setup();
		render(Harness, { props: { side: 'right' } });
		await user.click(screen.getByRole('button', { name: 'Open sheet' }));
		const panel = screen.getByRole('dialog');
		expect(panel).toHaveClass('starting:translate-x-full', 'duration-standard');
		await user.keyboard('{Escape}');
		expect(panel).toHaveAttribute('data-state', 'closed');
		expect(panel.isConnected).toBe(true);
	});
});
