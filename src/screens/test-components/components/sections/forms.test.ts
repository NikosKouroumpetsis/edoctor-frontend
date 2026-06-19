import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Forms from './forms.svelte';

describe('Forms section (integration)', () => {
	it('blocks submission and surfaces validation errors when empty', async () => {
		const user = userEvent.setup({ delay: null });
		render(Forms);
		await user.click(screen.getByRole('button', { name: 'Create account' }));

		// Multiple required fields report errors; the result block stays hidden.
		await waitFor(() => expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0));
		expect(screen.queryByTestId('forms-result')).not.toBeInTheDocument();
	});

	it('submits valid data, rendering and logging the collected values', async () => {
		const user = userEvent.setup({ delay: null });
		const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
		render(Forms);

		await user.type(screen.getByLabelText('Full name'), 'Maria Alexiou');
		await user.type(screen.getByLabelText('Email'), 'maria@edoctor.gr');
		await user.type(screen.getByLabelText('Password'), 'Abcd1234');
		await user.click(screen.getByRole('radio', { name: 'Morning' }));
		await user.click(screen.getByRole('checkbox', { name: 'Greek' }));

		await user.click(screen.getByRole('button', { name: 'Create account' }));

		const result = await screen.findByTestId('forms-result');
		expect(result).toHaveTextContent('"fullName": "Maria Alexiou"');
		expect(result).toHaveTextContent('"email": "maria@edoctor.gr"');
		expect(result).toHaveTextContent('"slot": "morning"');
		expect(result.textContent).toContain('"gr"');

		expect(infoSpy).toHaveBeenCalledWith(
			'[forms demo] submitted',
			expect.objectContaining({ fullName: 'Maria Alexiou', slot: 'morning' })
		);
		infoSpy.mockRestore();
	});
});
