import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import MediaGallery from './media-gallery.svelte';
import { MEDIA_GALLERY_PREVIEWS } from './index';

// The gallery keeps the addresses it showed for the whole session (module scope, U-14.6): every test takes its own.
let batch = 0;
function photos(count: number) {
	batch += 1;
	return Array.from({ length: count }, (_, index) => `data:image/png;base64,${batch}-${index}`);
}
const base = {
	photoHref: (index: number) => `/doctors/x/details/photos?photo=${index + 1}`,
	photoLabel: (index: number, total: number) => `Φωτογραφία ${index + 1} από ${total}`,
	moreHref: '/doctors/x/details/photos',
	moreLabel: 'Όλες οι φωτογραφίες',
	testId: 'gallery'
};

describe('MediaGallery', () => {
	it('U-41.1 (app = web): ONE square inside the margins on the phone, from 744 the 56 thumbnails’ column beside the square held between 260 and 360', () => {
		render(MediaGallery, { props: { ...base, images: photos(3) } });
		expect(screen.getByTestId('gallery')).toHaveClass('flex', 'flex-col', 'tablet:flex-row');
		expect(screen.getByTestId('gallery-main')).toHaveClass(
			'aspect-square',
			'w-full',
			'rounded-lg',
			'tablet:w-gallery-fluid'
		);
		expect(screen.getByTestId('gallery-thumbs')).toHaveClass(
			'hidden',
			'tablet:flex',
			'flex-col',
			'gap-3'
		);
		expect(screen.getByTestId('gallery-thumb-0')).toHaveClass('size-gallery-thumb', 'rounded-sm');
		expect(screen.getByTestId('gallery-track')).toHaveClass(
			'snap-x',
			'snap-mandatory',
			'overflow-x-auto',
			'scroll-smooth',
			'scrollbar-none'
		);
		const css = readFileSync(join(process.cwd(), 'src/routes/layout.css'), 'utf8');
		expect(css).toMatch(
			/@utility w-gallery-fluid \{\s*width: clamp\(var\(--spacing-gallery-main\), 26vw, var\(--spacing-gallery-main-lg\)\);/u
		);
	});

	it('U-41.1 (app = web): at most five thumbnails (the application’s `MEDIA_GALLERY_PREVIEWS`), the fifth «+N» opening every photo when there are more', () => {
		const onOpenAll = vi.fn((event: MouseEvent) => event.preventDefault());
		render(MediaGallery, { props: { ...base, images: photos(7), onOpenAll } });
		expect(MEDIA_GALLERY_PREVIEWS).toBe(5);
		expect(screen.getByTestId('gallery-thumbs').querySelectorAll('button')).toHaveLength(4);
		const more = screen.getByTestId('gallery-more');
		expect(more).toHaveAttribute('href', '/doctors/x/details/photos');
		expect(more).toHaveAccessibleName('Όλες οι φωτογραφίες');
		expect(more).toHaveTextContent('+3');
		more.click();
		expect(onOpenAll).toHaveBeenCalledTimes(1);
	});

	it('U-41.1 (app = web): with five photos or fewer every one is a thumbnail — no «+N»', () => {
		render(MediaGallery, { props: { ...base, images: photos(5) } });
		expect(screen.getByTestId('gallery-thumb-4')).toBeInTheDocument();
		expect(screen.queryByTestId('gallery-more')).toBeNull();
	});

	it('U-41.1 (app = web): a thumbnail shows its photo in the square and is ringed; the counter follows the swipe', async () => {
		const scrollTo = vi.fn();
		render(MediaGallery, { props: { ...base, images: photos(4) } });
		const track = screen.getByTestId('gallery-track');
		Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
		Object.defineProperty(track, 'scrollTo', { configurable: true, value: scrollTo });
		expect(screen.getByTestId('gallery-counter')).toHaveTextContent('1 / 4');
		await fireEvent.click(screen.getByTestId('gallery-thumb-2'));
		expect(scrollTo).toHaveBeenCalledWith({ left: 600 });
		expect(screen.getByTestId('gallery-thumb-2')).toHaveAttribute('aria-pressed', 'true');
		expect(screen.getByTestId('gallery-thumb-2')).toHaveClass('border-2', 'border-foreground');
		Object.defineProperty(track, 'scrollLeft', { configurable: true, value: 300 });
		await fireEvent.scroll(track);
		expect(screen.getByTestId('gallery-counter')).toHaveTextContent('2 / 4');
		expect(screen.getByTestId('gallery-thumb-1')).toHaveAttribute('aria-pressed', 'true');
	});

	it('U-41.1 (app = web): a photo’s press is a link to its viewer, named by the caller; the page may open it in place', () => {
		const onOpenPhoto = vi.fn((_index: number, event: MouseEvent) => event.preventDefault());
		render(MediaGallery, { props: { ...base, images: photos(2), onOpenPhoto } });
		const second = screen.getByTestId('gallery-slide-1');
		expect(second.tagName).toBe('A');
		expect(second).toHaveAttribute('href', '/doctors/x/details/photos?photo=2');
		expect(second).toHaveAccessibleName('Φωτογραφία 2 από 2');
		second.click();
		expect(onOpenPhoto).toHaveBeenCalledWith(1, expect.any(MouseEvent));
	});

	it('U-41.1 (app = web): without an address a photo is a button that opens it by its place', async () => {
		const onOpenPhoto = vi.fn();
		render(MediaGallery, {
			props: { ...base, photoHref: undefined, images: photos(2), onOpenPhoto }
		});
		const first = screen.getByTestId('gallery-slide-0');
		expect(first.tagName).toBe('BUTTON');
		expect(first).toHaveAccessibleName('Φωτογραφία 1 από 2');
		await fireEvent.click(first);
		expect(onOpenPhoto).toHaveBeenCalledWith(0, expect.any(MouseEvent));
	});

	it('S-32.8 / S-32.13 (app = web): no photo, or a first one that does not load, is the silhouette in the square — no counter, no thumbnails', async () => {
		const empty = render(MediaGallery, { props: { ...base, images: [] } });
		expect(screen.getByTestId('gallery-placeholder')).toBeInTheDocument();
		expect(screen.queryByTestId('gallery-counter')).toBeNull();
		expect(screen.queryByTestId('gallery-thumbs')).toBeNull();
		empty.unmount();
		render(MediaGallery, { props: { ...base, images: photos(2) } });
		const cover = screen.getByTestId('gallery-slide-0').querySelector('img') as HTMLImageElement;
		await fireEvent.error(cover);
		expect(screen.getByTestId('gallery-placeholder')).toBeInTheDocument();
		expect(screen.queryByTestId('gallery-counter')).toBeNull();
	});

	it('U-14 / U-12 (app = web): the gallery’s photo mounted in the browser lights up at its load (the kit’s `RevealingPhoto`); shown again, at once', async () => {
		const list = photos(1);
		const first = render(MediaGallery, { props: { ...base, images: list } });
		const reveal = () =>
			screen.getByTestId('gallery-slide-0').querySelector('[data-slot="revealing-photo"]');
		expect(reveal()).toHaveAttribute('data-phase', 'waiting');
		expect(reveal()).toHaveClass('opacity-0');
		await fireEvent.load(reveal()?.querySelector('img') as HTMLImageElement);
		expect(reveal()).toHaveAttribute('data-phase', 'arriving');
		expect(reveal()).toHaveClass('animate-reveal');
		expect(reveal()).not.toHaveClass('opacity-0');
		first.unmount();
		render(MediaGallery, { props: { ...base, images: list } });
		expect(reveal()).toHaveAttribute('data-phase', 'shown');
		expect(reveal()?.className).not.toMatch(/opacity-0|animate-reveal/u);
	});

	it('U-14.5: while the page’s data comes, the square breathes — no photo, no counter', () => {
		render(MediaGallery, { props: { ...base, images: photos(3), loading: true } });
		expect(screen.getByTestId('gallery-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('gallery-track')).toBeNull();
		expect(screen.queryByTestId('gallery-counter')).toBeNull();
	});
});
