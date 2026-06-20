import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PhoneFieldInline from './phone-field-inline.svelte';

describe('PhoneFieldInline', () => {
	it('forwards the placeholder to the number input and reveals it only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(PhoneFieldInline, { props: { label: 'Phone number', placeholder: '69xxxxxxxx' } });
		const input = screen.getByLabelText('Phone number');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', '69xxxxxxxx');

		await user.tab();
		expect(input).toHaveAttribute('placeholder', ' ');
	});

	it('shows only the dial code in the trigger from a preset value', () => {
		render(PhoneFieldInline, { props: { label: 'Phone number', dialCode: '+357' } });
		// The collapsed trigger shows just the dial code, not the country name.
		const trigger = screen.getByRole('combobox', { name: 'Country' });
		expect(trigger).toHaveTextContent('+357');
		expect(trigger).not.toHaveTextContent('Κύπρος');
	});

	it('reveals "code + country name" options once the dropdown opens', async () => {
		const user = userEvent.setup({ delay: null });
		render(PhoneFieldInline, { props: { label: 'Phone number', dialCode: '+30' } });

		await user.click(screen.getByRole('combobox', { name: 'Country' }));
		const option = screen.getByRole('option', { name: /Ελλάδα/ });
		expect(option).toHaveTextContent('+30');
		expect(option).toHaveTextContent('Ελλάδα');
	});
});
