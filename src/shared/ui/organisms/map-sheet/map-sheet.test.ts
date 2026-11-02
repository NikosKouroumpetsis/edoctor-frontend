import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import {
	MAP_SHEET_FLING_VELOCITY,
	MAP_SHEET_HALF_SHARE,
	mapSheetOffsetOf,
	mapSheetRestFor,
	type MapSheetRests
} from './index';
import Harness from './map-sheet.harness.svelte';

const sheet = () => screen.getByTestId('sheet');
const scrollOf = () => sheet().querySelector('[data-slot="map-sheet-scroll"]') as HTMLElement;

describe('MapSheet', () => {
	// Rewritten by NIT-7 (D3 app review r1, the orchestrator's decision 10:52, app = web): r1's half drew the handle as a
	// button that did nothing there; the half now draws the grip alone, the 48 handle is the strip's (below).
	it('U-24.4 (§7.2): below 744 it starts at half over the map, the 24 corner on top, the grip drawn (no control at half); from 744 a plain column', () => {
		render(Harness);
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		expect(sheet()).toHaveClass(
			'absolute',
			'bottom-0',
			'h-1/2',
			'rounded-t-xl',
			'shadow-bar',
			'duration-sheet',
			'ease-sheet',
			'tablet:static',
			'tablet:h-auto',
			'tablet:rounded-none',
			'tablet:shadow-none'
		);
		// The share a caller reads (a camera's room) is the height the class gives (NIT-8 of r1).
		expect(MAP_SHEET_HALF_SHARE).toBe(1 / 2);
		const grip = sheet().querySelector('[data-slot="map-sheet-grip"]');
		expect(grip).toHaveClass('min-h-touch', 'w-full', 'tablet:hidden');
		expect(screen.getByRole('heading', { name: 'Βρέθηκαν 12' })).toBeInTheDocument();
		expect(scrollOf()).toHaveClass('overflow-y-auto', 'tablet:overflow-visible');
	});

	it('U-24.4 (§7.2): the list’s first scroll opens it to the whole stage, without its corner or handle', async () => {
		render(Harness);
		scrollOf().scrollTop = 40;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		expect(sheet()).toHaveClass('h-full', 'rounded-t-none');
		expect(screen.queryByRole('button', { name: 'Επαναφορά λίστας' })).toBeNull();
		expect(screen.getByTestId('snap')).toHaveTextContent('full');
	});

	it('U-24.4 (§7.2): «Χάρτης» leaves only its top strip (168); the handle brings it back to half', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initial: 'full' } });
		await user.click(screen.getByTestId('to-peek'));
		expect(sheet()).toHaveAttribute('data-snap', 'peek');
		expect(sheet()).toHaveClass('h-map-sheet-peek');
		expect(scrollOf()).toHaveClass('overflow-hidden');
		await user.click(screen.getByRole('button', { name: 'Επαναφορά λίστας' }));
		expect(sheet()).toHaveAttribute('data-snap', 'half');
	});

	it('U-24.4 (negative): a scroll at full or at the strip moves nothing', async () => {
		render(Harness, { props: { initial: 'peek' } });
		scrollOf().scrollTop = 40;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'peek');
	});

	it('U-24.4 (§7.2, MINOR-2 of r1): «Χάρτης» and the handle show the list from its top («Βρέθηκαν N»), never mid-list', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness);
		scrollOf().scrollTop = 320;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		await user.click(screen.getByTestId('to-peek'));
		expect(sheet()).toHaveAttribute('data-snap', 'peek');
		expect(scrollOf().scrollTop).toBe(0);
		// The strip's list moved (a script, a find-in-page): the handle brings it back to half from its top as well.
		scrollOf().scrollTop = 200;
		await user.click(screen.getByRole('button', { name: 'Επαναφορά λίστας' }));
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		expect(scrollOf().scrollTop).toBe(0);
		// The scroll that reset makes reads 0: the sheet stays at half.
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'half');
	});

	it('U-24.4 (negative, MINOR-2 of r1): at full the reader’s place in the list stays', async () => {
		render(Harness);
		scrollOf().scrollTop = 320;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		expect(scrollOf().scrollTop).toBe(320);
	});

	it('U-24.4 (NIT-7, app = web): at half the grip is only drawn — no «Επαναφορά λίστας» that would do nothing, nothing for Tab or a screen reader', () => {
		render(Harness);
		expect(screen.queryByRole('button', { name: 'Επαναφορά λίστας' })).toBeNull();
		const grip = sheet().querySelector('[data-slot="map-sheet-grip"]') as HTMLElement;
		expect(grip.tagName).toBe('SPAN');
		expect(grip).toHaveAttribute('aria-hidden', 'true');
		expect(grip).toHaveClass('pointer-events-none');
		expect(grip).not.toHaveAttribute('tabindex');
	});

	it('U-24.4 / (ε) (NIT-7, app = web): at the strip the handle is the 48 control that brings half; pressed, the focus goes to the sheet — never the page', async () => {
		const user = userEvent.setup({ delay: null });
		render(Harness, { props: { initial: 'peek' } });
		const handle = screen.getByRole('button', { name: 'Επαναφορά λίστας' });
		expect(handle).toHaveAttribute('data-slot', 'map-sheet-handle');
		expect(handle).toHaveClass('min-h-touch', 'w-full', 'tablet:hidden');
		expect(sheet().querySelector('[data-slot="map-sheet-grip"]')).toBeNull();
		handle.focus();
		await user.keyboard('{Enter}');
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		await waitFor(() => expect(document.activeElement).toBe(sheet()));
		expect(document.activeElement).not.toBe(document.body);
		expect(sheet()).toHaveAccessibleName('Λίστα γιατρών');
		expect(sheet()).toHaveAttribute('tabindex', '-1');
	});

	it('U-24.4 (NIT-7, app = web): at the strip only the header stays reachable below 744 — the cards under it are hidden from Tab and a screen reader', () => {
		render(Harness, { props: { initial: 'peek' } });
		const scroll = scrollOf();
		expect(scroll).toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
		// The header is the column's first child (it stays); the cards come after it (hidden).
		expect(scroll.firstElementChild).toHaveTextContent('Βρέθηκαν 12');
		expect(scroll.firstElementChild).not.toContainElement(
			screen.getByRole('button', { name: 'Κάρτα α' })
		);
		expect(screen.getByRole('button', { name: 'Επαναφορά λίστας' })).not.toHaveAttribute(
			'aria-hidden'
		);
	});

	it('U-24.4 (NIT-7): without a header the whole column is hidden at the strip', () => {
		render(Harness, { props: { initial: 'peek', withHeader: false } });
		expect(scrollOf()).toHaveClass('max-tablet:[&>*]:invisible');
		expect(scrollOf()).not.toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
	});

	it('U-24.4 (negative, NIT-7): half and full hide nothing; from 744 nothing either — the strip’s hiding is the phone’s alone (`max-tablet:`), no `inert`, no `aria-hidden` list', async () => {
		const hiding = () => [...scrollOf().classList].filter((name) => name.includes('invisible'));
		const view = render(Harness);
		expect(hiding()).toEqual([]);
		scrollOf().scrollTop = 40;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		expect(hiding()).toEqual([]);
		view.unmount();
		render(Harness, { props: { initial: 'peek' } });
		expect(hiding().length).toBeGreaterThan(0);
		for (const name of hiding()) expect(name.startsWith('max-tablet:')).toBe(true);
		expect(sheet().querySelector('[inert]')).toBeNull();
		expect(sheet().querySelector('[aria-hidden="true"]')).toBeNull();
	});

	it('NIT-1 (r1): from 744 the column has no top room of its own (the caller’s, level with the map)', () => {
		render(Harness);
		expect(scrollOf()).toHaveClass('pt-6', 'tablet:pt-0');
	});
});

/** An 800 high stage (the phone's, under its bar): its rests are full 0 · half 400 · peek 800 − 168 = 632. */
const STAGE = 800;
const RESTS: MapSheetRests = { full: 0, half: 400, peek: 632 };

describe('MapSheet: where a release rests (U-27.1)', () => {
	it('U-27.1 (app = web): the rests are the application’s — full 0, half the stage, peek the stage less its 168 strip', () => {
		expect(mapSheetOffsetOf('full', STAGE)).toBe(RESTS.full);
		expect(mapSheetOffsetOf('half', STAGE)).toBe(RESTS.half);
		expect(mapSheetOffsetOf('peek', STAGE)).toBe(RESTS.peek);
		// A stage shorter than the strip never puts the strip above its top.
		expect(mapSheetOffsetOf('peek', 120)).toBe(0);
		expect(MAP_SHEET_FLING_VELOCITY).toBe(500);
	});

	it('U-27.1 (app = web): a slow release settles at the nearest rest (between two as near, the more open)', () => {
		expect(mapSheetRestFor(150, 0, RESTS)).toBe('full');
		expect(mapSheetRestFor(250, 0, RESTS)).toBe('half');
		expect(mapSheetRestFor(520, 0, RESTS)).toBe('peek');
		expect(mapSheetRestFor(516, 0, RESTS)).toBe('half');
		expect(mapSheetRestFor(150, MAP_SHEET_FLING_VELOCITY - 1, RESTS)).toBe('full');
		expect(mapSheetRestFor(250, -(MAP_SHEET_FLING_VELOCITY - 1), RESTS)).toBe('half');
	});

	it('U-27.1 (app = web): at 500 px/s or more, from every rest, it goes on to the first rest beyond it that way — none ⇒ the last one', () => {
		// Down (positive).
		expect(mapSheetRestFor(RESTS.full, 500, RESTS)).toBe('half');
		expect(mapSheetRestFor(RESTS.half, 500, RESTS)).toBe('peek');
		expect(mapSheetRestFor(RESTS.peek, 500, RESTS)).toBe('peek');
		// Up (negative).
		expect(mapSheetRestFor(RESTS.peek, -500, RESTS)).toBe('half');
		expect(mapSheetRestFor(RESTS.half, -500, RESTS)).toBe('full');
		expect(mapSheetRestFor(RESTS.full, -500, RESTS)).toBe('full');
		// Between two rests the speed wins over the nearest one.
		expect(mapSheetRestFor(150, 800, RESTS)).toBe('half');
		expect(mapSheetRestFor(600, -900, RESTS)).toBe('half');
		expect(mapSheetRestFor(420, -2000, RESTS)).toBe('half');
	});
});

describe('MapSheet: the finger moves it (U-27.1)', () => {
	let now = 0;
	/**
	 * The stage's height, the events' clock (`timeStamp` is the clock's time when an event is made) and the sheet's
	 * zone: jsdom has no CSS, so its computed `position` is the initial `static`; below 744 the sheet's classes make it
	 * `absolute` (the `SearchPanel` precedent: the CSS-chosen shape is stubbed).
	 */
	function setUp(position: 'absolute' | 'static' = 'absolute') {
		vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function (
			this: HTMLElement
		) {
			return this.dataset.testid === 'stage' ? STAGE : 0;
		});
		now = 1000;
		vi.spyOn(Date, 'now').mockImplementation(() => now);
		const real = window.getComputedStyle.bind(window);
		vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
			element instanceof HTMLElement && element.dataset.slot === 'map-sheet'
				? ({ position } as CSSStyleDeclaration)
				: real(element, pseudo)
		);
	}
	afterEach(() => vi.restoreAllMocks());

	const at = (clientY: number, pointerType = 'touch') => ({
		pointerId: 1,
		button: 0,
		pointerType,
		clientX: 100,
		clientY
	});
	/** Presses at the first place and moves through the others, `stepMs` apart. */
	async function press(target: Element, places: number[], stepMs: number, pointerType = 'touch') {
		await fireEvent.pointerDown(target, at(places[0], pointerType));
		for (const place of places.slice(1)) {
			now += stepMs;
			await fireEvent.pointerMove(target, at(place, pointerType));
		}
	}
	async function letGo(target: Element, clientY: number, afterMs: number) {
		now += afterMs;
		await fireEvent.pointerUp(target, at(clientY));
	}
	const card = () => screen.getByRole('button', { name: 'Κάρτα α' });

	it('U-27.1 (app = web): at half a finger on the list carries the sheet 1:1 — `transform` alone, no transition, the whole stage high — and the list does not scroll', async () => {
		setUp();
		render(Harness);
		// Airbnb's 150 from a card: the sheet rose 150, the list stayed.
		await press(card(), [600, 560, 500, 450], 200);
		expect(sheet()).toHaveAttribute('data-dragging');
		expect(sheet().style.transform).toBe('translateY(250px)');
		expect(sheet()).toHaveClass('h-full', 'rounded-t-xl', 'transition-none', 'select-none');
		expect(sheet()).not.toHaveClass('duration-sheet');
		expect(sheet()).toHaveClass('max-tablet:touch-none');
		expect(scrollOf().scrollTop).toBe(0);
		// Still the rest it left until the finger lets go.
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		// A slow release from 250: the nearest rest is half again, on the sheet's motion.
		await letGo(card(), 450, 400);
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		expect(sheet()).not.toHaveAttribute('data-dragging');
		expect(sheet().style.transform).toBe('');
		expect(sheet()).toHaveClass('h-1/2', 'duration-sheet', 'ease-sheet');
	});

	it('U-27.1 (app = web): 250 up from the top strip at half ⇒ the sheet whole on release (Airbnb’s, measured), so «Χάρτης» can show', async () => {
		setUp();
		render(Harness);
		await press(sheet(), [20, -30, -130, -230], 200);
		expect(sheet().style.transform).toBe('translateY(150px)');
		await letGo(sheet(), -230, 400);
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		expect(screen.getByTestId('snap')).toHaveTextContent('full');
		expect(sheet()).toHaveClass('h-full', 'rounded-t-none', 'duration-sheet');
		expect(sheet()).not.toHaveClass('max-tablet:touch-none');
	});

	it('U-27.1 (app = web): never past full or the strip — the finger may go on, the sheet stops at its ends', async () => {
		setUp();
		render(Harness);
		await press(card(), [600, 0, -300], 100);
		expect(sheet().style.transform).toBe('translateY(0px)');
		await fireEvent.pointerMove(card(), at(1400));
		expect(sheet().style.transform).toBe(`translateY(${RESTS.peek}px)`);
	});

	it('U-27.1 (app = web): a flick (≥ 500 px/s) goes on to the next rest — down from half to the strip, up from the strip to half', async () => {
		setUp();
		render(Harness);
		// 40 down in 40 ms (1000 px/s): only 40 from half, yet the strip.
		await press(card(), [600, 620, 640], 20);
		await letGo(card(), 640, 0);
		expect(sheet()).toHaveAttribute('data-snap', 'peek');
		// From the strip (its handle), 40 up in 40 ms: half, not back to the strip.
		const handle = screen.getByRole('button', { name: 'Επαναφορά λίστας' });
		await press(handle, [20, 0, -20], 20);
		await letGo(handle, -20, 0);
		expect(sheet()).toHaveAttribute('data-snap', 'half');
	});

	it('U-27.1 (app = web): at full the list scrolls — only a pull DOWN moves the sheet, from the top strip or from a list at its top', async () => {
		setUp();
		render(Harness, { props: { initial: 'full' } });
		// The list scrolled: a pull down from it is the list's own scroll.
		scrollOf().scrollTop = 200;
		await press(card(), [400, 440, 480], 100);
		expect(sheet()).not.toHaveAttribute('data-dragging');
		await letGo(card(), 480, 100);
		// The same pull from the top strip moves the sheet.
		await press(sheet(), [10, 50, 90], 100);
		expect(sheet().style.transform).toBe('translateY(80px)');
		await letGo(sheet(), 90, 400);
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		// At its top the list hands a pull down to the sheet: 300 down, slowly ⇒ half (the nearest).
		scrollOf().scrollTop = 0;
		await press(card(), [400, 500, 600, 700], 200);
		expect(sheet().style.transform).toBe('translateY(300px)');
		await letGo(card(), 700, 400);
		expect(sheet()).toHaveAttribute('data-snap', 'half');
	});

	it('U-27.1 (negative): at full a push UP never moves the sheet, even from its top or a list at its top', async () => {
		setUp();
		render(Harness, { props: { initial: 'full' } });
		await press(sheet(), [40, 20, 0], 100);
		expect(sheet()).not.toHaveAttribute('data-dragging');
		await letGo(sheet(), 0, 100);
		await press(card(), [400, 360, 320], 100);
		expect(sheet()).not.toHaveAttribute('data-dragging');
		expect(sheet()).toHaveAttribute('data-snap', 'full');
	});

	it('U-27.1 (ε): the one listener that is not passive stops the native scroll only for a pull that is the sheet’s', async () => {
		setUp();
		render(Harness, { props: { initial: 'full' } });
		const touchMove = (clientY: number) => {
			const event = new TouchEvent('touchmove', {
				bubbles: true,
				cancelable: true,
				touches: [{ clientX: 100, clientY } as unknown as Touch]
			});
			card().dispatchEvent(event);
			return event.defaultPrevented;
		};
		// A list at its top, a pull down: the sheet's (the browser must not scroll).
		await fireEvent.pointerDown(card(), at(400));
		expect(touchMove(404)).toBe(true);
		await fireEvent.pointerUp(card(), at(404));
		// (negative) a push up: the list's own scroll goes on.
		await fireEvent.pointerDown(card(), at(400));
		expect(touchMove(396)).toBe(false);
		await fireEvent.pointerUp(card(), at(396));
		// (negative) a list that scrolled: a pull down scrolls it back, natively.
		scrollOf().scrollTop = 200;
		await fireEvent.pointerDown(card(), at(400));
		expect(touchMove(404)).toBe(false);
		await fireEvent.pointerUp(card(), at(404));
	});

	it('U-27.1 (negative): a tap opens the card under it; the release of a drag opens nothing', async () => {
		setUp();
		const onCard = vi.fn();
		render(Harness, { props: { onCard } });
		await fireEvent.pointerDown(card(), at(600));
		await fireEvent.pointerUp(card(), at(602));
		await fireEvent.click(card(), { detail: 1 });
		expect(onCard).toHaveBeenCalledOnce();
		await press(card(), [600, 500, 400], 200);
		await letGo(card(), 400, 400);
		await fireEvent.click(card(), { detail: 1 });
		expect(onCard).toHaveBeenCalledOnce();
		// The next press is a press again (and a keyboard's click always passes).
		await fireEvent.pointerDown(card(), at(300));
		await fireEvent.pointerUp(card(), at(300));
		await fireEvent.click(card(), { detail: 1 });
		expect(onCard).toHaveBeenCalledTimes(2);
	});

	it('U-27.1 (app = web): the mouse moves it from its top strip (the handle) — never from the list, where it clicks and selects', async () => {
		setUp();
		render(Harness);
		await press(card(), [600, 500, 400], 100, 'mouse');
		expect(sheet()).not.toHaveAttribute('data-dragging');
		await letGo(card(), 400, 100);
		await press(sheet(), [20, -80, -180], 100, 'mouse');
		expect(sheet()).toHaveAttribute('data-dragging');
		expect(sheet().style.transform).toBe('translateY(200px)');
	});

	it('U-27.1 (negative): a caller’s own style stays — the drag adds its offset after it, never replaces it', async () => {
		setUp();
		render(Harness, { props: { sheetStyle: 'scroll-margin-top: 0' } });
		expect(sheet().style.scrollMarginTop).toBe('0px');
		await press(card(), [600, 560, 520], 100);
		expect(sheet().style.scrollMarginTop).toBe('0px');
		expect(sheet().style.transform).toBe('translateY(320px)');
		await letGo(card(), 520, 400);
		expect(sheet().style.scrollMarginTop).toBe('0px');
		expect(sheet().style.transform).toBe('');
	});

	it('U-27.1 (negative): from 744 the sheet is the page’s column — no finger, pen or mouse moves it, nothing is held back', async () => {
		setUp('static');
		render(Harness);
		await press(card(), [600, 500, 400], 100);
		expect(sheet()).not.toHaveAttribute('data-dragging');
		expect(sheet().style.transform).toBe('');
		expect(sheet()).toHaveAttribute('data-snap', 'half');
		// The phone's classes alone hold the touch back: from 744 nothing does.
		for (const name of [...sheet().classList].filter((item) => item.includes('touch-')))
			expect(name.startsWith('max-tablet:')).toBe(true);
	});

	it('U-27.1 (ε): off full the browser never scrolls the list under a finger (`touch-action: none`, below 744 only); at full it does — and the wheel, the keys and assistive tech still open it whole by scrolling at half', async () => {
		render(Harness);
		expect(sheet()).toHaveClass('max-tablet:touch-none');
		scrollOf().scrollTop = 40;
		await fireEvent.scroll(scrollOf());
		expect(sheet()).toHaveAttribute('data-snap', 'full');
		expect(sheet()).not.toHaveClass('max-tablet:touch-none');
		await userEvent.setup({ delay: null }).click(screen.getByTestId('to-peek'));
		expect(sheet()).toHaveClass('max-tablet:touch-none');
	});

	it('U-27.1 (δ): «Χάρτης», the handle at the strip and the list from its top stay — a drag up from the strip shows the list while it moves, hides it again at the strip', async () => {
		setUp();
		render(Harness, { props: { initial: 'peek' } });
		expect(scrollOf()).toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
		const handle = screen.getByRole('button', { name: 'Επαναφορά λίστας' });
		await press(handle, [20, 0, -40], 200);
		expect(scrollOf()).not.toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
		expect(scrollOf()).toHaveClass('overflow-y-auto');
		// A slow release near the strip: back to it, the list hidden again from its top.
		await letGo(handle, -40, 400);
		expect(sheet()).toHaveAttribute('data-snap', 'peek');
		expect(scrollOf()).toHaveClass('max-tablet:[&>*:not(:first-child)]:invisible');
		expect(scrollOf().scrollTop).toBe(0);
	});
});
