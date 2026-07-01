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

	it('defaults the panel to max-w-lg and applies the size prop', async () => {
		const user = userEvent.setup();
		const def = render(Harness);
		await user.click(def.getByRole('button', { name: 'Open dialog' }));
		expect(def.getByRole('dialog')).toHaveClass('max-w-lg');
		def.unmount();

		const lg = render(Harness, { props: { size: 'lg' } });
		await user.click(lg.getByRole('button', { name: 'Open dialog' }));
		expect(lg.getByRole('dialog')).toHaveClass('max-w-2xl');
	});

	it('closes via a DialogClose button', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open dialog' }));
		await user.click(screen.getByRole('button', { name: 'Cancel' }));
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});
});
