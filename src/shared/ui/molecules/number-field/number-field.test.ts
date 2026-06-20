import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import NumberField from './number-field.svelte';

describe('NumberField', () => {
	it('increments and decrements via the steppers', async () => {
		const user = userEvent.setup({ delay: null });
		render(NumberField, { props: { label: 'Quantity', value: '5' } });
		const input = screen.getByLabelText('Quantity');

		await user.click(screen.getByRole('button', { name: 'Increase' }));
		expect(input).toHaveValue('6');
		await user.click(screen.getByRole('button', { name: 'Decrease' }));
		await user.click(screen.getByRole('button', { name: 'Decrease' }));
		expect(input).toHaveValue('4');
	});

	it('clamps to min/max', async () => {
		const user = userEvent.setup({ delay: null });
		render(NumberField, { props: { label: 'Qty', value: '1', min: 1, max: 2 } });
		const input = screen.getByLabelText('Qty');
		await user.click(screen.getByRole('button', { name: 'Decrease' }));
		expect(input).toHaveValue('1'); // clamped at min
		await user.click(screen.getByRole('button', { name: 'Increase' }));
		await user.click(screen.getByRole('button', { name: 'Increase' }));
		expect(input).toHaveValue('2'); // clamped at max
	});

	it('forwards the placeholder and reveals it only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(NumberField, { props: { label: 'Quantity', placeholder: 'e.g. 3' } });
		const input = screen.getByLabelText('Quantity');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', 'e.g. 3');
		expect(input.className).not.toContain('placeholder:text-transparent');
	});
});
