import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRawSnippet } from 'svelte';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import MediaCard from './media-card.svelte';
import Card from './media-card.harness.svelte';
import { brokenPhoto, sampleDoctors, samplePhotos } from './media-card.sample';

const words = createRawSnippet(() => ({ render: () => '<p>Μαρία Αλεξίου</p>' }));
const cardOf = () => screen.getByTestId('card');
const [maria, nikos, eleni] = sampleDoctors.el;

describe('MediaCard', () => {
	afterEach(() => vi.restoreAllMocks());

	it('U-03.1 (K3.1): plain — the photo on top (rounded xl, muted while it loads, lazily), the words 10 below', () => {
		const { container } = render(MediaCard, {
			props: {
				imageUrl: samplePhotos[0],
				imageClass: 'h-card-rail-media tablet:h-card-rail-media-lg',
				class: 'w-card-rail-w',
				children: words
			}
		});
		const card = container.querySelector('[data-slot="media-card"]') as HTMLElement;
		expect(card).toHaveClass('relative', 'flex', 'flex-col', 'gap-2.5', 'w-card-rail-w');
		expect(card).not.toHaveClass('bg-card', 'shadow-raised', 'p-3');
		const image = container.querySelector('[data-slot="media-card-image"]') as HTMLImageElement;
		expect(image).toHaveClass(
			'block',
			'w-full',
			'rounded-xl',
			'bg-muted',
			'object-cover',
			'h-card-rail-media',
			'tablet:h-card-rail-media-lg'
		);
		expect(image).toHaveAttribute('loading', 'lazy');
		expect(image).toHaveAttribute('alt', '');
		expect(screen.getByText('Μαρία Αλεξίου')).toBeInTheDocument();
		expect(screen.queryByRole('link')).toBeNull();
	});

	it('U-03.1 (K3.1, M-31α): framed — the raised card with the 12 inset (the article card)', () => {
		const { container } = render(MediaCard, {
			props: { imageUrl: samplePhotos[0], variant: 'framed' }
		});
		expect(container.querySelector('[data-slot="media-card"]')).toHaveClass(
			'rounded-xl',
			'bg-card',
			'p-3',
			'shadow-raised'
		);
	});

	it('S-32.8: without a photo the frame draws the no-photo silhouette in the border colour, at the photo’s size', () => {
		const { container } = render(MediaCard, {
			props: { imageUrl: null, imageClass: 'h-card-rail-media' }
		});
		const silhouette = container.querySelector('[data-slot="media-placeholder"]') as HTMLElement;
		expect(silhouette).toHaveClass('w-full', 'rounded-xl', 'h-card-rail-media', 'bg-muted');
		expect(silhouette.querySelector('svg')).toHaveClass('fill-border');
		expect(container.querySelector('img')).toBeNull();
	});

	it('S-32.13: a photo that does not load draws the same silhouette', async () => {
		const { container } = render(MediaCard, {
			props: { imageUrl: brokenPhoto, imageClass: 'h-card-rail-media' }
		});
		await fireEvent.error(container.querySelector('img') as HTMLImageElement);
		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('[data-slot="media-placeholder"]')).toHaveClass(
			'h-card-rail-media'
		);
	});

	it('U-03.1 (K3.1): `eager` for a first row; the 4:3 option takes the ratio instead of a height (Α9, not a default)', () => {
		const { container } = render(MediaCard, {
			props: { imageUrl: samplePhotos[0], loading: 'eager', aspect: '4/3' }
		});
		const image = container.querySelector('img') as HTMLImageElement;
		expect(image).toHaveAttribute('loading', 'eager');
		expect(image).toHaveClass('aspect-4/3', 'h-auto');
		const plain = render(MediaCard, { props: { imageUrl: samplePhotos[0] } });
		expect(plain.container.querySelector('img')).not.toHaveClass('aspect-4/3');
	});

	it('U-03.1 (K3.1, Airbnb): the whole card is ONE link named by the caller; its layers let a press through to it', () => {
		const { container } = render(MediaCard, {
			props: {
				href: '#maria',
				linkLabel: 'Μαρία Αλεξίου, Καρδιολόγος',
				imageUrl: samplePhotos[0],
				children: words
			}
		});
		const links = screen.getAllByRole('link');
		expect(links).toHaveLength(1);
		expect(links[0]).toHaveAccessibleName('Μαρία Αλεξίου, Καρδιολόγος');
		expect(links[0]).toHaveAttribute('href', '#maria');
		expect(links[0]).toHaveClass('absolute', 'inset-0', 'rounded-xl', 'focus-visible:ring-3');
		for (const slot of ['media-card-media', 'media-card-content'])
			expect(container.querySelector(`[data-slot="${slot}"]`)).toHaveClass(
				'pointer-events-none',
				'[&_a]:pointer-events-auto',
				'[&_button]:pointer-events-auto'
			);
	});

	it('U-03.1 (K3.1): the doctor card — badge, heart OUTSIDE the link (a sibling layer), its press toggles and never opens', async () => {
		const user = userEvent.setup({ delay: null });
		const onFavorite = vi.fn();
		render(Card, { props: { doctor: maria, onFavorite } });
		const link = within(cardOf()).getByRole('link', { name: maria.profileLabel });
		const heart = within(cardOf()).getByRole('button', { name: maria.favoriteLabel });
		expect(link.contains(heart)).toBe(false);
		expect(heart.closest('a')).toBeNull();
		expect(heart).toHaveAttribute('aria-pressed', 'false');
		expect(heart).toHaveClass('top-1.5', 'right-1.5');
		await user.click(heart);
		expect(onFavorite).toHaveBeenCalledWith(true);
		expect(heart).toHaveAttribute('aria-pressed', 'true');
		expect(within(cardOf()).getByText(maria.badge as string)).toHaveClass('line-clamp-2');
		// U-06.3 turns the fixed `w-badge-w` this line pinned into a minimum that grows up to the heart's touch box
		// (the application's doctor card passes `besideAction`).
		expect(cardOf().querySelector('[data-slot="media-badge"]')).toHaveClass(
			'min-w-badge-w',
			'right-touch'
		);
		expect(within(cardOf()).getAllByRole('link')).toHaveLength(1);
	});

	it('S-31.4: the guest’s «Συνδεθείτε για κόστος» is its own button outside the card link', async () => {
		const user = userEvent.setup({ delay: null });
		const onSignIn = vi.fn();
		render(Card, { props: { doctor: nikos, onSignIn } });
		const signIn = within(cardOf()).getByRole('button', { name: 'Συνδεθείτε για κόστος' });
		expect(signIn.closest('a')).toBeNull();
		expect(signIn).toHaveClass('min-h-touch', 'min-w-touch');
		await user.click(signIn);
		expect(onSignIn).toHaveBeenCalledOnce();
	});

	it('S-32.19, S-31.5: the rail card’s words wear the application’s colours (name, specialty, place in the text colour; availability primary; «Από» and online muted)', () => {
		render(Card, { props: { doctor: maria } });
		expect(screen.getByTestId('card-name')).toHaveClass(
			'text-body-lg',
			'font-semibold',
			'text-foreground',
			'line-clamp-1'
		);
		expect(screen.getByTestId('card-specialty')).toHaveClass('text-body-md', 'text-foreground');
		expect(screen.getByTestId('card-place')).toHaveClass('text-label-lg', 'text-foreground');
		expect(screen.getByTestId('card-availability')).toHaveClass(
			'text-label-lg',
			'font-semibold',
			'text-primary-text'
		);
		expect(screen.getByTestId('card-fee')).toHaveClass('text-body-sm', 'text-muted-foreground');
		expect(screen.getByText(maria.online as string)).toHaveClass(
			'text-body-sm',
			'text-muted-foreground'
		);
		expect(screen.getByTestId('card-rating')).toHaveClass(
			'text-label-lg',
			'font-semibold',
			'text-primary-text'
		);
		expect(screen.getByTestId('card-review-count')).toHaveTextContent('132');
	});

	it('U-02.1 (S-31.1, S-31.2 at the caller): the words pass through untouched — «★ Νέο» without a count, «4.9», «From €40»', () => {
		const greek = render(Card, { props: { doctor: nikos } });
		expect(greek.getByTestId('card-rating')).toHaveTextContent('Νέο');
		expect(greek.queryByTestId('card-review-count')).toBeNull();
		greek.unmount();
		render(Card, { props: { locale: 'en' } });
		expect(screen.getByTestId('card-rating')).toHaveTextContent('4.9');
		expect(screen.getByTestId('card-fee')).toHaveTextContent('From €40');
	});

	it('U-03.1 (K3.1, M-01): the results card — the gallery with dots, the mini map, the description, one size step up', () => {
		render(Card, { props: { doctor: maria, variant: 'list' } });
		const card = cardOf();
		expect(card).toHaveClass('w-full');
		expect(within(card).getByTestId('card-gallery')).toBeInTheDocument();
		expect(card.querySelector('[data-slot="media-card-image"]')).toBeNull();
		expect(card.querySelector('[data-slot="photo-carousel-dots"]')).not.toBeNull();
		expect(card.querySelector('[data-slot="map-thumbnail"]')).toHaveClass('right-3', 'bottom-3');
		expect(screen.getByTestId('card-name')).toHaveClass('text-title-lg', 'tablet:text-heading-sm');
		expect(screen.getByTestId('card-specialty')).toHaveClass('text-title-xs');
		expect(screen.getByTestId('card-description')).toHaveClass(
			'line-clamp-2',
			'text-body-md',
			'text-muted-foreground'
		);
		expect(screen.getByTestId('card-place')).toHaveTextContent('0,1 χλμ · Αθήνα');
		expect(screen.getByTestId('card-fee')).toHaveClass('text-body-lg', 'text-foreground');
		expect(screen.getByText(maria.online as string)).toHaveClass('text-body-lg', 'text-foreground');
		const heart = within(card).getByRole('button', { name: maria.favoriteLabel });
		expect(heart).toHaveClass('top-2.5', 'right-2.5');
		expect(heart.querySelector('[data-slot="ionicon"]')).toHaveClass('icon-lg');
		expect(within(card).getAllByRole('link')).toHaveLength(1);
	});

	it('S-32.8 (negative): a doctor without photos — the silhouette, no gallery, no dots, no «1 / N»', () => {
		render(Card, { props: { doctor: eleni, variant: 'list' } });
		const card = cardOf();
		expect(card.querySelector('[data-slot="media-placeholder"]')).not.toBeNull();
		expect(card.querySelector('[data-slot="photo-carousel"]')).toBeNull();
		expect(card.textContent).not.toMatch(/\d+ \/ \d+/);
	});

	it('U-03.1 (K3.1, M-31α): the article card — framed, the type badge on one line, «Διαβάστε» in its 48 row, one link', () => {
		render(Card, { props: { card: 'article' } });
		const card = cardOf();
		expect(card).toHaveAttribute('data-variant', 'framed');
		expect(card).toHaveClass('w-article-rail-w', 'tablet:w-article-rail-w-lg');
		expect(card.querySelector('[data-slot="media-card-image"]')).toHaveClass(
			'h-article-rail-media'
		);
		expect(card.querySelector('[data-slot="media-badge"]')).not.toHaveClass('w-badge-w');
		expect(screen.getByTestId('card-title')).toHaveClass(
			'text-body-sm',
			'leading-tight',
			'line-clamp-2'
		);
		expect(screen.getByTestId('card-read')).toHaveClass(
			'min-h-touch',
			'text-label-lg',
			'font-semibold',
			'underline'
		);
		expect(within(card).getAllByRole('link')).toHaveLength(1);
		expect(within(card).queryAllByRole('button')).toHaveLength(0);
	});
});
