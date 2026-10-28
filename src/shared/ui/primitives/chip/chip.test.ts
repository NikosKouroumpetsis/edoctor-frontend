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
});
