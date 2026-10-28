import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { Rating, metaLineSizes, type MetaLineSize } from '$shared/ui/primitives/rating';
import MetaRow from './meta-row.svelte';
import type { MetaRowItem } from './index';

const items: MetaRowItem[] = [
	{
		key: 'online',
		icon: 'videocam-outline',
		iconTone: 'primary',
		label: 'Διαδικτυακή επίσκεψη',
		tone: 'muted',
		size: 'sm',
		singleLine: true,
		testId: 'online'
	},
	{
		key: 'rating',
		icon: 'star',
		iconTone: 'rating',
		label: '4,9',
		tone: 'primary',
		emphasis: true,
		labelTestId: 'rating'
	},
	{
		key: 'reviews',
		icon: 'chatbubble-ellipses-outline',
		iconTone: 'muted',
		label: '132',
		tone: 'muted'
	}
];

describe('MetaRow', () => {
	it('U-03.1 (K3.7): a wrapping row 12 × 6 apart, each fact a 16 glyph and its words 6 apart, in the given order', () => {
		const { container } = render(MetaRow, { props: { items, size: 'xs' } });
		const row = container.querySelector('[data-slot="meta-row"]') as HTMLElement;
		expect(row).toHaveClass(
			'flex',
			'flex-row',
			'flex-wrap',
			'items-center',
			'gap-x-3',
			'gap-y-1.5'
		);
		const facts = [...row.querySelectorAll('[data-slot="meta-row-item"]')];
		expect(facts.map((fact) => fact.textContent?.trim())).toEqual([
			'Διαδικτυακή επίσκεψη',
			'4,9',
			'132'
		]);
		for (const fact of facts) {
			expect(fact).toHaveClass('flex', 'items-center', 'gap-1.5');
			expect(fact.querySelector('[data-slot="ionicon"]')).toHaveClass('icon-sm');
		}
	});

	it('S-32.19, S-32.11: the colours of the doctor card — online primary glyph + muted words, the score semibold in the primary text colour beside the rating star, the reviews muted', () => {
		render(MetaRow, { props: { items, size: 'xs' } });
		const online = screen.getByTestId('online');
		expect(online.querySelector('[data-icon="videocam-outline"]')).toHaveClass('text-primary');
		expect(screen.getByText('Διαδικτυακή επίσκεψη')).toHaveClass(
			'text-body-sm',
			'text-muted-foreground',
			'line-clamp-1'
		);
		const rating = screen.getByTestId('rating');
		expect(rating).toHaveClass('font-semibold', 'text-label-lg', 'text-primary-text');
		expect(rating.parentElement?.querySelector('[data-icon="star"]')).toHaveClass('text-rating');
		const reviews = screen.getByText('132');
		expect(reviews).toHaveClass('text-label-lg', 'text-muted-foreground');
		expect(reviews).not.toHaveClass('font-semibold');
		expect(
			reviews.parentElement?.querySelector('[data-icon="chatbubble-ellipses-outline"]')
		).toHaveClass('text-muted-foreground');
	});

	it('U-03.1 (K3.7): the row’s size applies where a fact names none (list: 15), a fact’s own wins (online 16)', () => {
		render(MetaRow, {
			props: { items: [{ ...items[0], size: 'lg', tone: 'foreground' }, items[1]], size: 'md' }
		});
		expect(screen.getByText('Διαδικτυακή επίσκεψη')).toHaveClass('text-body-lg', 'text-foreground');
		expect(screen.getByTestId('rating')).toHaveClass('text-body-md');
	});

	it('U-05.3: «★ score» has ONE size map — a MetaRow fact and the inline Rating draw the same size class', () => {
		for (const size of ['xs', 'sm', 'md', 'lg'] as MetaLineSize[]) {
			const row = render(MetaRow, { props: { items: [items[1]], size } });
			const fact = row.getByTestId('rating');
			row.unmount();
			const rating = render(Rating, { props: { variant: 'inline', label: '4,9', size } });
			const label = rating.getByText('4,9');
			expect(fact.className).toContain(metaLineSizes[size]);
			expect(label.className).toContain(metaLineSizes[size]);
			rating.unmount();
		}
	});

	it('U-03.1 (K3.7, a11y): the glyphs are decorative, so only the words are read', () => {
		const { container } = render(MetaRow, { props: { items } });
		for (const glyph of container.querySelectorAll('[data-slot="ionicon"]'))
			expect(glyph).toHaveAttribute('aria-hidden', 'true');
		expect(container.querySelector('[role="img"]')).toBeNull();
	});
});
