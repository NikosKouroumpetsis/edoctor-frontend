import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PasswordField from './password-field.svelte';

describe('PasswordField', () => {
	it('masks input by default and reveals on toggle', async () => {
		const user = userEvent.setup({ delay: null });
		render(PasswordField, {
			props: { hideLabel: 'Hide password', showLabel: 'Show password', label: 'Password' }
		});
		const input = screen.getByLabelText('Password');
		expect(input).toHaveAttribute('type', 'password');

		await user.click(screen.getByRole('button', { name: 'Show password' }));
		expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

		await user.click(screen.getByRole('button', { name: 'Hide password' }));
		expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
	});

	it('U-03.1: the text reveal variant writes the names as words; helper text sits below', async () => {
		const user = userEvent.setup({ delay: null });
		render(PasswordField, {
			props: {
				label: 'Κωδικός',
				hideLabel: 'Απόκρυψη',
				showLabel: 'Εμφάνιση',
				revealVariant: 'text',
				helperText: 'Τουλάχιστον 8 χαρακτήρες.'
			}
		});
		await user.click(screen.getByRole('button', { name: 'Εμφάνιση' }));
		expect(screen.getByLabelText('Κωδικός')).toHaveAttribute('type', 'text');
		expect(screen.getByRole('button', { name: 'Απόκρυψη' })).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByText('Τουλάχιστον 8 χαρακτήρες.')).toHaveClass('text-muted-foreground');
	});

	it('forwards the placeholder and reveals it only while focused', async () => {
		const user = userEvent.setup({ delay: null });
		render(PasswordField, {
			props: {
				hideLabel: 'Hide password',
				showLabel: 'Show password',
				label: 'Password',
				placeholder: 'Enter your password'
			}
		});
		const input = screen.getByLabelText('Password');

		expect(input).toHaveAttribute('placeholder', ' ');
		await user.click(input);
		expect(input).toHaveAttribute('placeholder', 'Enter your password');
		expect(input.className).not.toContain('placeholder:text-transparent');
	});
});
