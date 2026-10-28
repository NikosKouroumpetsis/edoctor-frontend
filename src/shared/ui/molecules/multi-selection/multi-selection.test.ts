import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MultiSelection from './multi-selection.svelte';

const options = [
	{ value: 'gr', label: 'Greek' },
	{ value: 'en', label: 'English' },
	{ value: 'de', label: 'German' }
];

describe('MultiSelection', () => {
	it('toggles multiple chips independently', async () => {
		const user = userEvent.setup({ delay: null });
		render(MultiSelection, { props: { label: 'Languages', options } });
		const greek = screen.getByRole('checkbox', { name: 'Greek' });
		const german = screen.getByRole('checkbox', { name: 'German' });

		await user.click(greek);
		await user.click(german);
		expect(greek).toHaveAttribute('aria-checked', 'true');
		expect(german).toHaveAttribute('aria-checked', 'true');

		await user.click(greek);
		expect(greek).toHaveAttribute('aria-checked', 'false');
		expect(german).toHaveAttribute('aria-checked', 'true');
	});

	// 4ν: the application's `max` — at the limit the unchosen chips are disabled, a chosen one still clears.
	it('4ν: at `max` chosen, the rest are disabled; clearing one frees them', async () => {
		const user = userEvent.setup({ delay: null });
		render(MultiSelection, { props: { label: 'Languages', options, max: 2, value: ['gr'] } });
		const greek = screen.getByRole('checkbox', { name: 'Greek' });
		const english = screen.getByRole('checkbox', { name: 'English' });
		const german = screen.getByRole('checkbox', { name: 'German' });
		expect(german).toBeEnabled();

		await user.click(english);
		expect(english).toHaveAttribute('aria-checked', 'true');
		expect(german).toBeDisabled();
		expect(greek).toBeEnabled();

		await user.click(greek);
		expect(greek).toHaveAttribute('aria-checked', 'false');
		expect(german).toBeEnabled();
	});
});
