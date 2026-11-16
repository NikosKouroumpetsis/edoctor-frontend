import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import AmountField from './amount-field.svelte';

const base = { label: 'Τελική τιμή σε ευρώ', symbol: '€', maxLength: 12, testId: 'amount' };

describe('AmountField (an amount with its sign; shared since D-W51-52)', () => {
	it('the numbers’ keyboard, its name, its sign before it, at most the caller’s length', () => {
		render(AmountField, { props: { ...base, value: '75', onInput: () => {} } });
		const input = screen.getByRole('textbox', { name: 'Τελική τιμή σε ευρώ' });
		expect(input).toHaveAttribute('inputmode', 'decimal');
		expect(input).toHaveAttribute('maxlength', '12');
		expect(input).toHaveValue('75');
		expect(input).not.toHaveAttribute('aria-invalid');
		const box = screen.getByTestId('amount').querySelector('label');
		expect(box).toHaveTextContent('€');
		expect(box?.className).toContain('min-h-control-lg');
		expect(box?.className).toContain('focus-within:border-foreground');
		expect(screen.queryByRole('alert')).toBeNull();
	});

	it('every keystroke hands the whole text over (the caller reads it)', async () => {
		const onInput = vi.fn();
		render(AmountField, { props: { ...base, value: '', onInput } });
		await fireEvent.input(screen.getByRole('textbox'), { target: { value: '70,5' } });
		expect(onInput).toHaveBeenLastCalledWith('70,5');
	});

	it('(negative) what is wrong is said under it, tied to it, the field red; the words are text (U-65.6)', () => {
		render(AmountField, {
			props: {
				...base,
				value: '1,234',
				error: '<b>Δύο δεκαδικά</b>',
				onInput: () => {},
				describedby: 'help'
			}
		});
		const input = screen.getByRole('textbox');
		const alert = screen.getByRole('alert');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input.getAttribute('aria-describedby')).toBe(`help ${alert.id}`);
		expect(alert).toHaveTextContent('<b>Δύο δεκαδικά</b>');
		expect(alert.querySelector('b')).toBeNull();
		expect(screen.getByTestId('amount').querySelector('label')?.className).toContain(
			'border-danger-text'
		);
	});
});
