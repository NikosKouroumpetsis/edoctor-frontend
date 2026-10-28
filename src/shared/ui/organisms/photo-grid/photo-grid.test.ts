import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import PhotoGrid from './photo-grid.svelte';
import type { PhotoGridProps } from './index';

const PHOTOS = Array.from({ length: 6 }, (_, index) => ({
	uri: `https://cdn.example.test/photo-${index + 1}.jpg`,
	ariaLabel: `Φωτογραφία ${index + 1} από 6`
}));
const cells = () => [...document.querySelectorAll<HTMLElement>('[data-slot="photo-grid-cell"]')];

describe('PhotoGrid', () => {
	it('U-05.7 (Airbnb 1+4): one large photo over two columns and rows, four small ones, 8 apart, corners only outside', () => {
		render(PhotoGrid, { props: { photos: PHOTOS, testId: 'photos' } });
		const frame = screen
			.getByTestId('photos')
			.querySelector<HTMLElement>('[data-slot="photo-grid-frame"]');
		expect(frame).toHaveClass(
			'grid',
			'aspect-2/1',
			'grid-cols-4',
			'grid-rows-2',
			'gap-2',
			'overflow-hidden',
			'rounded-xl'
		);
		expect(cells()).toHaveLength(5);
		expect(cells()[0]).toHaveClass('col-span-2', 'row-span-2');
		for (const cell of cells().slice(1)) {
			expect(cell).not.toHaveClass('col-span-2');
			expect(cell.className).not.toMatch(/rounded/);
		}
		expect(cells()[0].className).not.toMatch(/rounded/);
		expect(screen.queryByTestId('photos-photo-5')).toBeNull();
	});

	it('U-05.7 (zones): from 744 only — below it the CollapsingHero of the application', () => {
		render(PhotoGrid, { props: { photos: PHOTOS, testId: 'photos' } });
		expect(screen.getByTestId('photos')).toHaveClass('relative', 'hidden', 'tablet:block');
	});

	it('U-03.1 (a11y): each photo named by the caller; the large one loads first, the small ones lazily', () => {
		render(PhotoGrid, { props: { photos: PHOTOS, testId: 'photos' } });
		expect(screen.getByRole('img', { name: 'Φωτογραφία 1 από 6' })).toHaveAttribute(
			'loading',
			'eager'
		);
		for (const index of [1, 2, 3, 4])
			expect(screen.getByTestId(`photos-photo-${index}`)).toHaveAttribute('loading', 'lazy');
		expect(screen.getByTestId('photos-photo-0')).toHaveClass(
			'block',
			'size-full',
			'bg-muted',
			'object-cover'
		);
	});

	it('S-32.8 / S-32.13 (negative): a missing or failed photo leaves the silhouette in its slot', async () => {
		render(PhotoGrid, { props: { photos: PHOTOS.slice(0, 3), testId: 'photos' } });
		expect(screen.getByTestId('photos-placeholder-3')).toHaveAttribute(
			'data-slot',
			'media-placeholder'
		);
		expect(screen.getByTestId('photos-placeholder-4')).toHaveClass('size-full');
		await fireEvent.error(screen.getByTestId('photos-photo-1'));
		expect(screen.queryByTestId('photos-photo-1')).toBeNull();
		expect(screen.getByTestId('photos-placeholder-1')).toBeInTheDocument();
		expect(screen.getByTestId('photos-photo-0')).toBeInTheDocument();
	});

	it('S-32.8 / S-32.13 (negative): no photo, or none that loads, is ONE silhouette without the button', async () => {
		const showAll = { label: 'Εμφάνιση όλων των φωτογραφιών', onclick: () => {} };
		const view = render(PhotoGrid, { props: { photos: [], showAll, testId: 'photos' } });
		expect(screen.getByTestId('photos')).toHaveAttribute('data-state', 'no-photo');
		expect(screen.getByTestId('photos')).toHaveClass('hidden', 'tablet:block');
		expect(
			screen.getByTestId('photos').querySelector('[data-slot="media-placeholder"]')
		).toHaveClass('aspect-2/1', 'rounded-xl');
		expect(screen.queryByRole('button')).toBeNull();
		view.unmount();
		render(PhotoGrid, { props: { photos: PHOTOS.slice(0, 2), showAll, testId: 'photos' } });
		await fireEvent.error(screen.getByTestId('photos-photo-0'));
		await fireEvent.error(screen.getByTestId('photos-photo-1'));
		expect(screen.getByTestId('photos')).toHaveAttribute('data-state', 'no-photo');
		expect(screen.queryByRole('button')).toBeNull();
	});

	it('U-05.7: «show all photos» in the caller’s words — the outline button on the card surface, bottom right', async () => {
		const user = userEvent.setup({ delay: null });
		const onclick = vi.fn();
		const view = render(PhotoGrid, {
			props: {
				photos: PHOTOS,
				showAll: { label: 'Εμφάνιση όλων των φωτογραφιών', onclick },
				testId: 'photos'
			}
		});
		const button = screen.getByRole('button', { name: 'Εμφάνιση όλων των φωτογραφιών' });
		expect(button).toBe(screen.getByTestId('photos-show-all'));
		expect(button).toHaveClass(
			'absolute',
			'right-6',
			'bottom-6',
			'bg-card',
			'border',
			'border-foreground',
			'rounded-sm',
			'min-h-control-md'
		);
		expect(button.querySelector('[data-icon="apps-outline"]')).toHaveClass('icon-sm');
		await user.click(button);
		expect(onclick).toHaveBeenCalledOnce();
		view.unmount();
		render(PhotoGrid, {
			props: { photos: PHOTOS, showAll: { label: 'Όλες οι φωτογραφίες', href: '/el/photos' } }
		});
		expect(screen.getByRole('link', { name: 'Όλες οι φωτογραφίες' })).toHaveAttribute(
			'href',
			'/el/photos'
		);
	});

	it('U-05.7 (a11y): a press on a photo opens it as a pointer-only twin; the keyboard’s way is the button', async () => {
		const user = userEvent.setup({ delay: null });
		const onOpen = vi.fn();
		render(PhotoGrid, {
			props: {
				photos: PHOTOS,
				onOpen,
				showAll: { label: 'Όλες οι φωτογραφίες', onclick: () => {} },
				testId: 'photos'
			}
		});
		const twins = [...document.querySelectorAll<HTMLElement>('[data-slot="photo-grid-open"]')];
		expect(twins).toHaveLength(5);
		for (const twin of twins) {
			expect(twin).toHaveAttribute('tabindex', '-1');
			expect(twin).toHaveAttribute('aria-hidden', 'true');
		}
		await user.click(twins[2]);
		expect(onOpen).toHaveBeenCalledWith(2);
		expect(screen.getAllByRole('button')).toHaveLength(1);
		await user.tab();
		expect(screen.getByRole('button', { name: 'Όλες οι φωτογραφίες' })).toHaveFocus();
	});

	it('U-05.7 (NIT-2, negative): a press on a photo comes only with the button, the keyboard’s way in', () => {
		const grids: PhotoGridProps[] = [
			{ photos: PHOTOS },
			{ photos: PHOTOS, showAll: { label: 'Όλες', onclick: () => {} } },
			{ photos: PHOTOS, onOpen: () => {}, showAll: { label: 'Όλες', href: '/el/photos' } },
			// @ts-expect-error photos that open by pointer only, with no keyboard way in (WCAG 2.1.1)
			{ photos: PHOTOS, onOpen: () => {} }
		];
		expect(grids).toHaveLength(4);
	});

	it('U-03.1 (light/dark): only theme tokens', () => {
		const { container } = render(PhotoGrid, {
			props: { photos: PHOTOS, showAll: { label: 'Όλες', onclick: () => {} } }
		});
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});
});
