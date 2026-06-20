import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PhoneField from './phone-field.svelte';

describe('PhoneField', () => {
	it('forwards the placeholder to the number input and reveals it only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(PhoneField, { props: { label: 'Phone number', placeholder: '69xxxxxxxx' } });
		const input = screen.getByLabelText('Phone number');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', '69xxxxxxxx');
		expect(input.className).not.toContain('placeholder:text-transparent');

		await user.tab();
		expect(input).toHaveAttribute('placeholder', ' ');
	});

	it('shows the selected country label immediately from a preset dial code', () => {
		render(PhoneField, { props: { label: 'Phone number', dialCode: '+30' } });
		// Resolved from data without opening the dropdown.
		expect(screen.getByText('🇬🇷 Ελλάδα +30')).toBeInTheDocument();
	});
});
