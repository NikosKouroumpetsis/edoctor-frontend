import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './tooltip.harness.svelte';

describe('Tooltip', () => {
	it('shows on focus and describes the trigger, then hides on blur', async () => {
		const user = userEvent.setup();
		render(Harness);
		const trigger = screen.getByRole('button', { name: 'Hover me' });

		trigger.focus();
		const tip = await screen.findByRole('tooltip');
		expect(tip).toHaveTextContent('Helpful hint');
		expect(trigger).toHaveAttribute('aria-describedby', tip.id);

		await user.tab();
		await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
	});
});
