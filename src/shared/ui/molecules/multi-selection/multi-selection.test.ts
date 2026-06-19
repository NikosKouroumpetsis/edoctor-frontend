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
});
