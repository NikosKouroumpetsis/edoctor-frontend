import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './popover.harness.svelte';

describe('Popover', () => {
	it('toggles on trigger and sets aria-expanded', async () => {
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('button', { name: 'Open popover' });
		expect(trigger).toHaveAttribute('aria-expanded', 'false');

		await user.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText('Popover body')).toBeInTheDocument();
	});

	it('closes when clicking outside but stays open when clicking inside', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open popover' }));

		await user.click(screen.getByRole('button', { name: 'Inner action' }));
		expect(screen.getByText('Popover body')).toBeInTheDocument();

		await user.click(screen.getByTestId('outside'));
		await waitFor(() => expect(screen.queryByText('Popover body')).not.toBeInTheDocument());
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open popover' }));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByText('Popover body')).not.toBeInTheDocument());
	});
});
