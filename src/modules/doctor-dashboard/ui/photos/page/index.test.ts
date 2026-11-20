import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { ToastState } from '$shared/ui/molecules/toast';
import {
	SAMPLE_PHOTO_IDS,
	samplePhotoServer
} from '$modules/doctor-dashboard/api/images/images.sample';
import Harness from './photos.harness.svelte';

/*
 * Wave 5.2 · screen 78 «Φωτογραφίες» (U-206, D-W52-37 … 42): the page with the server stubbed at `fetch` and at
 * `XMLHttpRequest` (the writes of a file). A made-up doctor only; no picture is ever read — the files are a few bytes
 * and the device's measure of them is the spec's.
 */

const [A, B, C, D] = SAMPLE_PHOTO_IDS;
const API = 'http://localhost:8080';
const BIG = { width: 1600, height: 1200 };

function serve(options: { count?: number; size?: { width: number; height: number } } = {}) {
	const server = samplePhotoServer({ count: options.count });
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	vi.stubGlobal('XMLHttpRequest', server.Upload);
	const size = options.size ?? BIG;
	vi.stubGlobal(
		'createImageBitmap',
		vi.fn(async (file: File) => {
			if (file.name.startsWith('broken')) throw new Error('not a picture');
			return { ...(file.name.startsWith('tiny') ? { width: 640, height: 480 } : size), close() {} };
		})
	);
	return server;
}

function open(options: { session?: Session; toasts?: ToastState; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	return { client, ...render(Harness, { props: { client, ...options } }) };
}

const page = () => screen.getByTestId('doctor-photos');
const settled = (view = 'ready') =>
	waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const grid = () => screen.getByTestId('doctor-photos-grid');
const tiles = () => [...grid().querySelectorAll<HTMLElement>('[data-photo-id]')];
const shownIds = () => tiles().map((tile) => tile.dataset.photoId);
/** The order the page shows, once it has drawn it. */
const shows = (ids: readonly string[]) => waitFor(() => expect(shownIds()).toEqual(ids));
const handle = (id: string) =>
	grid().querySelector<HTMLElement>(`[data-photo-id="${id}"] [data-slot="doctor-photo-handle"]`)!;
const uploadTiles = () => [...grid().querySelectorAll<HTMLElement>('[data-status]')];
const photo = (name: string, type = 'image/jpeg', bytes = 8) =>
	new File([new Uint8Array(bytes)], name, { type });
/** The moved photo keeps the focus (the page gives it back once the tile stands in its new place). */
const focused = (id: string) => waitFor(() => expect(document.activeElement).toBe(handle(id)));
const pick = (...files: File[]) =>
	fireEvent.change(screen.getByTestId('doctor-photos-input'), { target: { files } });
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});
const menuOf = async (user: ReturnType<typeof userEvent.setup>, position: number) => {
	await user.click(screen.getByTestId(`doctor-photo-menu-${position}`));
	return screen.findByTestId(`doctor-photo-menu-content-${position}`);
};
/** jsdom lays nothing out: every tile is given the box of its place in the list (100 × 75, one row). */
function layOut() {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		const tile = this.closest<HTMLElement>('[data-photo-id]');
		const index = tile ? [...(tile.parentElement?.children ?? [])].indexOf(tile) : -1;
		const left = index < 0 ? -1000 : index * 110;
		return { left, top: 0, right: left + 100, bottom: 75, width: 100, height: 75 } as DOMRect;
	});
}
const pointer = (type: string, node: Element, x: number, y: number, more: object = {}) =>
	fireEvent(
		node,
		new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, ...more })
	);

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	vi.useRealTimers();
});

describe('«Φωτογραφίες» of the doctor (wave 5.2 · screen 78)', () => {
	it('🔴 U-206 · D-W52-37: the title, «Η πρώτη είναι η κύρια: …», and the photos in the server’s order — each a 4:3 tile, the first one large with «Κύρια», three in a row from 744 and two below it', async () => {
		const server = serve();
		open();
		await settled();
		expect(screen.getByRole('heading', { level: 2, name: 'Φωτογραφίες' })).toBeInTheDocument();
		expect(screen.getByTestId('doctor-photos-lead')).toHaveTextContent(
			'Η πρώτη είναι η κύρια: φαίνεται πρώτη στην αναζήτηση και στη σελίδα σας.'
		);
		expect(server.callsOf('GET')).toEqual([['/doctor/profile/images', undefined]]);
		await shows([A, B, C, D]);
		expect(grid().tagName).toBe('UL');
		expect(grid()).toHaveClass('grid', 'grid-cols-2', 'tablet:grid-cols-3');
		const [first, second] = tiles();
		for (const tile of tiles()) expect(tile).toHaveClass('aspect-4/3');
		expect(first).toHaveAttribute('data-main');
		expect(first).toHaveClass('col-span-2', 'tablet:row-span-2', 'tablet:aspect-auto');
		expect(second).not.toHaveAttribute('data-main');
		expect(second).not.toHaveClass('col-span-2');
		expect(grid().querySelectorAll('[data-slot="doctor-photo-main"]')).toHaveLength(1);
		expect(first.querySelector('[data-slot="doctor-photo-main"]')).toHaveTextContent('Κύρια');
		// The server's stored sizes: the large one for the main photo, the medium one for the others.
		expect(first.querySelector('img')).toHaveAttribute(
			'src',
			`${API}/uploads/doctor/profile/images/large/1.webp`
		);
		expect(second.querySelector('img')).toHaveAttribute(
			'src',
			`${API}/uploads/doctor/profile/images/medium/2.webp`
		);
		expect(first.querySelector('img')).toHaveClass('object-cover');
		// Each photo is named by the server's own words (D-W52-33).
		expect(handle(B)).toHaveAccessibleName('Ελένη Παππά, φωτογραφία 2');
	});

	it('🔴 D-W52-42 · D-W52-39: under the grid how the order changes — a drag from 744, the application’s long press below it — the limits, and where the office’s photos go: plain words, no link', async () => {
		serve();
		open();
		await settled();
		const hint = screen.getByTestId('doctor-photos-hint');
		const [hold, drag] = hint.querySelectorAll('span');
		expect(hold).toHaveTextContent('Κρατήστε πατημένη μια φωτογραφία για να αλλάξετε τη σειρά.');
		expect(hold).toHaveClass('tablet:hidden');
		expect(drag).toHaveTextContent('Σύρετε μια φωτογραφία για να αλλάξετε τη σειρά.');
		expect(drag).toHaveClass('hidden', 'tablet:inline');
		expect(hint).toHaveTextContent('Έως 20 φωτογραφίες · JPG, PNG ή WebP · έως 10 MB η καθεμία.');
		expect(hint).not.toHaveTextContent('HEIC');
		expect(handle(A)).toHaveAttribute('aria-describedby', hint.id);
		const foot = screen.getByTestId('doctor-photos-foot');
		expect(foot).toHaveTextContent(
			'Οι φωτογραφίες του ιατρείου μπαίνουν στο κάθε ιατρείο, στις Ρυθμίσεις ιατρείου.'
		);
		expect(foot.querySelector('a, button')).toBeNull();
		// 🔴 D-W52-42 (U-179, `78-photos/shots/w-full-1440.png`): «Ρυθμίσεις ιατρείου» in bold — the weight alone, the
		// footnote's own colour and size, words and no link.
		const strong = foot.querySelectorAll('strong');
		expect(strong).toHaveLength(1);
		expect(strong[0].textContent).toBe('Ρυθμίσεις ιατρείου');
		expect(strong[0].className).toBe('font-semibold');
		expect(foot.textContent?.trim()).toBe(
			'Οι φωτογραφίες του ιατρείου μπαίνουν στο κάθε ιατρείο, στις Ρυθμίσεις ιατρείου.'
		);
	});

	it('🔴 U-102 · U-217: below 950 the page has «‹» to «Το προφίλ μου» — a link, never a window; from 950 none', async () => {
		serve();
		open();
		await settled();
		const back = screen.getByTestId('doctor-photos-back');
		expect(back).toHaveAttribute('href', '/doctor/profile');
		expect(back).toHaveAccessibleName('Πίσω');
		expect(back).toHaveClass('split:hidden');
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('🔴 U-206 · D-W52-37: «⋯» on a photo opens the in-house menu — «Κάντε την κύρια» · «Προσαρμογή» · «Διαγραφή»; the first has no «Κάντε την κύρια»; «Προσαρμογή» is a link to its own page (U-102)', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		await settled();
		const trigger = screen.getByTestId('doctor-photo-menu-2');
		expect(trigger).toHaveAccessibleName('Επιλογές φωτογραφίας 2');
		expect(trigger).toHaveClass('size-touch');
		const second = await menuOf(user, 2);
		expect(second).toHaveAttribute('role', 'menu');
		expect(
			within(second)
				.getAllByRole('menuitem')
				.map((item) => item.textContent?.trim())
		).toEqual(['Κάντε την κύρια', 'Προσαρμογή', 'Διαγραφή']);
		const crop = within(second).getByRole('menuitem', { name: 'Προσαρμογή' });
		expect(crop.tagName).toBe('A');
		expect(crop).toHaveAttribute('href', `/doctor/profile/photos/${B}/crop`);
		await user.keyboard('{Escape}');
		const first = await menuOf(user, 1);
		expect(
			within(first)
				.getAllByRole('menuitem')
				.map((item) => item.textContent?.trim())
		).toEqual(['Προσαρμογή', 'Διαγραφή']);
	});

	it('🔴 D-W52-31 · D-W52-39: «Κάντε την κύρια» is ONE `PUT order` with that photo first and every other once — the page shows it at once and says so to a reader', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		const menu = await menuOf(user, 3);
		await user.click(within(menu).getByRole('menuitem', { name: 'Κάντε την κύρια' }));
		await shows([C, A, B, D]);
		await waitFor(() =>
			expect(server.callsOf('PUT')).toEqual([
				['/doctor/profile/images/order', { imageIds: [C, A, B, D] }]
			])
		);
		expect(tiles()[0]).toHaveAttribute('data-main');
		const live = screen.getByTestId('doctor-photos-live');
		expect(live).toHaveAttribute('aria-live', 'polite');
		expect(live).toHaveTextContent('Η φωτογραφία πήγε στη θέση 1 από 4.');
		// The server's words follow the positions.
		await waitFor(() => expect(handle(C)).toHaveAccessibleName('Ελένη Παππά, φωτογραφία 1'));
	});

	it('🔴 D-W52-39: the arrows move the FOCUSED photo one place — the focus stays on it, a reader is told, and one call carries the order; at either end nothing happens', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		handle(B).focus();
		await user.keyboard('{ArrowRight}');
		await shows([A, C, B, D]);
		await focused(B);
		expect(screen.getByTestId('doctor-photos-live')).toHaveTextContent(
			'Η φωτογραφία πήγε στη θέση 3 από 4.'
		);
		await waitFor(() =>
			expect(server.callsOf('PUT')).toEqual([
				['/doctor/profile/images/order', { imageIds: [A, C, B, D] }]
			])
		);
		await user.keyboard('{ArrowUp}');
		await shows([A, B, C, D]);
		await focused(B);
		await user.keyboard('{ArrowLeft}');
		await shows([B, A, C, D]);
		await focused(B);
		expect(tiles()[0].dataset.photoId).toBe(B);
		await waitFor(() => expect(server.ids()).toEqual([B, A, C, D]));
		// The first cannot go before itself; another key is no move.
		const sent = server.callsOf('PUT').length;
		await user.keyboard('{ArrowLeft}{Enter}{Home}');
		await shows([B, A, C, D]);
		expect(server.callsOf('PUT')).toHaveLength(sent);
	});

	it('🔴 D-W52-39: arrows pressed while a call is away become ONE more call — the last order wanted, never one per press', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		let release: () => void = () => {};
		const held = vi.fn(async (input: string, init?: RequestInit) => {
			if (init?.method === 'PUT') await new Promise<void>((resolve) => (release = resolve));
			return server.fetch(input, init);
		});
		vi.stubGlobal('fetch', held);
		open();
		await settled();
		handle(A).focus();
		const asked = () => held.mock.calls.filter(([, init]) => init?.method === 'PUT').length;
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(asked()).toBe(1));
		expect(server.callsOf('PUT')).toHaveLength(0);
		await focused(A);
		await user.keyboard('{ArrowRight}');
		await focused(A);
		await user.keyboard('{ArrowRight}');
		await shows([B, C, D, A]);
		release();
		await waitFor(() => expect(server.callsOf('PUT')).toHaveLength(1));
		// The second call leaves only now, with the last order wanted.
		await waitFor(() => expect(asked()).toBe(2));
		release();
		await waitFor(() => expect(server.callsOf('PUT')).toHaveLength(2));
		expect(server.callsOf('PUT').map(([, body]) => body)).toEqual([
			{ imageIds: [B, A, C, D] },
			{ imageIds: [B, C, D, A] }
		]);
		await shows([B, C, D, A]);
	});

	it('🔴 D-W52-39: a photo dragged with the pointer takes the place it is let go over — the order shows while it is dragged, and ONE `PUT order` goes at the end', async () => {
		const server = serve();
		open();
		await settled();
		layOut();
		const dragged = handle(A);
		pointer('pointerdown', dragged, 50, 40);
		// A press is not a drag: within the slop nothing is lifted.
		pointer('pointermove', dragged, 52, 41);
		expect(grid().querySelector('[data-lifted]')).toBeNull();
		pointer('pointermove', dragged, 270, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, C, A, D]));
		expect(grid().querySelector('[data-lifted]')).toHaveAttribute('data-photo-id', A);
		expect(server.callsOf('PUT')).toEqual([]);
		pointer('pointermove', dragged, 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, A, C, D]));
		expect(server.callsOf('PUT')).toEqual([]);
		pointer('pointerup', dragged, 160, 40);
		expect(grid().querySelector('[data-lifted]')).toBeNull();
		await waitFor(() =>
			expect(server.callsOf('PUT')).toEqual([
				['/doctor/profile/images/order', { imageIds: [B, A, C, D] }]
			])
		);
		expect(screen.getByTestId('doctor-photos-live')).toHaveTextContent(
			'Η φωτογραφία πήγε στη θέση 2 από 4.'
		);
		await shows([B, A, C, D]);
	});

	it('(negative) D-W52-39: a drag that ends where it began, one the browser takes back, a right click and `Escape` send nothing and leave the photos as they were', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		layOut();
		// Out and back.
		pointer('pointerdown', handle(A), 50, 40);
		pointer('pointermove', handle(A), 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, A, C, D]));
		pointer('pointermove', handle(A), 50, 40);
		await waitFor(() => expect(shownIds()).toEqual([A, B, C, D]));
		pointer('pointerup', handle(A), 50, 40);
		// Taken back by the browser.
		pointer('pointerdown', handle(A), 50, 40);
		pointer('pointermove', handle(A), 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, A, C, D]));
		pointer('pointercancel', handle(A), 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([A, B, C, D]));
		// `Escape` while it is lifted.
		pointer('pointerdown', handle(A), 50, 40);
		pointer('pointermove', handle(A), 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, A, C, D]));
		handle(A).focus();
		await user.keyboard('{Escape}');
		await waitFor(() => expect(shownIds()).toEqual([A, B, C, D]));
		pointer('pointerup', handle(A), 160, 40);
		// A right click never drags.
		fireEvent(
			handle(A),
			Object.assign(
				new MouseEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 40, button: 2 }),
				{
					pointerType: 'mouse'
				}
			)
		);
		expect(grid().querySelector('[data-lifted]')).toBeNull();
		expect(server.callsOf('PUT')).toEqual([]);
	});

	it('🔴 U-81.2 · D-W52-39: a finger drags only after it has held still (the application’s long press) — moved sooner it is the page being scrolled, and nothing is lifted', async () => {
		vi.useFakeTimers({ now: new Date('2026-11-18T12:00:00.000Z'), shouldAdvanceTime: true });
		const server = serve();
		open();
		await settled();
		layOut();
		const touch = (type: string, x: number, y: number) =>
			fireEvent(
				handle(A),
				Object.assign(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }), {
					pointerType: 'touch',
					pointerId: 7
				})
			);
		// Moved at once: a scroll.
		touch('pointerdown', 50, 40);
		touch('pointermove', 50, 80);
		await vi.advanceTimersByTimeAsync(500);
		touch('pointermove', 160, 40);
		expect(grid().querySelector('[data-lifted]')).toBeNull();
		touch('pointerup', 160, 40);
		await shows([A, B, C, D]);
		// Held, then moved: the drag.
		touch('pointerdown', 50, 40);
		await vi.advanceTimersByTimeAsync(400);
		await waitFor(() =>
			expect(grid().querySelector('[data-lifted]')).toHaveAttribute('data-photo-id', A)
		);
		touch('pointermove', 160, 40);
		await waitFor(() => expect(shownIds()).toEqual([B, A, C, D]));
		touch('pointerup', 160, 40);
		await waitFor(() =>
			expect(server.callsOf('PUT')).toEqual([
				['/doctor/profile/images/order', { imageIds: [B, A, C, D] }]
			])
		);
	});

	it('🔴 D-W52-39 (negative): an order the server refuses puts the photos back as they were and says so — on the page and to a reader; the list is read again', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		server.refuse('PUT', '/order', 422, {
			errorCode: 'EC422',
			errorMessage: 'Validation Error: DOCTOR_IMAGE_ORDER_MISMATCH'
		});
		handle(A).focus();
		await user.keyboard('{ArrowRight}');
		await shows([B, A, C, D]);
		const failure = await screen.findByTestId('doctor-photos-order-failure');
		expect(failure).toHaveTextContent(
			'Η σειρά δεν άλλαξε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await shows([A, B, C, D]);
		expect(screen.getByTestId('doctor-photos-live')).toHaveTextContent('Η σειρά δεν άλλαξε.');
		await waitFor(() => expect(server.callsOf('GET')).toHaveLength(2));
		// The next order that passes takes the words away.
		handle(A).focus();
		await user.keyboard('{ArrowRight}');
		await waitFor(() => expect(server.ids()).toEqual([B, A, C, D]));
		expect(screen.queryByTestId('doctor-photos-order-failure')).toBeNull();
	});

	it('🔴 U-206 · D-W52-34: «Διαγραφή» ALWAYS asks, in the small window — «Διαγραφή φωτογραφίας;» · «Φεύγει από τη σελίδα σας και από την αναζήτηση.» · «Άκυρο» / «Διαγραφή»; «Άκυρο» deletes nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		const menu = await menuOf(user, 2);
		await user.click(within(menu).getByRole('menuitem', { name: 'Διαγραφή' }));
		const dialog = await screen.findByTestId('doctor-photo-delete-dialog');
		expect(server.callsOf('DELETE')).toEqual([]);
		expect(within(dialog).getByRole('heading')).toHaveTextContent('Διαγραφή φωτογραφίας;');
		const body = within(dialog).getByTestId('doctor-photo-delete-body');
		expect(body).toHaveTextContent('Φεύγει από τη σελίδα σας και από την αναζήτηση.');
		expect(body).not.toHaveTextContent('Κύρια γίνεται η επόμενη.');
		expect(within(dialog).getByTestId('doctor-photo-delete-cancel')).toHaveTextContent('Άκυρο');
		expect(within(dialog).getByTestId('doctor-photo-delete-confirm')).toHaveTextContent('Διαγραφή');
		await user.click(within(dialog).getByTestId('doctor-photo-delete-cancel'));
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-delete-dialog')).toBeNull());
		expect(server.callsOf('DELETE')).toEqual([]);
		await shows([A, B, C, D]);
	});

	it('🔴 D-W52-34: deleting the MAIN photo says «Κύρια γίνεται η επόμενη.»; confirmed, the photo leaves, the next one is the main one and «Η φωτογραφία διαγράφηκε.»', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const toasts = new ToastState();
		open({ toasts });
		await settled();
		const menu = await menuOf(user, 1);
		await user.click(within(menu).getByRole('menuitem', { name: 'Διαγραφή' }));
		const dialog = await screen.findByTestId('doctor-photo-delete-dialog');
		expect(within(dialog).getByTestId('doctor-photo-delete-body')).toHaveTextContent(
			'Φεύγει από τη σελίδα σας και από την αναζήτηση. Κύρια γίνεται η επόμενη.'
		);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-confirm'));
		await waitFor(() => expect(shownIds()).toEqual([B, C, D]));
		expect(server.callsOf('DELETE')).toEqual([[`/doctor/profile/images/${A}`, {}]]);
		expect(tiles()[0]).toHaveAttribute('data-main');
		expect(toasts.current?.message).toBe('Η φωτογραφία διαγράφηκε.');
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-delete-dialog')).toBeNull());
		// The list is read again after the write: the server's words follow the new positions.
		await waitFor(() => expect(handle(B)).toHaveAccessibleName('Ελένη Παππά, φωτογραφία 1'));
	});

	it('D-W52-34: the only photo is deleted without «Κύρια γίνεται η επόμενη.», and the page is the empty one again', async () => {
		const user = userEvent.setup({ delay: null });
		serve({ count: 1 });
		open();
		await settled();
		const menu = await menuOf(user, 1);
		await user.click(within(menu).getByRole('menuitem', { name: 'Διαγραφή' }));
		const dialog = await screen.findByTestId('doctor-photo-delete-dialog');
		expect(within(dialog).getByTestId('doctor-photo-delete-body')).not.toHaveTextContent(
			'Κύρια γίνεται η επόμενη.'
		);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-confirm'));
		expect(await screen.findByTestId('doctor-photos-empty')).toBeInTheDocument();
	});

	it('🔴 U-65.6 (negative): a deletion the server refuses keeps the photo and says so in the window; a photo already gone (`404`) just leaves; a `401` ends the session', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const expire = vi.fn();
		open({ session: member(expire) });
		await settled();
		const ask = async (position: number) => {
			const menu = await menuOf(user, position);
			await user.click(within(menu).getByRole('menuitem', { name: 'Διαγραφή' }));
			return screen.findByTestId('doctor-photo-delete-dialog');
		};
		server.refuse('DELETE', `/${B}`, 500);
		const dialog = await ask(2);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-confirm'));
		expect(await within(dialog).findByTestId('doctor-photo-delete-failure')).toHaveTextContent(
			'Η διαγραφή δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await shows([A, B, C, D]);
		expect(expire).not.toHaveBeenCalled();
		server.refuse('DELETE', `/${B}`, 401);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-confirm'));
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		await shows([A, B, C, D]);
		server.refuse('DELETE', `/${B}`, 404);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-confirm'));
		await waitFor(() => expect(shownIds()).toEqual([A, C, D]));
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-delete-dialog')).toBeNull());
	});

	it('🔴 D-W52-38: the file input takes JPG, PNG and WebP, many at once; «Προσθήκη» is a 4:3 tile after the photos that opens it — and goes when the 20 are reached', async () => {
		serve();
		const first = open();
		await settled();
		const input = screen.getByTestId('doctor-photos-input') as HTMLInputElement;
		expect(input).toHaveAttribute('type', 'file');
		expect(input).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
		expect(input.multiple).toBe(true);
		const add = screen.getByTestId('doctor-photos-add');
		expect(add).toHaveTextContent('Προσθήκη');
		expect(add.closest('li')).toHaveClass('aspect-4/3');
		expect(add.closest('li')?.previousElementSibling).toBe(tiles()[3]);
		const click = vi.spyOn(input, 'click').mockImplementation(() => {});
		await userEvent.setup({ delay: null }).click(add);
		expect(click).toHaveBeenCalledOnce();
		first.unmount();
		serve({ count: 20 });
		open();
		await settled();
		expect(tiles()).toHaveLength(20);
		expect(screen.queryByTestId('doctor-photos-add')).toBeNull();
	});

	it('🔴 D-W52-38: the picked photos go ONE at a time — the first is sent while the others wait their turn, each with its ring; a stored one becomes a photo of the grid, last', async () => {
		const server = serve();
		open();
		await settled();
		await pick(photo('one.jpg'), photo('two.png', 'image/png'), photo('three.webp', 'image/webp'));
		await waitFor(() => expect(uploadTiles()).toHaveLength(3));
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		expect(uploadTiles().map((tile) => tile.dataset.status)).toEqual([
			'sending',
			'waiting',
			'waiting'
		]);
		for (const tile of uploadTiles()) {
			expect(tile).toHaveClass('aspect-4/3');
			expect(within(tile).getByRole('progressbar')).toHaveAccessibleName('Ανεβαίνει');
		}
		const first = server.uploads[0];
		expect(first).toMatchObject({ method: 'POST', path: '/doctor/profile/images' });
		expect(first.body).toEqual({
			image: { file: expect.stringMatching(/^data:image\/jpeg;base64,/u), fileName: 'photo.jpg' }
		});
		// How much of it has left shows in its ring.
		first.progress(62, 100);
		await waitFor(() =>
			expect(within(uploadTiles()[0]).getByRole('progressbar')).toHaveAttribute(
				'aria-valuenow',
				'0.62'
			)
		);
		// Nothing else leaves until this one has an answer.
		expect(server.uploads).toHaveLength(1);
		first.store();
		await waitFor(() => expect(server.uploads).toHaveLength(2));
		await waitFor(() => expect(tiles()).toHaveLength(5));
		expect(uploadTiles().map((tile) => tile.dataset.status)).toEqual(['sending', 'waiting']);
		expect(server.uploads[1].body.image?.fileName).toBe('photo.png');
		server.uploads[1].store();
		await waitFor(() => expect(server.uploads).toHaveLength(3));
		server.uploads[2].store();
		await waitFor(() => expect(tiles()).toHaveLength(7));
		expect(uploadTiles()).toEqual([]);
		expect(shownIds().slice(0, 4)).toEqual([A, B, C, D]);
		expect(shownIds()).toEqual(server.ids());
	});

	it('🔴 D-W52-38: a photo that was not sent says «Δεν ανέβηκε» with «Ξανά» and «×» — the queue goes on; «Ξανά» sends the same file again, «×» takes it away', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		await pick(photo('one.jpg'), photo('two.jpg'));
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		server.uploads[0].lose();
		// The next one takes its turn at once.
		await waitFor(() => expect(server.uploads).toHaveLength(2));
		const [failed] = uploadTiles();
		expect(failed).toHaveAttribute('data-status', 'failed');
		expect(within(failed).getByRole('alert')).toHaveTextContent('Δεν ανέβηκε');
		expect(failed.querySelector('[data-slot="doctor-photo-upload-reason"]')).toBeNull();
		const retry = within(failed).getByRole('button', { name: 'Ξανά' });
		const drop = within(failed).getByRole('button', { name: 'Αφαίρεση' });
		expect(drop).toHaveClass('size-touch');
		server.uploads[1].store();
		await waitFor(() => expect(tiles()).toHaveLength(5));
		await user.click(retry);
		await waitFor(() => expect(server.uploads).toHaveLength(3));
		expect(uploadTiles()[0]).toHaveAttribute('data-status', 'sending');
		expect(server.uploads[2].body).toEqual(server.uploads[0].body);
		server.uploads[2].refuse(429, {
			errorCode: 'EC429',
			errorMessage: 'Too many requests. Please try again later.'
		});
		await waitFor(() => expect(uploadTiles()[0]).toHaveAttribute('data-status', 'failed'));
		await user.click(within(uploadTiles()[0]).getByRole('button', { name: 'Αφαίρεση' }));
		expect(uploadTiles()).toEqual([]);
		expect(server.uploads).toHaveLength(3);
		expect(tiles()).toHaveLength(5);
	});

	it('🔴 D-W52-38 · U-65.6 (negative): before a byte leaves, each file is checked on the device — another type, more than 10 MB, fewer than 800 × 600 pixels, a file that only claims to be a picture — each named with the page’s own words, and none of them is sent', async () => {
		const server = serve();
		open();
		await settled();
		const heavy = photo('heavy.jpg');
		Object.defineProperty(heavy, 'size', { value: 10 * 1024 * 1024 + 1 });
		await pick(
			photo('scan.gif', 'image/gif'),
			photo('phone.heic', 'image/heic'),
			heavy,
			photo('tiny.png', 'image/png'),
			photo('broken.jpg'),
			photo('<img src=x onerror=alert(1)>.svg', 'image/svg+xml')
		);
		await waitFor(() => expect(screen.getAllByTestId('doctor-photos-rejected')).toHaveLength(6));
		expect(
			screen
				.getAllByTestId('doctor-photos-rejected')
				.map((line) => line.textContent?.replace(/\s+/gu, ' ').trim())
		).toEqual([
			'scan.gif Ανεβάστε JPG, PNG ή WebP.',
			'phone.heic Ανεβάστε JPG, PNG ή WebP.',
			'heavy.jpg Πολύ μεγάλο αρχείο: έως 10 MB.',
			'tiny.png Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.',
			'broken.jpg Ανεβάστε JPG, PNG ή WebP.',
			'<img src=x onerror=alert(1)>.svg Ανεβάστε JPG, PNG ή WebP.'
		]);
		// A file's name is the person's text: text, never an element.
		expect(screen.getByTestId('doctor-photos-notices').querySelector('img')).toBeNull();
		expect(uploadTiles()).toEqual([]);
		expect(server.uploads).toEqual([]);
		expect(server.callsOf('POST')).toEqual([]);
		// The next choice starts clean.
		await pick(photo('good.jpg'));
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		expect(screen.queryByTestId('doctor-photos-rejected')).toBeNull();
	});

	it('🔴 D-W52-29: never more than fit under the 20 — with 18 stored, of four picked two are sent and the page says «Έως 20 φωτογραφίες.»; a file refused by the check takes no place', async () => {
		const server = serve({ count: 18 });
		open();
		await settled();
		await pick(
			photo('scan.gif', 'image/gif'),
			photo('a.jpg'),
			photo('b.jpg'),
			photo('c.jpg'),
			photo('d.jpg')
		);
		await waitFor(() => expect(uploadTiles()).toHaveLength(2));
		expect(await screen.findByTestId('doctor-photos-full')).toHaveTextContent(
			'Έως 20 φωτογραφίες.'
		);
		expect(screen.queryByTestId('doctor-photos-add')).toBeNull();
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		server.uploads[0].store();
		await waitFor(() => expect(server.uploads).toHaveLength(2));
		server.uploads[1].store();
		await waitFor(() => expect(tiles()).toHaveLength(20));
		expect(server.uploads).toHaveLength(2);
		expect(screen.queryByTestId('doctor-photos-add')).toBeNull();
	});

	it('🔴 D-W52-38: the server checks again, and its refusals read as the SAME words — too small, too heavy (`422` and `413`), not a picture: «Δεν ανέβηκε» with the reason and «×» alone (the same file can never pass)', async () => {
		const server = serve();
		open();
		await settled();
		const cases: [number, string, string][] = [
			[
				422,
				'Validation Error: IMAGE_TOO_SMALL',
				'Πολύ μικρή φωτογραφία: χρειάζεται τουλάχιστον 800 × 600.'
			],
			[
				422,
				'Validation Error: file size exceeds 10485760 bytes.',
				'Πολύ μεγάλο αρχείο: έως 10 MB.'
			],
			[413, 'Request body is too large', 'Πολύ μεγάλο αρχείο: έως 10 MB.'],
			[
				422,
				'Validation Error: file mimeType "image/gif" is not allowed.',
				'Ανεβάστε JPG, PNG ή WebP.'
			]
		];
		for (const [index, [status, errorMessage, words]] of cases.entries()) {
			await pick(photo(`photo-${index}.jpg`));
			await waitFor(() => expect(server.uploads).toHaveLength(index + 1));
			server.uploads[index].refuse(status, { errorCode: `EC${status}`, errorMessage });
			await waitFor(() => expect(uploadTiles().at(-1)).toHaveAttribute('data-status', 'failed'));
			const tile = uploadTiles().at(-1) as HTMLElement;
			expect(tile, errorMessage).toHaveTextContent('Δεν ανέβηκε');
			expect(tile.querySelector('[data-slot="doctor-photo-upload-reason"]')).toHaveTextContent(
				words
			);
			expect(within(tile).queryByRole('button', { name: 'Ξανά' })).toBeNull();
			expect(within(tile).getByRole('button', { name: 'Αφαίρεση' })).toBeInTheDocument();
		}
		expect(tiles()).toHaveLength(4);
	});

	it('🔴 D-W52-29 (negative): the server says the 20 are reached (`409`) — that photo and those still waiting leave, the page says «Έως 20 φωτογραφίες.» and reads the list again', async () => {
		const server = serve();
		open();
		await settled();
		await pick(photo('a.jpg'), photo('b.jpg'), photo('c.jpg'));
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		server.uploads[0].refuse(409, {
			errorCode: 'EC415',
			errorMessage: 'Already exist: DOCTOR_IMAGE_LIMIT_REACHED',
			details: { limit: 20 }
		});
		expect(await screen.findByTestId('doctor-photos-full')).toHaveTextContent(
			'Έως 20 φωτογραφίες.'
		);
		await waitFor(() => expect(uploadTiles()).toEqual([]));
		expect(server.uploads).toHaveLength(1);
		await waitFor(() => expect(server.callsOf('GET')).toHaveLength(2));
	});

	it('🔴 U-65.6 (negative): the session ends while a photo is sent (`401`) — it ends on the page once, nothing more is sent, and what waited can be sent again', async () => {
		const server = serve();
		const expire = vi.fn();
		open({ session: member(expire) });
		await settled();
		await pick(photo('a.jpg'), photo('b.jpg'));
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		server.uploads[0].refuse(401, { errorCode: 'EC401', errorMessage: 'Unauthorized' });
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
		await waitFor(() =>
			expect(uploadTiles().map((tile) => tile.dataset.status)).toEqual(['failed', 'failed'])
		);
		expect(server.uploads).toHaveLength(1);
		for (const tile of uploadTiles()) {
			expect(within(tile).getByRole('button', { name: 'Ξανά' })).toBeInTheDocument();
		}
	});

	it('🔴 U-206: without photos — «Προσθέστε φωτογραφίες», what to start with, «Προσθήκη φωτογραφιών» and the limits; no order to change, nothing about the office yet', async () => {
		serve({ count: 0 });
		open();
		await settled();
		const empty = screen.getByTestId('doctor-photos-empty');
		expect(empty).toHaveTextContent('Προσθέστε φωτογραφίες');
		expect(empty).toHaveTextContent(
			'Πρώτα μια καθαρή φωτογραφία του προσώπου σας: είναι αυτή που βλέπουν πρώτη οι ασθενείς. Μετά, ό,τι δείχνει τη δουλειά σας.'
		);
		const add = within(empty).getByRole('button', { name: 'Προσθήκη φωτογραφιών' });
		expect(add).toBe(screen.getByTestId('doctor-photos-add'));
		expect(screen.queryByTestId('doctor-photos-grid')).toBeNull();
		expect(screen.queryByTestId('doctor-photos-lead')).toBeNull();
		const hint = screen.getByTestId('doctor-photos-hint');
		expect(hint.textContent?.trim()).toBe(
			'Έως 20 φωτογραφίες · JPG, PNG ή WebP · έως 10 MB η καθεμία.'
		);
		expect(screen.queryByTestId('doctor-photos-foot')).toBeNull();
	});

	it('the first photo of an empty page: its tile takes the grid’s place while it is sent, and it is the main one once stored', async () => {
		const server = serve({ count: 0 });
		open();
		await settled();
		await pick(photo('face.jpg'));
		await waitFor(() => expect(uploadTiles()).toHaveLength(1));
		expect(screen.queryByTestId('doctor-photos-empty')).toBeNull();
		await waitFor(() => expect(server.uploads).toHaveLength(1));
		server.uploads[0].store();
		await waitFor(() => expect(tiles()).toHaveLength(1));
		expect(tiles()[0]).toHaveAttribute('data-main');
	});

	it('the wait draws no photo; a read without an answer says so with «Δοκιμάστε ξανά», which asks again', async () => {
		const server = serve();
		server.refuse('GET', '/doctor/profile/images', 500);
		server.refuse('GET', '/doctor/profile/images', 500);
		open();
		expect(screen.getByTestId('doctor-photos-loading')).toHaveAttribute('aria-busy', 'true');
		expect(screen.queryByTestId('doctor-photos-grid')).toBeNull();
		await settled('failed');
		expect(screen.getByTestId('doctor-photos-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τη σελίδα. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await userEvent.setup({ delay: null }).click(screen.getByTestId('doctor-photos-retry'));
		await settled('ready');
		expect(tiles()).toHaveLength(4);
	});

	it('🔴 U-65.6 (negative): a session the server no longer knows (`401`) ends on the page; a refusal of the licence (`403`) does not', async () => {
		for (const [status, ended] of [
			[401, 1],
			[403, 0]
		] as const) {
			const server = serve();
			server.refuse('GET', '/doctor/profile/images', status);
			const expire = vi.fn();
			const view = open({ session: member(expire) });
			await settled('failed');
			expect(expire, String(status)).toHaveBeenCalledTimes(ended);
			view.unmount();
		}
	});

	it('🔴 U-65.6 (negative): what the server names is drawn as text — words with markup make no element; an address that is no address draws no picture, and the photo can still be deleted', async () => {
		const server = samplePhotoServer();
		const hostile = async (input: string, init?: RequestInit) => {
			const answer = await server.fetch(input, init);
			if ((init?.method ?? 'GET') !== 'GET') return answer;
			const body = (await answer.json()) as { data: Record<string, unknown>[] };
			body.data[1] = {
				...body.data[1],
				mediumSizeUrl: 'javascript:alert(1)',
				translations: [
					{
						id: 'x',
						language: 'el',
						alt: '<b>Ελένη</b><script>alert(1)</script>',
						metaDescription: null
					}
				]
			};
			return new Response(JSON.stringify(body), { status: 200 });
		};
		vi.stubGlobal('fetch', vi.fn(hostile));
		open();
		await settled();
		const second = tiles()[1];
		expect(second.querySelector('img')).toBeNull();
		expect(second.querySelector('[data-slot="doctor-photo-missing"]')).not.toBeNull();
		expect(second.querySelector('b, script')).toBeNull();
		expect(handle(B)).toHaveAccessibleName('<b>Ελένη</b><script>alert(1)</script>');
		expect(screen.getByTestId('doctor-photo-menu-2')).toBeInTheDocument();
		// A picture that does not load reads as no picture too.
		const first = tiles()[0].querySelector('img') as HTMLImageElement;
		await fireEvent.error(first);
		expect(tiles()[0].querySelector('img')).toBeNull();
	});

	it('(negative, U-100 · U-112) nothing takes a colour under the pointer, and the menu’s choices stand one under the other', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		await settled();
		for (const node of [handle(A), screen.getByTestId('doctor-photos-add')]) {
			expect(node.className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		}
		const menu = await menuOf(user, 2);
		expect(menu.className).not.toMatch(/flex-row|grid-cols/u);
	});

	it('the page’s language: the same page in English', async () => {
		serve();
		open({ locale: 'en' });
		await settled();
		expect(screen.getByRole('heading', { level: 2, name: 'Photos' })).toBeInTheDocument();
		expect(tiles()[0].querySelector('[data-slot="doctor-photo-main"]')).toHaveTextContent('Main');
		expect(handle(B)).toHaveAccessibleName('Eleni Pappa, photo 2');
		expect(screen.getByTestId('doctor-photos-add')).toHaveTextContent('Add');
		expect(screen.getByTestId('doctor-photos-foot')).toHaveTextContent(
			'The photos of the practice go to each practice, in Practice settings.'
		);
	});

	it('🔴 D-W52-37α · U-81.2: «⋯» of a photo is two buttons, each only at its widths — below 744 the one that opens the page’s sheet from the bottom, from 744 the one of the small menu on the photo; both 48 × 48 with the same name', async () => {
		serve();
		open();
		await settled();
		for (const position of [1, 2, 3, 4]) {
			const phone = screen.getByTestId(`doctor-photo-menu-phone-${position}`);
			const wide = screen.getByTestId(`doctor-photo-menu-${position}`);
			expect(phone).toHaveClass('tablet:hidden', 'size-touch');
			expect(phone).not.toHaveClass('hidden');
			expect(phone).toHaveAttribute('aria-haspopup', 'dialog');
			expect(phone).toHaveAccessibleName(`Επιλογές φωτογραφίας ${position}`);
			expect(wide).toHaveClass('hidden', 'tablet:inline-flex', 'size-touch');
			expect(wide).toHaveAttribute('aria-haspopup', 'menu');
			expect(wide).toHaveAccessibleName(`Επιλογές φωτογραφίας ${position}`);
			expect(phone.className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		}
		// Nothing is open until one is pressed.
		expect(screen.queryByRole('dialog')).toBeNull();
		expect(screen.queryByRole('menu')).toBeNull();
	});

	it('🔴 D-W52-37α · U-81.2: below 744 «⋯» opens a SHEET from the bottom (the kit’s, as the application’s) with the same three of the menu, one under the other — «Κάντε την κύρια» · «Προσαρμογή» · «Διαγραφή»; the first photo has no «Κάντε την κύρια»; «Προσαρμογή» is a link to its own page (U-102)', async () => {
		const user = userEvent.setup({ delay: null });
		serve();
		open();
		await settled();
		await user.click(screen.getByTestId('doctor-photo-menu-phone-2'));
		const sheet = await screen.findByTestId('doctor-photo-sheet');
		expect(sheet).toHaveAttribute('role', 'dialog');
		expect(sheet).toHaveAttribute('data-slot', 'bottom-sheet');
		expect(sheet).toHaveAttribute('data-direction', 'bottom');
		expect(sheet).toHaveAccessibleName('Επιλογές φωτογραφίας 2');
		// From 744 the sheet is not drawn: the menu on the photo is that width's.
		expect(sheet).toHaveClass('bottom-0', 'tablet:hidden');
		// It is no menu on the photo: the small menu stays closed.
		expect(screen.queryByRole('menu')).toBeNull();
		const rows = [...sheet.querySelectorAll('li')].map(
			(row) => row.firstElementChild as HTMLElement
		);
		expect(rows.map((row) => row.textContent?.trim())).toEqual([
			'Κάντε την κύρια',
			'Προσαρμογή',
			'Διαγραφή'
		]);
		// U-112: one under the other, never side by side; each a full row of at least a touch.
		const list = sheet.querySelector('ul') as HTMLElement;
		expect(list).toHaveClass('flex', 'flex-col');
		expect(list.className).not.toMatch(/\bgrid\b|flex-row|flex-wrap/u);
		for (const row of rows) {
			expect(row).toHaveClass('min-h-row', 'w-full');
			expect(row.className).not.toMatch(/(?:^|\s)(?:can-hover:)?hover:/u);
		}
		const [, crop, remove] = rows;
		expect(crop.tagName).toBe('A');
		expect(crop).toHaveAttribute('href', `/doctor/profile/photos/${B}/crop`);
		expect(remove).toHaveClass('text-accent');
		await user.keyboard('{Escape}');
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-sheet')).toBeNull());

		await user.click(screen.getByTestId('doctor-photo-menu-phone-1'));
		const first = await screen.findByTestId('doctor-photo-sheet');
		expect(first).toHaveAccessibleName('Επιλογές φωτογραφίας 1');
		expect([...first.querySelectorAll('li')].map((row) => row.textContent?.trim())).toEqual([
			'Προσαρμογή',
			'Διαγραφή'
		]);
		expect(within(first).getByTestId('doctor-photo-sheet-crop')).toHaveAttribute(
			'href',
			`/doctor/profile/photos/${A}/crop`
		);
	});

	it('🔴 D-W52-37α · D-W52-31: «Κάντε την κύρια» of the sheet closes it and is the SAME one `PUT order` as the menu’s — that photo first, every other once', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		await user.click(screen.getByTestId('doctor-photo-menu-phone-3'));
		await user.click(await screen.findByTestId('doctor-photo-sheet-make-main'));
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-sheet')).toBeNull());
		await shows([C, A, B, D]);
		await waitFor(() =>
			expect(server.callsOf('PUT')).toEqual([
				['/doctor/profile/images/order', { imageIds: [C, A, B, D] }]
			])
		);
		expect(screen.getByTestId('doctor-photos-live')).toHaveTextContent(
			'Η φωτογραφία πήγε στη θέση 1 από 4.'
		);
	});

	it('🔴 D-W52-37α · U-206: «Διαγραφή» of the sheet closes it and ALWAYS asks, for the photo it was pressed on — nothing is deleted before «Διαγραφή» of the question; «Άκυρο» deletes nothing', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		await user.click(screen.getByTestId('doctor-photo-menu-phone-2'));
		await user.click(await screen.findByTestId('doctor-photo-sheet-delete'));
		const dialog = await screen.findByTestId('doctor-photo-delete-dialog');
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-sheet')).toBeNull());
		expect(within(dialog).getByTestId('doctor-photo-delete-body')).toHaveTextContent(
			'Φεύγει από τη σελίδα σας και από την αναζήτηση.'
		);
		expect(server.callsOf('DELETE')).toEqual([]);
		await user.click(within(dialog).getByTestId('doctor-photo-delete-cancel'));
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-delete-dialog')).toBeNull());
		expect(server.callsOf('DELETE')).toEqual([]);
		await shows([A, B, C, D]);

		await user.click(screen.getByTestId('doctor-photo-menu-phone-2'));
		await user.click(await screen.findByTestId('doctor-photo-sheet-delete'));
		await user.click(await screen.findByTestId('doctor-photo-delete-confirm'));
		await waitFor(() =>
			expect(server.callsOf('DELETE')).toEqual([[`/doctor/profile/images/${B}`, {}]])
		);
		await shows([A, C, D]);
	});

	it('🔴 D-W52-37α (negative): the sheet is the page’s ONE, opened for the photo pressed — a photo that went away meanwhile takes its sheet with it: no row is left that could act on another', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { client } = open();
		await settled();
		await user.click(screen.getByTestId('doctor-photo-menu-phone-4'));
		const sheet = await screen.findByTestId('doctor-photo-sheet');
		expect(document.body.querySelectorAll('[data-testid="doctor-photo-sheet"]')).toHaveLength(1);
		// The photo is deleted elsewhere and the list is read again while the sheet is open.
		client.setQueryData(
			['doctor-dashboard', 'profile', 'images'],
			(list: { id: string }[] | undefined) => (list ?? []).filter((image) => image.id !== D)
		);
		await shows([A, B, C]);
		await waitFor(() => expect(screen.queryByTestId('doctor-photo-sheet')).toBeNull());
		expect(sheet).not.toBeInTheDocument();
		expect(screen.queryByTestId('doctor-photo-delete-dialog')).toBeNull();
		expect(server.callsOf('DELETE')).toEqual([]);
		expect(server.callsOf('PUT')).toEqual([]);
	});
});
