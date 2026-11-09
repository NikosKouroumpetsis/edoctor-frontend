import { describe, expect, it, vi } from 'vitest';
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

	it('P-W3 Σ-8: a date in the future is refused by default with its own line — a birth date never lies ahead', async () => {
		const user = userEvent.setup();
		render(Harness);
		const [day, month, year] = screen.getAllByRole('textbox');
		await user.type(day, '1');
		await user.type(month, '1');
		await user.type(year, String(new Date().getFullYear() + 2));
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
		expect(screen.getByText('Η ημερομηνία δεν μπορεί να είναι μελλοντική')).toBeInTheDocument();
	});

	it('P-W3 Σ-8: with `allowFuture` a date ahead is kept (a policy’s expiry); an impossible one is still refused', async () => {
		const user = userEvent.setup();
		render(Harness, { props: { allowFuture: true } });
		const [day, month, year] = screen.getAllByRole('textbox');
		const ahead = new Date().getFullYear() + 2;
		await user.type(day, '15');
		await user.type(month, '6');
		await user.type(year, String(ahead));
		expect(screen.getByTestId('dob-value')).toHaveTextContent(`${ahead}-06-15`);
		await user.clear(day);
		await user.type(day, '31');
		await user.clear(month);
		await user.type(month, '2');
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
		expect(screen.getByText('Δώστε μια έγκυρη ημερομηνία')).toBeInTheDocument();
	});

	it('review w3-w3 R1 MINOR-4: `typed` tells a date left half (no value yet) from no date at all', async () => {
		const user = userEvent.setup();
		render(Harness);
		expect(screen.getByTestId('dob-typed')).toHaveTextContent('blank');
		const [day, month, year] = screen.getAllByRole('textbox');
		await user.type(day, '12');
		await user.type(month, '3');
		await user.type(year, '198');
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
		expect(screen.getByTestId('dob-typed')).toHaveTextContent('typed');
		await user.clear(year);
		await user.clear(month);
		await user.clear(day);
		expect(screen.getByTestId('dob-typed')).toHaveTextContent('blank');
	});

	describe('U-129: `variant="single"`, one date field (the sign-up’s and the booking’s prototypes, `type="date"`)', () => {
		const dateInput = () => screen.getByLabelText('Date of birth') as HTMLInputElement;
		/** What a browser does with a day left half or impossible: no value, and `validity.badInput`. */
		function leaveHalf(input: HTMLInputElement) {
			Object.defineProperty(input, 'validity', {
				configurable: true,
				get: () => ({ badInput: true })
			});
			input.value = '';
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		it('U-129: ONE labelled `date` control in the text field’s box, its label always up; a whole date is its ISO, typed', async () => {
			const user = userEvent.setup();
			const { container } = render(Harness, { props: { variant: 'single' } });
			expect(container.querySelectorAll('input')).toHaveLength(1);
			expect(screen.queryAllByRole('textbox')).toHaveLength(0);
			expect(dateInput()).toHaveAttribute('type', 'date');
			expect(dateInput()).toHaveClass(
				'rounded-md',
				'border',
				'border-input',
				'bg-card',
				'text-foreground'
			);
			const label = container.querySelector(
				'[data-slot="date-of-birth-field-label"]'
			) as HTMLElement;
			expect(label).toHaveAttribute('data-floated');
			expect(container.querySelector('[data-variant="single"]')).not.toBeNull();
			await user.type(dateInput(), '1985-04-12');
			expect(screen.getByTestId('dob-value')).toHaveTextContent('1985-04-12');
			expect(screen.getByTestId('dob-typed')).toHaveTextContent('typed');
		});

		it('U-129 (negative): a day ahead is refused with its own line, unless `allowFuture`', async () => {
			const user = userEvent.setup();
			const ahead = `${new Date().getFullYear() + 2}-06-15`;
			const refused = render(Harness, { props: { variant: 'single' } });
			await user.type(dateInput(), ahead);
			expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
			expect(screen.getByText('Η ημερομηνία δεν μπορεί να είναι μελλοντική')).toBeInTheDocument();
			expect(dateInput()).toHaveAttribute('aria-invalid', 'true');
			expect(dateInput()).toHaveValue(ahead);
			refused.unmount();
			render(Harness, { props: { variant: 'single', allowFuture: true } });
			await user.type(dateInput(), ahead);
			expect(screen.getByTestId('dob-value')).toHaveTextContent(ahead);
		});

		it('U-129 (negative): a day left half or impossible is «typed» with no value — never «no date»', async () => {
			render(Harness, { props: { variant: 'single' } });
			leaveHalf(dateInput());
			await vi.waitFor(() => expect(screen.getByTestId('dob-typed')).toHaveTextContent('typed'));
			expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');
		});

		it('U-129: a value from outside fills the control; cleared from outside, the control and `typed` empty too', async () => {
			const user = userEvent.setup();
			render(Harness, { props: { variant: 'single', initial: '2010-05-12' } });
			await vi.waitFor(() => expect(dateInput()).toHaveValue('2010-05-12'));
			expect(screen.getByTestId('dob-typed')).toHaveTextContent('typed');
			await user.click(screen.getByTestId('dob-clear'));
			expect(dateInput()).toHaveValue('');
			expect(screen.getByTestId('dob-typed')).toHaveTextContent('blank');
		});

		it('U-129 (negative): the boxes stay the default — no `date` control without the variant', () => {
			const { container } = render(Harness);
			expect(container.querySelector('input[type="date"]')).toBeNull();
			expect(screen.getAllByRole('textbox')).toHaveLength(3);
		});
	});
});
