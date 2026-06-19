import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PasswordField from './password-field.svelte';

describe('PasswordField', () => {
	it('masks input by default and reveals on toggle', async () => {
		const user = userEvent.setup({ delay: null });
		render(PasswordField, { props: { label: 'Password' } });
		const input = screen.getByLabelText('Password');
		expect(input).toHaveAttribute('type', 'password');

		await user.click(screen.getByRole('button', { name: 'Show password' }));
		expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

		await user.click(screen.getByRole('button', { name: 'Hide password' }));
		expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
	});
});
