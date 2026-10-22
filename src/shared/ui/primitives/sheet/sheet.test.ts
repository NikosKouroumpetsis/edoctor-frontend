import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './sheet.harness.svelte';

describe('Sheet', () => {
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

	it('defaults the right panel width to max-w-text and applies the size prop', async () => {
		const user = userEvent.setup();
		const def = render(Harness, { props: { side: 'right' } });
		await user.click(def.getByRole('button', { name: 'Open sheet' }));
		expect(def.getByRole('dialog')).toHaveClass('max-w-text');
		def.unmount();

		const sm = render(Harness, { props: { side: 'right', size: 'sm' } });
		await user.click(sm.getByRole('button', { name: 'Open sheet' }));
		expect(sm.getByRole('dialog')).toHaveClass('max-w-narrow');
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
});
