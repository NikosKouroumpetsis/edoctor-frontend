import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './date-of-birth-field.harness.svelte';
import DateOfBirthField from './date-of-birth-field.svelte';

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

	// R3-11: the field family's size (`default | lg | xl`) draws each segment's box, the look the Input sizes drew
	// before they became the application's `sm | md | lg`.
	it('R3-11: each field size keeps its segment box (48 / 56 / 64 with its side padding)', () => {
		for (const [size, box] of [
			['default', ['min-h-control-md', 'px-2.5']],
			['lg', ['min-h-control-lg', 'px-3']],
			['xl', ['min-h-control-xl', 'px-3.5']]
		] as const) {
			const view = render(DateOfBirthField, { props: { size } });
			for (const input of screen.getAllByRole('textbox')) {
				expect(input).toHaveClass(...box, 'text-center', 'text-body-lg');
				expect([...input.classList].filter((name) => /^px-/.test(name))).toEqual([box[1]]);
			}
			view.unmount();
		}
	});

	it('the muted helper shows while there is no error (the application’s port)', () => {
		const helped = render(DateOfBirthField, {
			props: { helperText: 'Πρέπει να είναι στο παρελθόν.' }
		});
		expect(screen.getByText('Πρέπει να είναι στο παρελθόν.')).toHaveClass('text-muted-foreground');
		helped.unmount();
		render(DateOfBirthField, {
			props: {
				helperText: 'Πρέπει να είναι στο παρελθόν.',
				error: 'Απαιτείται ημερομηνία γέννησης.'
			}
		});
		expect(screen.queryByText('Πρέπει να είναι στο παρελθόν.')).toBeNull();
		expect(screen.getByText('Απαιτείται ημερομηνία γέννησης.')).toBeInTheDocument();
	});
});
