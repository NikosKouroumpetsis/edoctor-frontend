import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import TextField from './text-field.svelte';
import FormHarness from './text-field.form-harness.svelte';

describe('TextField (standalone)', () => {
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
		expect(input).toHaveAttribute('aria-describedby', screen.getByText('Required').id);
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
