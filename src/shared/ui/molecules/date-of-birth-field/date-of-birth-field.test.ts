import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './date-of-birth-field.harness.svelte';

// Labels/placeholders are i18n (Paraglide) so they vary by locale; query the
// day/month/year inputs by position and assert behaviour via the emitted ISO
// value rather than coupling to translated copy.
describe('DateOfBirthField', () => {
	it('shows always-visible (non-empty) placeholders on each segment', () => {
		render(Harness);
		for (const input of screen.getAllByRole('textbox')) {
			const ph = input.getAttribute('placeholder') ?? '';
			expect(ph.trim().length).toBeGreaterThan(0);
			expect(input.className).not.toContain('placeholder:text-transparent');
		}
	});

	it('composes an ISO date once day, month and year are typed', async () => {
		const user = userEvent.setup();
		render(Harness);
		const [day, month, year] = screen.getAllByRole('textbox');
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');

		await user.type(day, '5');
		await user.type(month, '3');
		await user.type(year, '2000');

		expect(screen.getByTestId('dob-value')).toHaveTextContent('2000-03-05');
	});

	it('only accepts digits and honours the max length per field', async () => {
		const user = userEvent.setup();
		render(Harness);

		const [day] = screen.getAllByRole('textbox') as HTMLInputElement[];
		await user.type(day, '1a2b3');
		expect(day.value).toBe('12');
	});

	it('lets you delete digits after a full date and clears the stale value', async () => {
		const user = userEvent.setup();
		render(Harness);
		const [day, month, year] = screen.getAllByRole('textbox') as HTMLInputElement[];

		await user.type(day, '5');
		await user.type(month, '3');
		await user.type(year, '2000');
		expect(screen.getByTestId('dob-value')).toHaveTextContent('2000-03-05');

		// Backspace must actually remove a digit (not be restored by hydration) and
		// the now-incomplete date must clear the emitted value.
		year.focus();
		await user.keyboard('{Backspace}');
		expect(year).toHaveValue('200');
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
	});

	it('does not commit an impossible date', async () => {
		const user = userEvent.setup();
		render(Harness);
		const [day, month, year] = screen.getAllByRole('textbox');

		await user.type(day, '31');
		await user.type(month, '2');
		await user.type(year, '2001');

		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
	});
});
