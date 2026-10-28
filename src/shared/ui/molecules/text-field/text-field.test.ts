import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TextField from './text-field.svelte';
import FormHarness from './text-field.form-harness.svelte';

describe('TextField (standalone)', () => {
	// U-06.8 (3β) + R3-3: the label is the shared `FloatingLabel`, floated by focus OR a value (the application's
	// `floated = focused || hasValue`), with the same classes the field drew by CSS before.
	it('U-06.8: the label rests while empty and blurred, floats on focus and stays floated with a value', async () => {
		const user = userEvent.setup({ delay: null });
		const { container } = render(TextField, { props: { label: 'Email' } });
		const label = () => container.querySelector('[data-slot="text-field-label"]') as HTMLElement;
		expect(label()).toHaveClass(
			'translate-y-0',
			'scale-100',
			'top-3',
			'left-2.5',
			'text-muted-foreground'
		);
		expect(label()).not.toHaveAttribute('data-floated');
		expect(label().className).not.toMatch(/peer-placeholder-shown/);

		await user.click(screen.getByLabelText('Email'));
		expect(label()).toHaveClass('scale-75', '-translate-y-3', 'text-foreground');
		await user.type(screen.getByLabelText('Email'), 'a');
		await user.tab();
		expect(label()).toHaveAttribute('data-floated');
		expect(label()).toHaveClass('text-muted-foreground');
	});

	it('U-06.8: a value from the caller floats it before any focus; an error colours it', () => {
		const { container } = render(TextField, {
			props: { label: 'Email', value: 'name@example.com', error: 'Δώσε ένα έγκυρο email.' }
		});
		const label = container.querySelector('[data-slot="text-field-label"]') as HTMLElement;
		expect(label).toHaveAttribute('data-floated');
		expect(label).toHaveClass('text-danger-text');
	});

	it('associates the floating label with the input', () => {
		render(TextField, { props: { label: 'Email' } });
		expect(screen.getByLabelText('Email')).toBeInTheDocument();
	});

	it('updates its value as the user types', async () => {
		const user = userEvent.setup({ delay: null });
		render(TextField, { props: { label: 'Email' } });
		const input = screen.getByLabelText('Email');
		await user.type(input, 'a@b.gr');
		expect(input).toHaveValue('a@b.gr');
	});

	it('shows an error message and marks the input invalid', () => {
		render(TextField, { props: { label: 'Email', error: 'Required' } });
		const input = screen.getByLabelText('Email');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(screen.getByText('Required')).toBeInTheDocument();
		expect(input).toHaveAttribute(
			'aria-describedby',
			screen.getByText('Required').closest('p')?.id
		);
		expect(screen.getByText('Required')).toHaveClass('text-danger-text');
		expect(input).toHaveClass(
			'aria-[invalid=true]:border-danger',
			'aria-[invalid=true]:bg-danger/10'
		);
	});

	it('U-03.1: shows the helper line, marks required and invalid, and reports each text (onChangeText)', async () => {
		const user = userEvent.setup({ delay: null });
		const onChangeText = vi.fn();
		render(TextField, {
			props: {
				label: 'Κινητό',
				helperText: 'Θα σας στείλουμε κωδικό.',
				required: true,
				invalid: true,
				onChangeText
			}
		});
		const input = screen.getByLabelText('Κινητό');
		expect(input).toHaveAttribute('aria-required', 'true');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		const helper = screen.getByText('Θα σας στείλουμε κωδικό.');
		expect(helper).toHaveClass('text-muted-foreground');
		expect(input).toHaveAttribute('aria-describedby', helper.id);
		await user.type(input, '69');
		expect(onChangeText).toHaveBeenLastCalledWith('69');
	});

	it('reveals the placeholder only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(TextField, { props: { label: 'Email', placeholder: 'you@example.com' } });
		const input = screen.getByLabelText('Email');

		// Unfocused: a blank space keeps `:placeholder-shown` working (floating label)
		// without showing any visible placeholder text.
		expect(input).toHaveAttribute('placeholder', ' ');

		await user.click(input);
		expect(input).toHaveAttribute('placeholder', 'you@example.com');

		await user.tab();
		expect(input).toHaveAttribute('placeholder', ' ');
	});

	it('styles the placeholder as visible (not transparent)', () => {
		render(TextField, { props: { label: 'Email', placeholder: 'you@example.com' } });
		const input = screen.getByLabelText('Email');
		// Regression guard: a transparent placeholder would stay invisible on focus.
		expect(input.className).toContain('placeholder:text-muted-foreground');
		expect(input.className).not.toContain('placeholder:text-transparent');
	});
});

describe('TextField (form-connected)', () => {
	it('validates the bound field on blur and clears once valid', async () => {
		const user = userEvent.setup({ delay: null });
		render(FormHarness);
		const email = screen.getByLabelText('Email');

		await user.click(email);
		await user.tab(); // blur empty -> required
		await waitFor(() => expect(screen.getByText(/required/i)).toBeInTheDocument());

		await user.type(email, 'a@b.gr');
		await waitFor(() => expect(screen.queryByText(/required/i)).not.toBeInTheDocument());
	});

	it('keeps writes to the bound values without console errors/warnings', async () => {
		const user = userEvent.setup({ delay: null });
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(FormHarness);
		await user.type(screen.getByLabelText('Name'), 'Maria');
		expect(screen.getByLabelText('Name')).toHaveValue('Maria');
		expect(errorSpy).not.toHaveBeenCalled();
		expect(warnSpy).not.toHaveBeenCalled();
		errorSpy.mockRestore();
		warnSpy.mockRestore();
	});

	it('does not re-render a sibling field when another field changes (fine-grained)', async () => {
		const user = userEvent.setup({ delay: null });
		const onRenderEmail = vi.fn();
		const onRenderName = vi.fn();
		render(FormHarness, { props: { onRenderEmail, onRenderName } });

		// Initial effect run for each.
		await waitFor(() => expect(onRenderName).toHaveBeenCalledTimes(1));
		expect(onRenderEmail).toHaveBeenCalledTimes(1);

		await user.type(screen.getByLabelText('Email'), 'abc');
		// Email probe re-ran for each keystroke; name probe never re-ran.
		expect(onRenderEmail.mock.calls.length).toBeGreaterThan(1);
		expect(onRenderName).toHaveBeenCalledTimes(1);
	});
});
