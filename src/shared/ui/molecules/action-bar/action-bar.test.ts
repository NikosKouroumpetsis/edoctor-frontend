import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import ActionBar from './action-bar.svelte';

const base = {
	primaryLabel: 'Αναζήτηση',
	secondaryLabel: 'Εκκαθάριση όλων',
	onPrimaryClick: () => {},
	onSecondaryClick: () => {}
};

const barOf = () => document.querySelector('[data-slot="action-bar"]');
const labelOf = (button: HTMLElement) => button.querySelector('span:last-child');

describe('ActionBar', () => {
	it('U-03.1 (K2.8): the default preset is the criteria footer — underlined link and the accent primary, unseparated', () => {
		render(ActionBar, { props: { ...base, primaryIcon: 'search' } });
		expect(barOf()).toHaveClass('px-5', 'pt-3', 'pb-safe-area-action');
		expect(barOf()).not.toHaveClass('shadow-bar');
		const row = document.querySelector('[data-slot="action-bar-row"]');
		expect(row).toHaveClass('flex-row', 'flex-wrap', 'items-center', 'justify-between', 'gap-4');
		const secondary = screen.getByRole('button', { name: 'Εκκαθάριση όλων' });
		expect(secondary).toHaveClass('min-h-touch', 'min-w-touch');
		expect(secondary.firstElementChild).toHaveClass(
			'text-body-sm',
			'font-semibold',
			'underline',
			'text-foreground'
		);
		const primary = screen.getByRole('button', { name: 'Αναζήτηση' });
		expect(primary).toHaveClass(
			'ml-auto',
			'min-h-control-md',
			'min-w-touch',
			'rounded-md',
			'border',
			'border-accent',
			'bg-accent',
			'shadow-soft',
			'gap-2.5',
			'px-5'
		);
		expect(labelOf(primary)).toHaveClass(
			'text-body-lg',
			'font-semibold',
			'text-secondary-foreground'
		);
		expect(primary.querySelector('[data-icon="search"]')).toHaveClass(
			'icon-md',
			'text-secondary-foreground'
		);
	});

	it('U-03.1 (K2.8): filters is separated (shadow-bar on the background) with the compact one-line primary', () => {
		render(ActionBar, { props: { ...base, preset: 'filters', primaryLabel: 'Εμφάνιση 12' } });
		expect(barOf()).toHaveClass('bg-background', 'shadow-bar');
		const primary = screen.getByRole('button', { name: 'Εμφάνιση 12' });
		expect(primary).toHaveClass('px-4');
		expect(labelOf(primary)).toHaveClass('text-body-sm');
	});

	it('U-03.1 (K2.8): plain is the availability footer — the secondary one step up, without the line', () => {
		render(ActionBar, { props: { ...base, preset: 'plain' } });
		const secondary = screen.getByRole('button', { name: 'Εκκαθάριση όλων' });
		expect(secondary.firstElementChild).toHaveClass('text-body-md', 'font-semibold');
		expect(secondary.firstElementChild).not.toHaveClass('underline');
		expect(barOf()).not.toHaveClass('shadow-bar');
	});

	it('U-03.1 (K2.8): a named appearance or separation wins over the preset', () => {
		render(ActionBar, {
			props: { ...base, preset: 'filters', separated: false, primaryAppearance: 'default' }
		});
		expect(barOf()).not.toHaveClass('shadow-bar');
		expect(screen.getByRole('button', { name: 'Αναζήτηση' })).toHaveClass('px-5');
	});

	it('U-03.1 (K2.8): disabled actions are refused and dimmed; loading swaps the glyph for a spinner and stays named', async () => {
		const user = userEvent.setup({ delay: null });
		const onPrimaryClick = vi.fn();
		const onSecondaryClick = vi.fn();
		const view = render(ActionBar, {
			props: {
				...base,
				onPrimaryClick,
				onSecondaryClick,
				secondaryDisabled: true,
				primaryDisabled: true
			}
		});
		const secondary = screen.getByRole('button', { name: 'Εκκαθάριση όλων' });
		const primary = screen.getByRole('button', { name: 'Αναζήτηση' });
		expect(secondary).toBeDisabled();
		expect(secondary).toHaveClass('opacity-40');
		expect(secondary.firstElementChild).toHaveClass('text-muted-foreground');
		expect(primary).toBeDisabled();
		expect(primary).toHaveClass('opacity-50');
		await user.click(secondary);
		await user.click(primary);
		expect(onSecondaryClick).not.toHaveBeenCalled();
		expect(onPrimaryClick).not.toHaveBeenCalled();
		view.unmount();

		render(ActionBar, { props: { ...base, primaryIcon: 'search', primaryLoading: true } });
		const busy = screen.getByRole('button', { name: 'Αναζήτηση' });
		expect(busy).toHaveAttribute('aria-busy', 'true');
		expect(busy).toBeDisabled();
		expect(busy.querySelector('[data-slot="spinner"]')).not.toBeNull();
		expect(busy.querySelector('[data-icon="search"]')).toBeNull();
	});

	it('U-03.1 (K2.8): presses reach the caller, a fuller name replaces the label, and the row takes the caller’s width', async () => {
		const user = userEvent.setup({ delay: null });
		const onPrimaryClick = vi.fn();
		const onSecondaryClick = vi.fn();
		render(ActionBar, {
			props: {
				...base,
				onPrimaryClick,
				onSecondaryClick,
				primaryAriaLabel: 'Αναζήτηση γιατρών',
				primaryTestId: 'apply',
				contentWidthClass: 'tablet:max-w-form'
			}
		});
		await user.click(screen.getByRole('button', { name: 'Αναζήτηση γιατρών' }));
		await user.click(screen.getByRole('button', { name: 'Εκκαθάριση όλων' }));
		expect(onPrimaryClick).toHaveBeenCalledOnce();
		expect(onSecondaryClick).toHaveBeenCalledOnce();
		expect(screen.getByTestId('apply')).toHaveAttribute('data-slot', 'action-bar-primary');
		expect(document.querySelector('[data-slot="action-bar-row"]')).toHaveClass('tablet:max-w-form');
	});
});
