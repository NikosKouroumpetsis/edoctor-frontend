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

	it('U-24.3: the chosen card reads 2 dark (the sort cards) — an inset ring inside the 1 border, so nothing reflows', () => {
		render(Harness, { props: { value: 'alpha' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(alpha).toHaveClass('border', 'ring-1', 'ring-inset', 'ring-foreground', 'p-6');
		expect(alpha).not.toHaveClass('border-2');
		expect(beta).not.toHaveClass('ring-1');
	});

	it('U-03.1 (light/dark): only theme tokens, the same classes in both themes', () => {
		const { container } = render(Harness, { props: { value: 'beta' } });
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});

	it('U-28.3: `sm` — 12 / 16 of inset, the 16 semibold title over the 14 muted line 2 apart, the cards 8 apart (a card of ~66); the same border, states and touch box', () => {
		render(Harness, { props: { value: 'alpha', size: 'sm' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(alpha).toHaveClass('px-4', 'py-3', 'min-h-touch', 'rounded-md', 'border', 'gap-4');
		expect(alpha).not.toHaveClass('p-6');
		expect(screen.getByText('Alpha')).toHaveClass(
			'text-body-lg',
			'leading-tight',
			'font-semibold',
			'text-foreground'
		);
		expect(screen.getByText('Alpha')).not.toHaveClass('text-title-md');
		expect(screen.getByText('Alpha').parentElement).toHaveClass('flex-col', 'gap-0.5');
		expect(screen.getByText('First option')).toHaveClass(
			'text-body-sm',
			'leading-tight',
			'text-muted-foreground'
		);
		expect(alpha.parentElement).toHaveClass('flex', 'flex-col', 'gap-2');
		expect(alpha.parentElement).not.toHaveClass('gap-3');
		// The chosen card's look is the one of `md` (U-24.3: 2 dark through the inset ring).
		expect(alpha).toHaveClass(
			'border-foreground',
			'bg-muted',
			'shadow-raised',
			'ring-1',
			'ring-foreground',
			'ring-inset'
		);
		expect(beta).toHaveClass('border-border', 'bg-transparent', 'px-4', 'py-3');
	});

	it('U-28.3 (negative): without `size` the card is `md`, the application’s, class for class as before — no class of `sm`', () => {
		render(Harness, { props: { value: 'alpha' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		expect(alpha).toHaveClass('p-6');
		for (const name of ['px-4', 'py-3']) expect(alpha).not.toHaveClass(name);
		expect(screen.getByText('Alpha')).toHaveClass('text-title-md');
		expect(screen.getByText('Alpha')).not.toHaveClass('text-body-lg', 'leading-tight');
		expect(screen.getByText('Alpha').parentElement).toHaveClass('gap-1');
		expect(screen.getByText('First option')).not.toHaveClass('leading-tight');
		expect(alpha.parentElement).toHaveClass('gap-3');
		expect(alpha.parentElement).not.toHaveClass('gap-2');
	});

	it('U-28.4: with a pointer a card not chosen darkens its border on hover (only while enabled); the chosen one has no hover', () => {
		render(Harness, { props: { value: 'alpha' } });
		const alpha = screen.getByRole('radio', { name: /Alpha/ });
		const beta = screen.getByRole('radio', { name: /Beta/ });
		expect(beta).toHaveClass(
			'can-hover:enabled:hover:border-foreground',
			'transition-colors',
			'duration-standard',
			'ease-standard'
		);
		expect([...alpha.classList].filter((name) => name.includes('hover:'))).toEqual([]);
	});
});
