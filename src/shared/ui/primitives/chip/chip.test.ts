import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import Chip from './chip.svelte';

const pillOf = (button: HTMLElement) =>
	button.querySelector('[data-slot="chip-pill"]') as HTMLElement;

describe('Chip', () => {
	it('U-03.1: is a 48 toggle around a 40 pill; at rest card with a border (K1.4)', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		render(Chip, { props: { label: 'Κάρτα', onclick } });
		const chip = screen.getByRole('button', { name: 'Κάρτα' });
		expect(chip).toHaveClass('min-h-touch', 'min-w-touch');
		expect(chip).toHaveAttribute('aria-pressed', 'false');
		expect(pillOf(chip)).toHaveClass(
			'rounded-full',
			'border',
			'border-border',
			'bg-card',
			'min-h-control-sm',
			'px-4'
		);
		expect(screen.getByText('Κάρτα')).toHaveClass(
			'font-medium',
			'text-label-lg',
			'text-foreground'
		);
		await user.click(chip);
		expect(onclick).toHaveBeenCalledOnce();
	});

	it('U-03.1: selected is the solid primary pill; tinted is the filter tint with primary-text', () => {
		const filled = render(Chip, { props: { label: 'Α', selected: true } });
		const a = screen.getByRole('button', { name: 'Α' });
		expect(a).toHaveAttribute('aria-pressed', 'true');
		expect(pillOf(a)).toHaveClass('border-primary', 'bg-primary');
		expect(screen.getByText('Α')).toHaveClass('text-primary-foreground');
		filled.unmount();

		render(Chip, {
			props: { label: 'Β', selected: true, variant: 'tinted', icon: 'card-outline', count: '12' }
		});
		const b = screen.getByRole('button', { name: 'Β 12' });
		expect(pillOf(b)).toHaveClass('border-primary', 'bg-primary/10');
		expect(screen.getByText('Β')).toHaveClass('text-primary-text');
		expect(screen.getByText('12')).toHaveClass('text-label-md', 'text-primary-text');
		expect(b.querySelector('[data-icon="card-outline"]')).toHaveClass('icon-sm', 'text-primary');
	});

	it('U-24.3: `outline` is the results’ filters chip — chosen ⇒ the 2 dark ring (inset) on the band, the words dark, the count muted', () => {
		const chosen = render(Chip, {
			props: {
				label: 'Κάρτα',
				selected: true,
				variant: 'outline',
				icon: 'card-outline',
				count: '64'
			}
		});
		const card = screen.getByRole('button', { name: 'Κάρτα 64' });
		expect(pillOf(card)).toHaveClass(
			'border-foreground',
			'bg-background',
			'ring-1',
			'ring-inset',
			'ring-foreground'
		);
		expect(pillOf(card)).not.toHaveClass('bg-primary', 'bg-primary/10');
		expect(screen.getByText('Κάρτα')).toHaveClass('text-foreground');
		expect(screen.getByText('64')).toHaveClass('text-muted-foreground');
		expect(card.querySelector('[data-icon="card-outline"]')).toHaveClass('text-foreground');
		chosen.unmount();

		render(Chip, { props: { label: 'Μετρητά', variant: 'outline' } });
		const idle = screen.getByRole('button', { name: 'Μετρητά' });
		expect(pillOf(idle)).toHaveClass('border-border', 'bg-card');
		expect(pillOf(idle)).not.toHaveClass('ring-1');
	});

	it('U-24.3 (NIT-3 of r1): the count sits on the label’s baseline, as the prototype’s `.fchip small` — never raised', () => {
		render(Chip, { props: { label: 'Κάρτα', variant: 'outline', count: '64' } });
		const pair = screen.getByText('64').parentElement;
		expect(pair).toHaveAttribute('data-slot', 'chip-label-count');
		expect(pair).toHaveClass('inline-flex', 'items-baseline');
		expect(pair).toContainElement(screen.getByText('Κάρτα'));
	});

	it('U-24.3 (negative, final round): on a narrow chip only the label gives way — the count never shrinks nor is clipped', () => {
		render(Chip, {
			props: { label: 'Πληρωμή με κάρτα στο ιατρείο', variant: 'outline', count: '1.234' }
		});
		const count = screen.getByText('1.234');
		expect(count).toHaveAttribute('data-slot', 'chip-count');
		expect(count).toHaveClass('shrink-0', 'whitespace-nowrap');
		expect(count).not.toHaveClass('truncate');
		expect(count.className).not.toMatch(/\b(overflow-|line-clamp-|text-ellipsis)/);
		expect(screen.getByText('Πληρωμή με κάρτα στο ιατρείο')).toHaveClass('truncate');
	});

	it('U-24.3 (negative, NIT-3 of r1): a chip without a count draws its label alone (no pair)', () => {
		render(Chip, { props: { label: 'Μετρητά', variant: 'outline' } });
		const chip = screen.getByRole('button', { name: 'Μετρητά' });
		expect(chip.querySelector('[data-slot="chip-label-count"]')).toBeNull();
		expect(screen.getByText('Μετρητά').parentElement).toHaveAttribute('data-slot', 'chip-pill');
	});

	it('U-03.1: a removable chip shows the ✕ and calls onRemove, not onclick', async () => {
		const user = userEvent.setup({ delay: null });
		const onRemove = vi.fn();
		const onclick = vi.fn();
		render(Chip, {
			props: { label: 'Αθήνα', removable: true, onRemove, onclick, 'aria-label': 'Αφαίρεση: Αθήνα' }
		});
		const chip = screen.getByRole('button', { name: 'Αφαίρεση: Αθήνα' });
		expect(chip).not.toHaveAttribute('aria-pressed');
		expect(chip.querySelector('[data-icon="close"]')).not.toBeNull();
		await user.click(chip);
		expect(onRemove).toHaveBeenCalledOnce();
		expect(onclick).not.toHaveBeenCalled();
	});

	it('U-03.1: size sm is the 32 pill with the label-md role; disabled dims and refuses', () => {
		render(Chip, { props: { label: 'Μικρό', size: 'sm', disabled: true } });
		const chip = screen.getByRole('button', { name: 'Μικρό' });
		expect(pillOf(chip)).toHaveClass('min-h-control-xs', 'px-3');
		expect(screen.getByText('Μικρό')).toHaveClass('text-label-md');
		expect(chip).toBeDisabled();
		expect(chip).toHaveClass('disabled:opacity-50');
	});

	it('U-58.1 (app = web): `phoneVariant` draws the chosen chip as another variant below 744 — the application’s outline ring — and `variant` from 744', () => {
		render(Chip, {
			props: {
				label: 'Όλα',
				href: '/help',
				selected: true,
				variant: 'tinted',
				phoneVariant: 'outline'
			}
		});
		const link = screen.getByRole('link', { name: 'Όλα' });
		expect(link).toHaveAttribute('aria-current', 'page');
		expect(pillOf(link)).toHaveClass(
			'max-tablet:border-foreground',
			'max-tablet:ring-1',
			'max-tablet:ring-foreground',
			'tablet:border-primary',
			'tablet:bg-primary/10'
		);
		expect(pillOf(link)).not.toHaveClass('bg-primary/10');
		expect(screen.getByText('Όλα')).toHaveClass(
			'max-tablet:text-foreground',
			'tablet:text-primary-text'
		);
	});

	it('U-58.1 (negative): an idle chip is the same at every width, whatever its zones', () => {
		render(Chip, {
			props: {
				label: 'Άρθρα',
				href: '/articles?type=article',
				variant: 'tinted',
				phoneVariant: 'outline'
			}
		});
		const pill = pillOf(screen.getByRole('link', { name: 'Άρθρα' }));
		expect(pill).toHaveClass('border-border', 'bg-card');
		expect(pill.className).not.toMatch(/tablet:/u);
	});
});
