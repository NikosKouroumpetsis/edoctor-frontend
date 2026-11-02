import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './step-card.harness.svelte';

describe('StepCard', () => {
	it('U-21/U-23.2: closed, one 56 line on the card (corner 24) — the label muted left, the placeholder 600 right', async () => {
		const user = userEvent.setup({ delay: null });
		const onExpand = vi.fn();
		render(Harness, { props: { onExpand } });
		const card = screen.getByTestId('card-where');
		expect(card.tagName).toBe('BUTTON');
		expect(card).toHaveAttribute('data-state', 'closed');
		expect(card).toHaveAttribute('aria-expanded', 'false');
		expect(card).toHaveClass(
			'min-h-row',
			'w-full',
			'justify-between',
			'rounded-xl',
			'bg-card',
			'px-5',
			'shadow-raised'
		);
		expect(screen.getByText('Πού')).toHaveClass('text-body-sm', 'text-muted-foreground');
		const value = screen.getByText('Προσθέστε περιοχή');
		expect(value).toHaveClass('truncate', 'text-right', 'font-semibold', 'text-foreground');
		expect(value).toHaveAttribute('data-empty');
		expect(screen.queryByRole('heading')).toBeNull();
		expect(screen.queryByText('Περιεχόμενο')).toBeNull();
		await user.click(card);
		expect(onExpand).toHaveBeenCalledOnce();
	});

	it('U-21: closed with a choice, the choice on the right instead of the placeholder', () => {
		render(Harness, { props: { value: 'Πειραιάς' } });
		const value = screen.getByText('Πειραιάς');
		expect(value).not.toHaveAttribute('data-empty');
		expect(screen.queryByText('Προσθέστε περιοχή')).toBeNull();
	});

	it('U-21/U-23.2: open, the 24/700 title names the section over its content; it rises in on a motion token', () => {
		render(Harness, { props: { expanded: true, value: 'Πειραιάς' } });
		const card = screen.getByTestId('card-where');
		expect(card.tagName).toBe('SECTION');
		expect(card).toHaveAttribute('data-state', 'open');
		const title = screen.getByRole('heading', { level: 2, name: 'Πού;' });
		expect(title).toHaveClass('text-heading-md', 'font-bold', 'text-foreground');
		expect(screen.getByRole('region', { name: 'Πού;' })).toBe(card);
		expect(card).toHaveClass(
			'rounded-xl',
			'bg-card',
			'px-5',
			'pt-6',
			'transition-[translate,opacity]',
			'duration-standard',
			'starting:translate-y-3',
			'starting:opacity-0'
		);
		expect(screen.getByText('Περιεχόμενο')).toBeInTheDocument();
		// Open, the card shows no line of its own: the choice is the content's.
		expect(screen.queryByText('Πειραιάς')).toBeNull();
	});

	it('U-03.1 (light/dark): only theme tokens', () => {
		const { container } = render(Harness, { props: { expanded: true } });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
