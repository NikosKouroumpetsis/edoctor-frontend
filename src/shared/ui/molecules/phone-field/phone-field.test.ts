import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createForm, Validators } from '$shared/lib/form';
import PhoneField from './phone-field.svelte';

const copy = {
	label: 'Κινητό τηλέφωνο',
	countryLabel: 'Χώρα',
	countryAccessibilityLabel: 'Χώρα κινητού',
	searchPlaceholder: 'Αναζήτηση χώρας'
};

describe('PhoneField', () => {
	it('U-03.1: shows the number placeholder only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(PhoneField, { props: { ...copy, numberPlaceholder: '69xxxxxxxx' } });
		const input = screen.getByLabelText('Κινητό τηλέφωνο');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', '69xxxxxxxx');
		expect(input.className).not.toContain('placeholder:text-transparent');
		await user.tab();
		expect(input).toHaveAttribute('placeholder', ' ');
	});

	it('U-03.1: shows the full country label of the value and its caption', () => {
		render(PhoneField, { props: { ...copy, value: { dialCode: '+30', number: '' } } });
		expect(screen.getByText('🇬🇷 Ελλάδα +30')).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Χώρα κινητού' })).toHaveTextContent('Χώρα');
	});

	it('U-03.1: emits the combined value as the number is typed', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(PhoneField, { props: { ...copy, onChange } });
		await user.type(screen.getByLabelText('Κινητό τηλέφωνο'), '69');
		expect(onChange).toHaveBeenLastCalledWith({ dialCode: '+30', number: '69' });
	});

	it('U-03.1: tints both halves with the error of a form field, and neither without one', async () => {
		const form = createForm({
			initialValues: { phone: '' },
			validators: { phone: [Validators.required] }
		});
		render(PhoneField, { props: { ...copy, field: form.field('phone') } });
		const country = screen.getByRole('combobox', { name: 'Χώρα κινητού' });
		expect(country).not.toHaveClass('border-danger');

		form.setTouched('phone');
		form.validateField('phone');

		expect(await screen.findByText('This field is required')).toBeInTheDocument();
		expect(country).toHaveClass('border-danger', 'bg-danger/10');
		expect(screen.getByLabelText('Κινητό τηλέφωνο')).toHaveAttribute('aria-invalid', 'true');
	});
});
