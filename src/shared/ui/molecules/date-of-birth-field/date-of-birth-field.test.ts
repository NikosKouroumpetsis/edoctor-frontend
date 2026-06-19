import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './date-of-birth-field.harness.svelte';

async function pick(
	user: ReturnType<typeof userEvent.setup>,
	comboName: string,
	optionName: string
) {
	await user.click(screen.getByRole('combobox', { name: comboName }));
	await user.click(screen.getByRole('option', { name: optionName }));
}

describe('DateOfBirthField', () => {
	it('composes an ISO date once day, month and year are chosen', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		expect(screen.getByTestId('dob-value')).toHaveTextContent('empty');

		await pick(user, 'Day', '5');
		await pick(user, 'Month', 'March');
		await pick(user, 'Year', '2000');

		expect(screen.getByTestId('dob-value')).toHaveTextContent('2000-03-05');
	});
});
