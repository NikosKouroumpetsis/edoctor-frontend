import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { fieldSizes } from '$shared/ui/primitives/input';
import PhoneFieldInline from './phone-field-inline.svelte';

const copy = {
	label: 'Κινητό τηλέφωνο',
	countryAccessibilityLabel: 'Χώρα',
	searchPlaceholder: 'Αναζήτηση χώρας'
};

describe('PhoneFieldInline', () => {
	it('U-03.1: shows the number placeholder only while focused (the text-field family)', async () => {
		const user = userEvent.setup({ delay: null });
		render(PhoneFieldInline, { props: { ...copy, numberPlaceholder: '69xxxxxxxx' } });
		const input = screen.getByLabelText('Κινητό τηλέφωνο');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', '69xxxxxxxx');
		await user.tab();
		expect(input).toHaveAttribute('placeholder', ' ');
	});

	it('U-03.1: the trigger shows only the dial code of the value, named by the caller', () => {
		render(PhoneFieldInline, { props: { ...copy, value: { dialCode: '+357', number: '' } } });
		const trigger = screen.getByRole('combobox', { name: 'Χώρα' });
		expect(trigger).toHaveTextContent('+357');
		expect(trigger).not.toHaveTextContent('Κύπρος');
		expect(trigger.querySelector('[data-icon="chevron-down"]')).toHaveClass('icon-sm');
	});

	it('U-03.1: lists flag, code and country with a search field; picking one emits { dialCode, number }', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(PhoneFieldInline, {
			props: { ...copy, value: { dialCode: '+30', number: '6912' }, onChange }
		});

		await user.click(screen.getByRole('combobox', { name: 'Χώρα' }));
		expect(screen.getByRole('searchbox', { name: 'Αναζήτηση χώρας' })).toBeInTheDocument();
		const greece = screen.getByRole('option', { name: /Ελλάδα/ });
		expect(greece).toHaveTextContent('+30');
		expect(greece).toHaveAttribute('aria-selected', 'true');
		expect(screen.getAllByRole('option')).toHaveLength(12);
		await user.click(screen.getByRole('option', { name: /Κύπρος/ }));
		expect(onChange).toHaveBeenLastCalledWith({ dialCode: '+357', number: '6912' });
	});

	it('U-03.1: keeps digits and spaces of the number only', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(PhoneFieldInline, { props: { ...copy, onChange } });
		await user.type(screen.getByLabelText('Κινητό τηλέφωνο'), '69a1');
		expect(onChange).toHaveBeenLastCalledWith({ dialCode: '+30', number: '691' });
	});

	it('U-03.1: an error tints the box, colours the label and writes the message outside it', () => {
		const { container } = render(PhoneFieldInline, { props: { ...copy, error: 'Λάθος αριθμός' } });
		const control = container.querySelector('[data-slot="phone-field-inline-control"]');
		expect(control).toHaveClass('bg-danger/10');
		expect(container.querySelector('[data-slot="phone-field-inline-border"]')).toHaveClass(
			'border-danger'
		);
		const input = screen.getByLabelText('Κινητό τηλέφωνο');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByText('Λάθος αριθμός')).toHaveClass('text-danger-text');
		expect(input).toHaveAttribute(
			'aria-describedby',
			screen.getByText('Λάθος αριθμός').closest('p')?.id
		);
	});

	it('keeps the field height of the family: the border is an overlay, not part of the box', () => {
		for (const size of ['default', 'lg', 'xl'] as const) {
			const { container, unmount } = render(PhoneFieldInline, { props: { ...copy, size } });
			const control = container.querySelector('[data-slot="phone-field-inline-control"]');
			const border = container.querySelector('[data-slot="phone-field-inline-border"]');
			const input = container.querySelector('[data-slot="phone-field-inline-input"]');
			expect(control?.className.split(' '), size).not.toContain('border');
			expect(border, size).toHaveClass('absolute', 'inset-0', 'border');
			for (const name of fieldSizes[size].input.split(' ')) expect(input, size).toHaveClass(name);
			unmount();
		}
	});
});
