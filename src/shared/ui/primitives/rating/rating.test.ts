import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Rating from './rating.svelte';

const stars = (root: Element) => [...root.querySelectorAll('[data-icon="star"]')];

describe('Rating', () => {
	it('U-03.1 (K3.3, M-05 α): inline — one 16 star in the rating colour and the score semibold in the primary text colour', () => {
		const { container } = render(Rating, {
			props: { variant: 'inline', label: '4,9', size: 'xs' }
		});
		const root = container.querySelector('[data-slot="rating"]') as HTMLElement;
		expect(root).toHaveClass('inline-flex', 'flex-row', 'items-center', 'gap-1.5');
		expect(stars(root)).toHaveLength(1);
		expect(stars(root)[0]).toHaveClass('icon-sm', 'text-rating');
		expect(screen.getByText('4,9')).toHaveClass(
			'font-semibold',
			'text-label-lg',
			'text-primary-text'
		);
	});

	it('U-03.1 (K3.3): the inline sizes are the meta line’s (13 · 14 · 15 · 16) and the tone may be the text colour', () => {
		const sizes = {
			xs: 'text-label-lg',
			sm: 'text-body-sm',
			md: 'text-body-md',
			lg: 'text-body-lg'
		};
		for (const [size, role] of Object.entries(sizes)) {
			const view = render(Rating, {
				props: { variant: 'inline', label: size, size: size as keyof typeof sizes }
			});
			expect(view.getByText(size)).toHaveClass(role);
			view.unmount();
		}
		render(Rating, { props: { variant: 'inline', label: '4.9', labelTone: 'foreground' } });
		expect(screen.getByText('4.9')).toHaveClass('text-foreground', 'text-body-md');
		expect(screen.getByText('4.9')).not.toHaveClass('text-primary-text');
	});

	it('U-02.1 (S-31.1 at the caller): the word for a score nobody gave yet («Νέο») passes through untouched', () => {
		render(Rating, { props: { variant: 'inline', label: 'Νέο' } });
		expect(screen.getByText('Νέο')).toBeInTheDocument();
	});

	it('U-03.1 (K3.3, M-05 β): stat — the score 16 semibold over five filled 12 stars, 1 apart', () => {
		const { container } = render(Rating, { props: { variant: 'stat', label: '4,9' } });
		const root = container.querySelector('[data-slot="rating"]') as HTMLElement;
		expect(root).toHaveClass('flex-col', 'items-center', 'justify-center', 'gap-1.5', 'py-1');
		expect(screen.getByText('4,9')).toHaveClass('text-body-lg', 'font-semibold', 'text-foreground');
		expect(root.querySelector('.gap-px')).not.toBeNull();
		expect(stars(root)).toHaveLength(5);
		for (const star of stars(root)) expect(star).toHaveClass('icon-xs', 'text-rating');
	});

	it('U-03.1 (K3.3, M-05 γ): value — the score 19 bold and one 16 star, 4 apart', () => {
		const { container } = render(Rating, { props: { variant: 'value', label: '4,9' } });
		const root = container.querySelector('[data-slot="rating"]') as HTMLElement;
		expect(root).toHaveClass('flex-row', 'items-center', 'gap-1');
		expect(screen.getByText('4,9')).toHaveClass('text-title-md', 'font-bold', 'text-foreground');
		expect(stars(root)).toHaveLength(1);
		expect(stars(root)[0]).toHaveClass('icon-sm', 'text-rating');
	});

	it('U-03.1 (K3.3, M-05 δ): stars — the first `value` filled, the rest faint muted at 24 %', () => {
		const { container } = render(Rating, { props: { variant: 'stars', value: 3 } });
		const all = stars(container);
		expect(all).toHaveLength(5);
		expect(all.filter((star) => star.classList.contains('text-rating'))).toHaveLength(3);
		expect(all.slice(3).every((star) => star.classList.contains('text-muted-foreground/24'))).toBe(
			true
		);
		expect(all.every((star) => star.classList.contains('icon-sm'))).toBe(true);
	});

	it('U-03.1 (K3.3): `max` sets how many stars; a value of 0 fills none and nothing breaks', () => {
		const { container } = render(Rating, { props: { variant: 'stars', value: 0, max: 3 } });
		expect(stars(container)).toHaveLength(3);
		expect(container.querySelector('.text-rating')).toBeNull();
	});

	it('U-03.1 (K3.3, a11y): with the caller’s name it is ONE image («4,9 στα 5»); without it the stars are hidden', () => {
		render(Rating, { props: { variant: 'stat', label: '4,9', 'aria-label': '4,9 στα 5' } });
		expect(screen.getByRole('img', { name: '4,9 στα 5' })).toBeInTheDocument();
		const plain = render(Rating, { props: { variant: 'value', label: '3,7' } });
		const root = plain.container.querySelector('[data-slot="rating"]') as HTMLElement;
		expect(root).not.toHaveAttribute('role');
		expect(stars(root).every((star) => star.getAttribute('aria-hidden') === 'true')).toBe(true);
		expect(root).toHaveTextContent('3,7');
	});
});
