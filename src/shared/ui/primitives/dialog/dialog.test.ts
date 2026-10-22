import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './dialog.harness.svelte';

describe('Dialog', () => {
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

	it('defaults the panel to max-w-form and applies the size prop', async () => {
		const user = userEvent.setup();
		const def = render(Harness);
		await user.click(def.getByRole('button', { name: 'Open dialog' }));
		expect(def.getByRole('dialog')).toHaveClass('max-w-form');
		def.unmount();

		const lg = render(Harness, { props: { size: 'lg' } });
		await user.click(lg.getByRole('button', { name: 'Open dialog' }));
		expect(lg.getByRole('dialog')).toHaveClass('max-w-content');
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
});
