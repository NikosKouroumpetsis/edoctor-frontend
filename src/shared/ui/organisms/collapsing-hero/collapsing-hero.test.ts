import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cubicBezierCss, motion } from '$shared/design/tokens';
import { leaveTimeout } from '$shared/lib/headless/motion';
import { tokensToCss } from '$shared/design/tokens/to-css';
import Skeleton from '$shared/ui/primitives/skeleton/skeleton.svelte';
import CollapsingHero from './collapsing-hero.svelte';

// U-14.5: the hero remembers the addresses it showed for the whole session (module scope, as the application's), so
// each test takes addresses no test has shown before.
let served = 0;
const freshPhoto = () => `https://cdn.example.test/hero-${(served += 1)}.jpg`;
let PHOTO = '';
let OTHER_PHOTO = '';
// U-14.1: the fade of a photo that arrives, in CSS on the motion tokens (jsdom runs no CSS: the classes are the proof).
const REVEAL = ['transition-opacity', 'duration-reveal', 'ease-standard'];

/** The browser holds the photo when its <img> mounts (its cache, or loaded before hydration): decoded, with a size. */
function decodedAtMount(naturalWidth = 400) {
	vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
	vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(naturalWidth);
}

describe('CollapsingHero', () => {
	beforeEach(() => {
		PHOTO = freshPhoto();
		OTHER_PHOTO = freshPhoto();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('U-02.2 (K5.5): a photo hero-h tall over the background, the application’s frame (M-20)', () => {
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		expect(screen.getByTestId('hero')).toHaveClass('relative', 'h-hero-h');
		const backdrop = screen.getByTestId('hero-backdrop');
		expect(backdrop).toHaveClass('pointer-events-none', 'absolute', 'inset-0', 'bg-background');
		expect(backdrop).toHaveAttribute('aria-hidden', 'true');
		const media = screen.getByTestId('hero-media');
		expect(media).toHaveAttribute('src', PHOTO);
		expect(media).toHaveAttribute('alt', '');
		expect(media).toHaveAttribute('loading', 'eager');
		expect(media).toHaveClass('absolute', 'inset-0', 'size-full', 'bg-muted', 'object-cover');
		// U-14.1: the photo sits in the node that lights it up (`-reveal`), as the application's.
		expect(media.parentElement).toBe(screen.getByTestId('hero-reveal'));
		expect(screen.queryByTestId('hero-placeholder')).toBeNull();
		expect(screen.queryByTestId('hero-skeleton')).toBeNull();
	});

	it('U-14.1: `imageLoading` is the <img>’s own `loading` (the former `loading` prop), `eager` unless the caller says `lazy`', () => {
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, imageLoading: 'lazy', testId: 'hero' }
		});
		expect(screen.getByTestId('hero-media')).toHaveAttribute('loading', 'lazy');
		expect(screen.queryByTestId('hero-skeleton')).toBeNull();
	});

	it('U-02.2 (S-32.7): the «1 / N» pill sits above the overlap on the secondary scrim at 75 %', () => {
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		const count = screen.getByTestId('hero-count');
		expect(count).toHaveTextContent('1 / 5');
		expect(count).toHaveClass(
			'absolute',
			'right-4',
			'bottom-hero-overlap',
			'mb-2',
			'rounded-full',
			'bg-secondary/75',
			'px-3',
			'py-1.5',
			'text-body-sm',
			'font-semibold',
			'text-secondary-foreground'
		);
	});

	it('U-02.2 (app NIT-2 of dyad 5): the pill’s offset comes from the height alone — 8 over hero-h, 4 over hero-h-lg, never a zone', () => {
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		expect(screen.getByTestId('hero-count')).toHaveClass('mb-2');
		expect(screen.getByTestId('hero-count')).not.toHaveClass('mb-1');
		view.unmount();
		render(CollapsingHero, {
			props: { height: 'hero-h-lg', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		const count = screen.getByTestId('hero-count');
		expect(count).toHaveClass('mb-1');
		expect(count).not.toHaveClass('mb-2');
		expect(count.className).not.toMatch(/\b(tablet|split|laptop|desktop|wide):/);
	});

	it('S-32.8 (negative): without a photo the silhouette fills the hero and no pill shows', () => {
		render(CollapsingHero, { props: { height: 'hero-h-lg', countLabel: '1 / 1', testId: 'hero' } });
		expect(screen.getByTestId('hero')).toHaveClass('h-hero-h-lg');
		expect(screen.queryByTestId('hero-media')).toBeNull();
		expect(screen.queryByTestId('hero-count')).toBeNull();
		const placeholder = screen.getByTestId('hero-placeholder');
		expect(placeholder).toHaveAttribute('data-slot', 'media-placeholder');
		expect(placeholder).toHaveClass('h-full');
		expect(placeholder.parentElement).toHaveClass('pointer-events-none', 'absolute', 'inset-0');
	});

	it('S-32.13 (negative): a photo that does not load turns into the same silhouette, and the pill goes', async () => {
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		await fireEvent.error(screen.getByTestId('hero-media'));
		expect(screen.queryByTestId('hero-media')).toBeNull();
		expect(screen.getByTestId('hero-placeholder')).toBeInTheDocument();
		expect(screen.queryByTestId('hero-count')).toBeNull();
	});

	it('U-05.7 (zones): below 744 only — from the tablet the PhotoGrid takes over — unless the caller keeps it', () => {
		const view = render(CollapsingHero, { props: { height: 'hero-h', testId: 'hero' } });
		expect(screen.getByTestId('hero')).toHaveClass('tablet:hidden');
		view.unmount();
		render(CollapsingHero, { props: { height: 'hero-h', hideFrom: 'none', testId: 'hero' } });
		expect(screen.getByTestId('hero').className).not.toMatch(/tablet:hidden/);
	});

	// U-14.1: as the application's, the page's style still moves the photo itself and the fill that waits for it; the
	// reveal node keeps no inline style, so the page never hides the fade (an inline `opacity` beats a class) and the
	// fade never undoes the page's (the two opacities multiply).
	it('U-03.1 / U-14.1: the page animates the photo, the fill that waits for it and the pill by the styles it hands in; only theme tokens (light/dark)', () => {
		const { container } = render(CollapsingHero, {
			props: {
				height: 'hero-h',
				imageUrl: PHOTO,
				countLabel: '1 / 5',
				imageStyle: 'opacity: 0.5',
				overlayStyle: 'opacity: 0.25',
				testId: 'hero'
			}
		});
		expect(screen.getByTestId('hero-media').style.opacity).toBe('0.5');
		expect(screen.getByTestId('hero-waiting').style.opacity).toBe('0.5');
		expect(screen.getByTestId('hero-reveal').getAttribute('style')).toBeNull();
		expect(screen.getByTestId('hero-count').style.opacity).toBe('0.25');
		expect(container.innerHTML).not.toMatch(/\bdark:|#[0-9a-f]{3,8}\b|bg-white|text-black/i);
	});

	it('U-14.1: `loading` ⇒ the kit’s breathing skeleton over the whole frame — no pill, no silhouette, no photo', async () => {
		const view = render(CollapsingHero, {
			props: {
				height: 'hero-h',
				imageUrl: PHOTO,
				countLabel: '1 / 6',
				loading: true,
				imageStyle: 'opacity: 0.5',
				testId: 'hero'
			}
		});
		const skeleton = screen.getByTestId('hero-skeleton');
		expect(skeleton).toHaveAttribute('data-slot', 'skeleton');
		expect(skeleton).toHaveAttribute('aria-hidden', 'true');
		// The kit's skeleton and its breathing, over the whole frame and square (U-14.5, its own test below).
		expect(skeleton).toHaveClass('animate-skeleton', 'bg-muted/95', 'size-full', 'rounded-none');
		expect(skeleton.parentElement).toHaveClass('pointer-events-none', 'absolute', 'inset-0');
		// The page's style moves the skeleton's frame as it moves the photo's (the breathing owns the skeleton's own).
		expect(skeleton.parentElement?.style.opacity).toBe('0.5');
		expect(screen.queryByTestId('hero-count')).toBeNull();
		expect(screen.queryByTestId('hero-placeholder')).toBeNull();
		expect(screen.queryByTestId('hero-media')).toBeNull();
		expect(screen.queryByTestId('hero-reveal')).toBeNull();
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
		await view.rerender({ loading: false });
		expect(screen.queryByTestId('hero-skeleton')).toBeNull();
		expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'false');
		expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
		expect(screen.getByTestId('hero-count')).toHaveTextContent('1 / 6');
	});

	it('U-14.1: the photo’s node starts at opacity 0 and turns 1 once the photo loads, on the reveal token (800 ms, Airbnb’s curve), over the muted fill', async () => {
		render(CollapsingHero, { props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' } });
		const reveal = screen.getByTestId('hero-reveal');
		expect(reveal).toHaveAttribute('data-loaded', 'false');
		expect(reveal).toHaveClass(
			'absolute',
			'inset-0',
			'opacity-0',
			'data-[loaded=true]:opacity-100',
			...REVEAL
		);
		const waiting = screen.getByTestId('hero-waiting');
		expect(waiting).toHaveClass('pointer-events-none', 'absolute', 'inset-0', 'bg-muted');
		expect(waiting).toHaveAttribute('aria-hidden', 'true');
		// The fill lies under the node that lights up, as the application's.
		expect(waiting.nextElementSibling).toBe(reveal);
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(reveal).toHaveAttribute('data-loaded', 'true');
		expect(reveal).toHaveClass(...REVEAL);
		// The fill stays while the photo fades in, and goes when the node's own transition ends.
		expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
		await fireEvent(
			screen.getByTestId('hero-media'),
			new Event('transitionend', { bubbles: true })
		);
		expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
		await fireEvent(reveal, new Event('transitionend', { bubbles: true }));
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
		expect(motion.duration.reveal).toBe(800);
		expect(cubicBezierCss('standard')).toBe('cubic-bezier(0.2, 0, 0, 1)');
		expect(tokensToCss()).toContain('--transition-duration-reveal: 800ms;');
	});

	it('U-14.1: a fade that reports no end lets the muted fill go on the token’s clock (800 ms and the 50 ms grace)', async () => {
		vi.useFakeTimers();
		try {
			render(CollapsingHero, { props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' } });
			await fireEvent.load(screen.getByTestId('hero-media'));
			vi.advanceTimersByTime(leaveTimeout('reveal') - 1);
			await tick();
			expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
			vi.advanceTimersByTime(1);
			await tick();
			expect(screen.queryByTestId('hero-waiting')).toBeNull();
			expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'true');
		} finally {
			vi.useRealTimers();
		}
	});

	it('U-14.5 (negative): the first showing of an address fades in even when the browser already holds it at mount; a later mount of it shows at once', async () => {
		decodedAtMount();
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' }
		});
		await tick();
		const first = screen.getByTestId('hero-reveal');
		expect(first).toHaveAttribute('data-loaded', 'true');
		expect(first).toHaveClass(...REVEAL);
		expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
		view.unmount();
		render(CollapsingHero, { props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' } });
		await tick();
		const again = screen.getByTestId('hero-reveal');
		expect(again).toHaveAttribute('data-loaded', 'true');
		expect(again).toHaveClass('data-[loaded=true]:opacity-100');
		// One class per assert: `.not.toHaveClass(a, b)` passes as soon as one of them is missing.
		for (const name of REVEAL) expect(again, name).not.toHaveClass(name);
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
	});

	it('U-14.5: the fade has a start — the node’s style is committed at opacity 0 before `data-loaded` turns it 1 (load and mount alike)', async () => {
		const committed: string[] = [];
		vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
			this: Element
		) {
			if (this.getAttribute('data-testid')?.endsWith('-reveal')) {
				committed.push(this.getAttribute('data-loaded') ?? '');
			}
			return new DOMRect();
		});
		render(CollapsingHero, { props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' } });
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(committed).toEqual(['false']);
		expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'true');
		decodedAtMount();
		render(CollapsingHero, { props: { height: 'hero-h', imageUrl: OTHER_PHOTO, testId: 'other' } });
		await tick();
		expect(committed).toEqual(['false', 'false']);
		expect(screen.getByTestId('other-reveal')).toHaveAttribute('data-loaded', 'true');
	});

	it('U-14.5 (cache): the same address after a loading phase shows at once (shown in this session), without the fill', async () => {
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' }
		});
		await fireEvent.load(screen.getByTestId('hero-media'));
		await view.rerender({ loading: true });
		expect(screen.queryByTestId('hero-media')).toBeNull();
		await view.rerender({ loading: false });
		await tick();
		const held = screen.getByTestId('hero-reveal');
		expect(held).toHaveAttribute('data-loaded', 'true');
		for (const name of REVEAL) expect(held, name).not.toHaveClass(name);
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
	});

	it('U-14.1 (negative): `complete` without a size is no arrival (a broken image is complete too) — it waits for its event', async () => {
		decodedAtMount(0);
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 5', testId: 'hero' }
		});
		await tick();
		const reveal = screen.getByTestId('hero-reveal');
		expect(reveal).toHaveAttribute('data-loaded', 'false');
		expect(reveal).toHaveClass(...REVEAL);
		await fireEvent.error(screen.getByTestId('hero-media'));
		expect(screen.queryByTestId('hero-media')).toBeNull();
		expect(screen.queryByTestId('hero-reveal')).toBeNull();
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
		expect(screen.getByTestId('hero-placeholder')).toBeInTheDocument();
	});

	it('U-14.1: a new address is a new photo that waits and fades in again; the one that arrived stays shown', async () => {
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, testId: 'hero' }
		});
		const first = screen.getByTestId('hero-reveal');
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(first).toHaveAttribute('data-loaded', 'true');
		await view.rerender({ imageUrl: OTHER_PHOTO });
		const second = screen.getByTestId('hero-reveal');
		expect(second).not.toBe(first);
		expect(screen.getByTestId('hero-media')).toHaveAttribute('src', OTHER_PHOTO);
		expect(second).toHaveAttribute('data-loaded', 'false');
		expect(second).toHaveClass(...REVEAL);
		expect(screen.getByTestId('hero-waiting')).toBeInTheDocument();
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(second).toHaveAttribute('data-loaded', 'true');
	});

	// Review r1 MAJOR-1: `{#key}` takes the old <img> out of the DOM, but its request goes on and its listeners stay
	// (Svelte tears down only those of body, window, document and media); jsdom fires events on a detached node too.
	it('U-14.1 (negative): a slow load/error of the <img> that was replaced neither hides nor breaks the new photo', async () => {
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 6', testId: 'hero' }
		});
		const stale = screen.getByTestId('hero-media');
		await view.rerender({ imageUrl: OTHER_PHOTO });
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'true');
		expect(stale.isConnected).toBe(false);
		await fireEvent.load(stale);
		expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'true');
		await fireEvent(
			screen.getByTestId('hero-reveal'),
			new Event('transitionend', { bubbles: true })
		);
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
		await fireEvent.load(stale);
		expect(screen.getByTestId('hero-reveal')).toHaveAttribute('data-loaded', 'true');
		expect(screen.queryByTestId('hero-waiting')).toBeNull();
		await fireEvent.error(stale);
		expect(screen.getByTestId('hero-media')).toHaveAttribute('src', OTHER_PHOTO);
		expect(screen.getByTestId('hero-count')).toHaveTextContent('1 / 6');
		expect(screen.queryByTestId('hero-placeholder')).toBeNull();
	});

	it('U-14.5 (negative): the hero’s skeleton is square, as the photo it stands for — the kit’s `Skeleton` keeps its corners elsewhere', () => {
		render(CollapsingHero, { props: { height: 'hero-h', loading: true, testId: 'hero' } });
		const skeleton = screen.getByTestId('hero-skeleton');
		expect(skeleton).toHaveClass('rounded-none');
		expect(skeleton).not.toHaveClass('rounded-lg');
		const { container } = render(Skeleton, { props: { class: 'h-4' } });
		expect(container.querySelector('[data-slot="skeleton"]')).toHaveClass('rounded-lg');
	});

	it('U-14.5 (negative): the «1 / N» pill lights up WITH the photo — in its node, at 0 until the photo loads, never over the muted fill before it', async () => {
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 6', testId: 'hero' }
		});
		const reveal = screen.getByTestId('hero-reveal');
		const count = screen.getByTestId('hero-count');
		expect(count.parentElement).toBe(reveal);
		expect(reveal).toHaveAttribute('data-loaded', 'false');
		expect(reveal).toHaveClass('opacity-0', 'data-[loaded=true]:opacity-100', ...REVEAL);
		// No fade of its own: the node's opacity is the pill's (the page's `overlayStyle` multiplies with it).
		expect(count.className).not.toMatch(/opacity|duration-|transition/);
		expect(screen.getByTestId('hero-waiting').contains(count)).toBe(false);
		await fireEvent.load(screen.getByTestId('hero-media'));
		expect(reveal).toHaveAttribute('data-loaded', 'true');
		expect(screen.getByTestId('hero-count').parentElement).toBe(reveal);
	});

	it('U-14.5 (cache): an address already shown in this session shows its pill at once, with it', async () => {
		const view = render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 6', testId: 'hero' }
		});
		await fireEvent.load(screen.getByTestId('hero-media'));
		view.unmount();
		render(CollapsingHero, {
			props: { height: 'hero-h', imageUrl: PHOTO, countLabel: '1 / 6', testId: 'hero' }
		});
		await tick();
		const reveal = screen.getByTestId('hero-reveal');
		expect(screen.getByTestId('hero-count').parentElement).toBe(reveal);
		expect(reveal).toHaveAttribute('data-loaded', 'true');
		for (const name of REVEAL) expect(reveal, name).not.toHaveClass(name);
	});

	it('U-14.1: the stories are the application’s list 1:1 (and the web’s one zone story), without the «ανεβαίνει 32» caption', () => {
		const stories = readFileSync(
			resolve(
				process.cwd(),
				'src/shared/ui/organisms/collapsing-hero/collapsing-hero.stories.svelte'
			),
			'utf8'
		);
		const names = [...stories.matchAll(/<Story\s+name="([^"]+)"/g)].map((match) => match[1]);
		expect(names).toEqual([
			'Playground',
			'Tall',
			'Without Count',
			'No Photo',
			'Broken Photo',
			'Under A Scrolling Page',
			'Loading',
			'Arriving',
			// Web only: `hideFrom="none"` (the application has no zone that hides it).
			'Kept On The Tablet'
		]);
		expect(stories).not.toMatch(/ανεβαίνει 32|φύλλο ανεβαίνει/);
		expect(stories).toContain('Φόρτωση ξανά');
	});
});
