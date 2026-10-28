import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import MediaCard from '$shared/ui/organisms/media-card/media-card.svelte';
import { samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';
import SkeletonCard from './skeleton-card.svelte';
import { cardSizeOf } from './index';

// U-12.1: the skeleton breathes whatever the motion setting (R2's `motion-reduce:animate-none` is gone).
const ATOM = ['animate-skeleton', 'overflow-hidden', 'bg-muted/95'];
const sorted = (element: Element) => [...element.classList].sort();
const lines = (classes: string[]) => classes.map((line) => [...ATOM, ...line.split(' ')].sort());
const linesOf = (root: Element) =>
	[...root.querySelectorAll(':scope > [data-slot="skeleton"]')].map(sorted);

describe('SkeletonCard', () => {
	it('D13: ONE size map for the card and its placeholder — the rail cell and the list row, a step larger from the tablet', () => {
		expect(cardSizeOf('carousel')).toEqual({
			mediaClass: 'h-card-rail-media tablet:h-card-rail-media-lg',
			widthClass: 'w-card-rail-w tablet:w-card-rail-w-lg'
		});
		expect(cardSizeOf('list')).toEqual({
			mediaClass: 'h-card-list-media tablet:h-card-list-media-lg',
			widthClass: 'w-full'
		});
	});

	it.each(['carousel', 'list'] as const)(
		'U-03.1 (zones): the %s placeholder is the card’s size at every zone, by CSS alone, named by the caller',
		(layout) => {
			render(SkeletonCard, { props: { layout, testId: 'card' } });
			const card = screen.getByTestId('card');
			const { mediaClass, widthClass } = cardSizeOf(layout);
			// `shrink-0`: in a row it keeps its width, as a React Native view does.
			expect(sorted(card)).toEqual(
				['flex', 'shrink-0', 'flex-col', 'gap-2.5', ...widthClass.split(' ')].sort()
			);
			expect(sorted(card.children[0])).toEqual(
				[...ATOM, 'w-full', 'rounded-xl', ...mediaClass.split(' ')].sort()
			);
			expect(card.innerHTML).toMatch(/\btablet:h-card-(rail|list)-media-lg\b/);
			expect(card.innerHTML).not.toMatch(/\b(split|laptop|desktop|wide):/);
		}
	);

	it('D13: a media card drawn from the same map has exactly the placeholder’s width and photo height', () => {
		for (const layout of ['carousel', 'list'] as const) {
			const { mediaClass, widthClass } = cardSizeOf(layout);
			const placeholder = render(SkeletonCard, { props: { layout } }).container;
			const card = render(MediaCard, {
				props: { imageUrl: samplePhotos[0], imageClass: mediaClass, class: widthClass }
			}).container;
			const root = card.querySelector('[data-slot="media-card"]') as HTMLElement;
			const photo = card.querySelector('[data-slot="media-card-image"]') as HTMLElement;
			const skeleton = placeholder.querySelector('[data-slot="skeleton-card"]') as HTMLElement;
			for (const name of widthClass.split(' ')) {
				expect(root).toHaveClass(name);
				expect(skeleton).toHaveClass(name);
			}
			for (const name of mediaClass.split(' ')) {
				expect(photo).toHaveClass(name);
				expect(skeleton.children[0]).toHaveClass(name);
			}
			expect(photo).toHaveClass('w-full', 'rounded-xl');
		}
	});

	it('U-02.2: draws the card as the search skeletons did — the photo, four lines, the wrapping row of three facts', () => {
		render(SkeletonCard, { props: { testId: 'card' } });
		const card = screen.getByTestId('card');
		const column = card.children[1];
		expect(column).toHaveAttribute('data-slot', 'skeleton-lines');
		expect(sorted(column)).toEqual(['flex', 'flex-col', 'gap-2'].sort());
		expect(linesOf(column)).toEqual(
			lines([
				'h-6 w-4/5 rounded-full',
				'h-5 w-3/5 rounded-full',
				'h-4 w-2/3 rounded-full',
				'h-4 w-1/2 rounded-full'
			])
		);
		const facts = column.lastElementChild as HTMLElement;
		expect(sorted(facts)).toEqual(
			['flex', 'flex-row', 'flex-wrap', 'items-center', 'gap-3', 'pt-1'].sort()
		);
		expect(linesOf(facts)).toEqual(
			lines(['h-4 w-1/3 rounded-full', 'h-4 w-1/5 rounded-full', 'h-4 w-1/5 rounded-full'])
		);
	});

	it('U-03.1 (a11y, light/dark), U-12.1: decorative, announcing nothing, theme tokens only, breathing whatever the motion setting', () => {
		const { container } = render(SkeletonCard);
		const card = container.querySelector('[data-slot="skeleton-card"]') as HTMLElement;
		expect(card).toHaveAttribute('aria-hidden', 'true');
		expect(card).not.toHaveAttribute('aria-busy');
		expect(card).toHaveTextContent(/^$/);
		expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
		const shapes = container.querySelectorAll('[data-slot="skeleton"]');
		expect(shapes).toHaveLength(8);
		for (const shape of shapes) {
			expect(shape).toHaveClass('animate-skeleton');
			expect(shape).not.toHaveClass('motion-reduce:animate-none');
		}
	});
});
