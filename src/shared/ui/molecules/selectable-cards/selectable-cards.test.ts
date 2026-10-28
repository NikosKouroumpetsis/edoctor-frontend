import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Harness from './selectable-cards.harness.svelte';

describe('SelectableCards', () => {
	it('U-03.1 (K4.x): the application’s card — 1px border, p-6, the 19 semibold title over the muted 14 line', () => {
		render(Harness, { props: { value: 'alpha' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(alpha).toHaveClass(
			'flex',
			'min-h-touch',
			'w-full',
			'flex-row',
			'items-center',
			'justify-between',
			'gap-4',
			'rounded-md',
			'border',
			'p-6',
			'border-foreground',
			'bg-muted',
			'shadow-raised'
		);
		expect(alpha).not.toHaveClass('border-2');
		expect(beta).toHaveClass('border-border', 'bg-transparent', 'shadow-none');
		expect(screen.getByText('Alpha')).toHaveClass(
			'text-title-md',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Alpha').parentElement).toHaveClass(
			'flex',
			'min-w-0',
			'flex-1',
			'flex-col',
			'gap-1'
		);
		expect(screen.getByText('First option')).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(screen.getByText('Choose a space')).toHaveClass(
			'mb-4',
			'text-heading-md',
			'font-semibold',
			'text-foreground'
		);
		expect(
			screen.getByRole('radiogroup', { name: 'Choose a space' }).parentElement
		).toHaveAttribute('data-testid', 'space');
		expect(alpha).toHaveAttribute('data-testid', 'space-alpha');
	});

	it('U-03.1 (K4.x): the glyph trails the words by default and leads them on request (the sort cards)', () => {
		const trailing = render(Harness, { props: {} });
		const card = screen.getByRole('radio', { name: /Alpha/ });
		expect(card.lastElementChild?.querySelector('[data-icon="star-outline"]')).not.toBeNull();
		trailing.unmount();
		render(Harness, { props: { iconPlacement: 'leading' } });
		expect(
			screen.getByRole('radio', { name: /Alpha/ }).firstElementChild?.querySelector('[data-icon]')
		).not.toBeNull();
	});

	it('U-03.1: single — exactly one chosen, choosing it again keeps it; `onChange` gets the value', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(Harness, { props: { onChange } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });
		await user.click(alpha);
		expect(alpha).toHaveAttribute('aria-checked', 'true');
		await user.click(beta);
		expect(beta).toHaveAttribute('aria-checked', 'true');
		expect(alpha).toHaveAttribute('aria-checked', 'false');
		await user.click(beta);
		expect(beta).toHaveAttribute('aria-checked', 'true');
		expect(onChange).toHaveBeenLastCalledWith('beta');
	});

	it('U-03.1: multiple — several chosen as checkboxes, a second press removes one', async () => {
		const user = userEvent.setup({ delay: null });
		const onChange = vi.fn();
		render(Harness, { props: { type: 'multiple', onChange } });
		const alpha = screen.getByRole('checkbox', { name: /Alpha/ });
		const gamma = screen.getByRole('checkbox', { name: /Gamma/ });
		expect(screen.getByRole('group', { name: 'Choose spaces' })).toBeInTheDocument();
		await user.click(alpha);
		await user.click(gamma);
		expect(onChange).toHaveBeenLastCalledWith(['alpha', 'gamma']);
		await user.click(alpha);
		expect(alpha).toHaveAttribute('aria-checked', 'false');
		expect(onChange).toHaveBeenLastCalledWith(['gamma']);
	});

	it('U-03.1 (a11y): one Tab stop (the chosen card, else the first); single arrows move and choose', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: {} });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		expect(alpha).toHaveAttribute('tabindex', '0');
		expect(screen.getByRole('radio', { name: /Beta/ })).toHaveAttribute('tabindex', '-1');
		alpha.focus();
		await user.keyboard('{ArrowDown}');
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(beta).toHaveFocus();
		expect(beta).toHaveAttribute('aria-checked', 'true');
		expect(beta).toHaveAttribute('tabindex', '0');
	});

	it('U-03.1 (a11y): multiple — the arrows only move, Space toggles', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { type: 'multiple' } });
		screen.getByRole('checkbox', { name: /Alpha/ }).focus();
		await user.keyboard('{ArrowDown}');
		const beta = screen.getByRole('checkbox', { name: /Beta/ });
		expect(beta).toHaveFocus();
		expect(beta).toHaveAttribute('aria-checked', 'false');
		await user.keyboard(' ');
		expect(beta).toHaveAttribute('aria-checked', 'true');
	});

	it('U-03.1 (negative): disabled ⇒ dimmed and refused', async () => {
		const onChange = vi.fn();
		render(Harness, { props: { disabled: true, onChange } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		expect(alpha).toBeDisabled();
		expect(alpha).toHaveClass('opacity-50');
		await userEvent.setup({ delay: null }).click(alpha);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(Harness, { props: { value: 'beta' } });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
