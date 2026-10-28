import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import DateCard from './date-card.svelte';

const BOX = [
	'flex',
	'min-h-control-xl',
	'w-full',
	'flex-col',
	'justify-center',
	'rounded-md',
	'border',
	'border-border/70',
	'px-3',
	'py-2.5',
	'text-start'
];

describe('DateCard', () => {
	it('U-02.2 (K5.3): the application’s day card, class for class — the day in primary text over the muted line (M-10)', () => {
		render(DateCard, {
			props: { title: '12 Αυγ', subtitle: 'από 10:00', onclick: () => {}, testId: 'next-day' }
		});
		const card = screen.getByTestId('next-day');
		expect(card.tagName).toBe('BUTTON');
		expect(card).toHaveClass(...BOX);
		expect(screen.getByText('12 Αυγ')).toHaveClass(
			'truncate',
			'text-body-md',
			'font-semibold',
			'text-primary-text'
		);
		expect(screen.getByText('από 10:00')).toHaveClass(
			'truncate',
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(screen.getByText('12 Αυγ').parentElement).toHaveClass('flex', 'flex-col', 'gap-0.5');
	});

	it('U-03.1 (a11y): the whole card is the target, named by both lines unless the caller names it', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const view = render(DateCard, { props: { title: '12 Αυγ', subtitle: 'από 10:00', onclick } });
		await user.click(screen.getByRole('button', { name: '12 Αυγ, από 10:00' }));
		expect(onclick).toHaveBeenCalledOnce();
		view.unmount();
		render(DateCard, {
			props: {
				title: '12 Αυγ',
				subtitle: 'από 10:00',
				onclick,
				'aria-label': 'Τετάρτη 12 Αυγούστου, από 10:00'
			}
		});
		expect(
			screen.getByRole('button', { name: 'Τετάρτη 12 Αυγούστου, από 10:00' })
		).toBeInTheDocument();
	});

	it('U-03.1 (web idiom): with `href` it is a link of the same look; a card needs one of the two', () => {
		render(DateCard, {
			props: { title: '12 Αυγ', subtitle: 'από 10:00', href: '/el/availability?date=2026-08-12' }
		});
		const link = screen.getByRole('link', { name: '12 Αυγ, από 10:00' });
		expect(link).toHaveAttribute('href', '/el/availability?date=2026-08-12');
		expect(link).toHaveClass(...BOX);
		// @ts-expect-error a day card without a press or a page
		const props: import('./index').DateCardProps = { title: 'α', subtitle: 'β' };
		expect(props.title).toBe('α');
	});

	it('U-03.1 (zones, light/dark): the same classes at every width and only theme tokens', () => {
		const { container } = render(DateCard, {
			props: { title: '12 Αυγ', subtitle: 'από 10:00', onclick: () => {} }
		});
		expect(container.innerHTML).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
