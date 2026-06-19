import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import SingleSelection from './single-selection.svelte';

const options = [
	{ value: 'm', label: 'Morning' },
	{ value: 'a', label: 'Afternoon' },
	{ value: 'e', label: 'Evening' }
];

describe('SingleSelection', () => {
	it('selects a single chip and deselects the rest', async () => {
		const user = userEvent.setup({ delay: null });
		render(SingleSelection, { props: { label: 'Slot', options } });
		const morning = screen.getByRole('radio', { name: 'Morning' });
		const evening = screen.getByRole('radio', { name: 'Evening' });

		await user.click(morning);
		expect(morning).toHaveAttribute('aria-checked', 'true');
		await user.click(evening);
		expect(evening).toHaveAttribute('aria-checked', 'true');
		expect(morning).toHaveAttribute('aria-checked', 'false');
	});

	it('moves and selects with arrow keys', async () => {
		const user = userEvent.setup({ delay: null });
		render(SingleSelection, { props: { label: 'Slot', options } });
		const morning = screen.getByRole('radio', { name: 'Morning' });
		morning.focus();
		await user.keyboard('{ArrowRight}');
		expect(screen.getByRole('radio', { name: 'Afternoon' })).toHaveAttribute(
			'aria-checked',
			'true'
		);
	});
});
