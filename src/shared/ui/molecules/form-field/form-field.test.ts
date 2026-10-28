import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Harness from './form-field.harness.svelte';

describe('FormField', () => {
	// U-06.8 (3ε): the application's `molecules/form-field` — label, control, one plain line.
	it('U-06.8: names the control by its label and describes it by the helper line', () => {
		render(Harness, { props: { helperText: 'Δεν θα κοινοποιηθεί ποτέ.' } });
		const input = screen.getByLabelText('Email');
		expect(input).toHaveAttribute('placeholder', 'name@example.com');
		expect(input).not.toHaveAttribute('aria-invalid');
		const helper = screen.getByText('Δεν θα κοινοποιηθεί ποτέ.');
		expect(input).toHaveAttribute('aria-describedby', helper.id);
		expect(helper).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(helper).not.toHaveAttribute('aria-live');
		expect(helper.closest('[data-slot="form-field"]')).toHaveClass(
			'flex',
			'w-full',
			'flex-col',
			'gap-1.5'
		);
	});

	it('U-06.8: the error replaces the helper, marks the control invalid and is read politely', () => {
		render(Harness, {
			props: { helperText: 'Δεν θα κοινοποιηθεί ποτέ.', error: 'Δώσε ένα έγκυρο email.' }
		});
		const input = screen.getByLabelText('Email');
		const error = screen.getByText('Δώσε ένα έγκυρο email.');
		expect(screen.queryByText('Δεν θα κοινοποιηθεί ποτέ.')).toBeNull();
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAttribute('aria-describedby', error.id);
		expect(error).toHaveClass('text-danger-text');
		expect(error).toHaveAttribute('aria-live', 'polite');
		expect(error.querySelector('svg')).toBeNull();
	});

	it('U-06.8: required adds the danger «*»; disabled dims the label; no message, no description', () => {
		const { container } = render(Harness, { props: { required: true, disabled: true } });
		expect(container.querySelector('[data-slot="label-required"]')).toHaveClass('text-danger-text');
		expect(container.querySelector('[data-slot="label"]')).toHaveClass('opacity-50');
		const input = screen.getByRole('textbox');
		expect(input).toBeDisabled();
		expect(input).not.toHaveAttribute('aria-describedby');
		expect(container.querySelector('[data-slot="form-field-message"]')).toBeNull();
	});

	// NIT-3 (R1 review): the application's `error ?? helperText` — an empty error shows no line, not the helper.
	it('NIT-3: an empty error shows no line (the application’s `??`)', () => {
		const { container } = render(Harness, {
			props: { helperText: 'Δεν θα κοινοποιηθεί ποτέ.', error: '' }
		});
		expect(container.querySelector('[data-slot="form-field-message"]')).toBeNull();
		expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid');
	});
});
