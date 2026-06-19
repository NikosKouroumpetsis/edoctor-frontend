import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Page from './index.svelte';

describe('Component gallery page', () => {
	it('renders the gallery heading and section navigation', () => {
		render(Page);
		expect(
			screen.getByRole('heading', { level: 1, name: /component gallery/i })
		).toBeInTheDocument();
		expect(screen.getByRole('navigation', { name: /component sections/i })).toBeInTheDocument();
	});

	it('renders button primitive variants', () => {
		render(Page);
		expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Destructive' })).toBeInTheDocument();
		// "Default" appears twice (a variant and a size demo).
		expect(screen.getAllByRole('button', { name: 'Default' })).toHaveLength(2);
		expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
	});

	it('associates the label with the email input and reflects typed value', async () => {
		const user = userEvent.setup();
		render(Page);
		// Scope to the basic inputs section ("Email" also appears in the forms demo).
		const section = within(document.querySelector('[data-section="text-inputs"]') as HTMLElement);
		const input = section.getByLabelText('Email');
		expect(input).toHaveAttribute('type', 'email');
		await user.type(input, 'a@b.gr');
		expect(input).toHaveValue('a@b.gr');
		expect(screen.getByText('Value: a@b.gr')).toBeInTheDocument();
	});
});
