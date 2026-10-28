import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ProfileSummaryCard from './profile-summary-card.svelte';

const STATS = [
	{ id: 'rating', kind: 'rating' as const, value: '4,9', label: 'Βαθμολογία' },
	{ id: 'reviews', value: '124', label: 'Κριτικές' },
	{ id: 'years', value: '12', label: 'Χρόνια εμπειρίας' }
];
const BASE = {
	name: 'Μαρία Παπαδοπούλου',
	role: 'Παθολόγος',
	initial: 'ΜΠ',
	stats: STATS,
	testIdPrefix: 'pro'
};

describe('ProfileSummaryCard', () => {
	it('U-02.2 (K5.8): the application’s raised card, class for class — who on the left, the numbers on the right (M-24)', () => {
		render(ProfileSummaryCard, { props: BASE });
		expect(screen.getByTestId('pro-card')).toHaveClass(
			'flex',
			'flex-row',
			'items-center',
			'gap-4',
			'rounded-xl',
			'border',
			'border-border/60',
			'bg-card',
			'p-5',
			'shadow-soft'
		);
		const name = screen.getByText('Μαρία Παπαδοπούλου');
		expect(name).toHaveClass('text-center', 'text-title-md', 'font-bold', 'text-foreground');
		expect(screen.getByText('Παθολόγος')).toHaveClass(
			'text-center',
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(name.parentElement).toHaveClass('flex', 'flex-col', 'items-center', 'gap-1');
		expect(name.parentElement?.parentElement).toHaveClass(
			'flex',
			'flex-1',
			'flex-col',
			'items-center',
			'gap-3'
		);
		// MINOR-3: Yoga's `minWidth: 0` — the column narrows below its longest label, so `truncate` cuts it.
		expect(screen.getByTestId('pro-stats')).toHaveClass(
			'flex',
			'min-w-0',
			'flex-1',
			'flex-col',
			'gap-3'
		);
	});

	it('U-02.2: the xl avatar — its initials on the muted circle — named by the person (the application’s Avatar)', () => {
		render(ProfileSummaryCard, { props: BASE });
		const avatar = screen.getByRole('img', { name: 'Μαρία Παπαδοπούλου' });
		expect(avatar).toHaveClass('size-avatar-xl', 'rounded-full', 'bg-muted', 'overflow-hidden');
		expect(screen.getByText('ΜΠ')).toHaveClass(
			'text-title-sm',
			'font-semibold',
			'text-muted-foreground'
		);
		expect(avatar.querySelector('img')).toBeNull();
	});

	it('U-03.1: with a photo the avatar draws it (decorative inside the named circle)', () => {
		render(ProfileSummaryCard, { props: { ...BASE, imageUrl: 'https://cdn.example.test/a.jpg' } });
		const image = screen.getByRole('img', { name: 'Μαρία Παπαδοπούλου' }).querySelector('img');
		expect(image).toHaveAttribute('src', 'https://cdn.example.test/a.jpg');
		expect(image).toHaveAttribute('alt', '');
	});

	it('U-02.2: each stat a bold value (the rating with its star) over a one-line muted label, a hairline BETWEEN rows', () => {
		render(ProfileSummaryCard, { props: BASE });
		expect(screen.getAllByTestId('pro-stat-separator')).toHaveLength(STATS.length - 1);
		for (const separator of screen.getAllByTestId('pro-stat-separator'))
			expect(separator).toHaveClass('h-px', 'w-full', 'bg-border/60');
		const rating = screen.getByText('4,9').closest('[data-slot="rating"]');
		expect(rating).toHaveAttribute('data-variant', 'value');
		expect(rating?.querySelector('[data-icon="star"]')).toHaveClass('text-rating');
		expect(screen.getByText('124')).toHaveClass('text-title-md', 'font-bold', 'text-foreground');
		expect(screen.getByText('124').parentElement).toHaveClass(
			'flex',
			'flex-row',
			'items-center',
			'gap-1'
		);
		for (const label of ['Βαθμολογία', 'Κριτικές', 'Χρόνια εμπειρίας'])
			expect(screen.getByText(label)).toHaveClass(
				'truncate',
				'text-body-sm',
				'text-muted-foreground'
			);
		expect(screen.getByText('Κριτικές').parentElement).toHaveClass('flex', 'flex-col', 'gap-0.5');
	});

	it('U-02.2 (negative): no stats drop the column; one stat draws no hairline', () => {
		const view = render(ProfileSummaryCard, { props: { ...BASE, stats: [] } });
		expect(screen.queryByTestId('pro-stats')).toBeNull();
		view.unmount();
		render(ProfileSummaryCard, { props: { ...BASE, stats: STATS.slice(1, 2) } });
		expect(screen.queryByTestId('pro-stat-separator')).toBeNull();
	});

	it('U-03.1 (zones, light/dark): the same card at every width and only theme tokens', () => {
		const { container } = render(ProfileSummaryCard, { props: BASE });
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
