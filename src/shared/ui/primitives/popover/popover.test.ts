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

	it('defaults the panel width to w-72 and applies the size prop', async () => {
		const user = userEvent.setup();
		const def = render(Harness);
		await user.click(def.getByRole('button', { name: 'Open popover' }));
		expect(def.getByText('Popover body').closest('[data-slot="popover-content"]')).toHaveClass(
			'w-72'
		);
		def.unmount();

		const lg = render(Harness, { props: { size: 'lg' } });
		await user.click(lg.getByRole('button', { name: 'Open popover' }));
		expect(lg.getByText('Popover body').closest('[data-slot="popover-content"]')).toHaveClass(
			'w-80'
		);
	});

	it('closes on Escape', async () => {
		const user = userEvent.setup();
		render(Harness);
		await user.click(screen.getByRole('button', { name: 'Open popover' }));
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByText('Popover body')).not.toBeInTheDocument());
	});
});
