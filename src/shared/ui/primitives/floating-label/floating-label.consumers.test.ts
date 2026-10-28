import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { TextField } from '$shared/ui/molecules/text-field';
import { PasswordField } from '$shared/ui/molecules/password-field';
import { PhoneField } from '$shared/ui/molecules/phone-field';
import { PhoneFieldInline } from '$shared/ui/molecules/phone-field-inline';
import { Combobox } from '$shared/ui/primitives/combobox';

/**
 * 🔴 U-12.5: a CSS transition runs only on the SAME element, so every field that floats its label must keep that one
 * `<label>` in the DOM while `floated` changes (focus, typing, emptying, leaving). A branch that drew the label anew
 * (`{#if}` / `{#key}`) would never move it. The date of birth has no floating label: a legend over three boxes.
 */
const consumers = [
	{
		name: 'TextField',
		mount: () => render(TextField, { props: { label: 'Όνομα' } }),
		field: () => screen.getByLabelText('Όνομα')
	},
	{
		name: 'PasswordField',
		mount: () =>
			render(PasswordField, {
				props: { label: 'Κωδικός', hideLabel: 'Απόκρυψη', showLabel: 'Εμφάνιση' }
			}),
		field: () => screen.getByLabelText('Κωδικός')
	},
	{
		name: 'PhoneField',
		mount: () =>
			render(PhoneField, {
				props: {
					label: 'Κινητό τηλέφωνο',
					countryLabel: 'Χώρα',
					countryAccessibilityLabel: 'Χώρα κινητού',
					searchPlaceholder: 'Αναζήτηση χώρας'
				}
			}),
		field: () => screen.getByLabelText('Κινητό τηλέφωνο')
	},
	{
		name: 'PhoneFieldInline',
		mount: () =>
			render(PhoneFieldInline, {
				props: {
					label: 'Κινητό τηλέφωνο',
					countryAccessibilityLabel: 'Χώρα',
					searchPlaceholder: 'Αναζήτηση χώρας'
				}
			}),
		field: () => screen.getByLabelText('Κινητό τηλέφωνο')
	},
	{
		name: 'Combobox',
		mount: () =>
			render(Combobox, {
				props: {
					label: 'Ειδικότητα',
					emptyText: 'Κανένα αποτέλεσμα',
					clearLabel: 'Καθαρισμός',
					toggleLabel: 'Επιλογές',
					options: [{ label: 'Καρδιολόγος', value: 'cardio' }]
				}
			}),
		field: () => screen.getByRole('combobox')
	}
];

describe('FloatingLabel in every field (U-12.5)', () => {
	for (const consumer of consumers) {
		it(`U-12.5: ${consumer.name} keeps the same <label> through focus, typing, emptying and blur, with the motion`, async () => {
			const user = userEvent.setup({ delay: null });
			consumer.mount();
			const input = consumer.field() as HTMLInputElement;
			const labelOf = () => document.querySelector(`label[for="${input.id}"]`) as HTMLElement;
			const node = labelOf();
			expect(node).not.toBeNull();
			expect(node).toHaveClass('transition-[translate,scale,left]', 'duration-label', 'ease-label');
			expect(node).not.toHaveAttribute('data-floated');

			await user.click(input);
			expect(labelOf()).toBe(node);
			expect(node).toHaveAttribute('data-floated');
			await user.keyboard('5');
			expect(labelOf()).toBe(node);
			await user.clear(input);
			expect(labelOf()).toBe(node);
			expect(node).toHaveAttribute('data-floated');
			await user.click(document.body);
			expect(labelOf()).toBe(node);
			expect(node).not.toHaveAttribute('data-floated');
			// An input the browser autofills floats it by CSS (`peer-autofill:`), the same label.
			expect(node.className).toMatch(/peer-autofill:scale-75/);
		});
	}
});
