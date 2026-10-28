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

	it('renders the button tones of the application and their states', () => {
		render(Page);
		for (const tone of ['Primary', 'Secondary', 'Accent', 'Contrast', 'Ghost', 'Muted', 'Outline'])
			expect(screen.getByRole('button', { name: tone })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
		expect(screen.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true');
		expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
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
