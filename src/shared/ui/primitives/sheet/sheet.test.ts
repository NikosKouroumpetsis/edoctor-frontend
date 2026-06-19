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
});
