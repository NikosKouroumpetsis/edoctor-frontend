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

	it('closes via a DialogClose button', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});
});
