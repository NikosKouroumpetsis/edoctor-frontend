import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { Session } from '$shared/state/session';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	sampleDoctorServiceId,
	sampleServicesServer,
	sampleServicesView
} from '$modules/doctor-dashboard/api/services/services.sample';
import Harness from './services.harness.svelte';

/*
 * Wave 5.2 · screen 83 «Υπηρεσίες και τιμές» (U-212, D-W52-81): the list with the server stubbed at `fetch` (the
 * module's precedent) — the doctor's order, the rows, the order changed by a drag or the arrows in ONE call, a refusal
 * put back, «Προσθήκη υπηρεσίας».
 */

const [A, B, C, D] = [1, 2, 3, 4].map(sampleDoctorServiceId);
const ORDER = '/doctor-service/doctor-services/order';

function serve(start: Parameters<typeof sampleServicesServer>[0] = {}) {
	const server = sampleServicesServer(start);
	vi.stubGlobal('fetch', vi.fn(server.fetch));
	return server;
}

function open(options: { session?: Session; locale?: 'el' | 'en' } = {}) {
	const client = new QueryClient({
		defaultOptions: { queries: { retryDelay: 0, gcTime: Infinity } }
	});
	const view = render(Harness, { props: { client, ...options } });
	return { client, ...view };
}

const settled = () =>
	waitFor(() =>
		expect(screen.getByTestId('doctor-services')).toHaveAttribute('data-view', 'ready')
	);
const plain = (text: string | null | undefined) => (text ?? '').replace(/\u00a0/gu, ' ').trim();
const rowsRead = () =>
	[...screen.getByTestId('doctor-services-list').querySelectorAll('li')].map((row) =>
		plain(row.textContent).replace(/\s+/gu, ' ')
	);
const handle = (id: string) => screen.getByTestId(`doctor-service-${id}`);
/** jsdom lays nothing out: every row is given the box of its place in the list (72 high, one column). */
function layOut() {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
		this: HTMLElement
	) {
		const row = this.closest<HTMLElement>('[data-service-id]');
		const index = row ? [...(row.parentElement?.children ?? [])].indexOf(row) : -1;
		const top = index < 0 ? -1000 : index * 72;
		return { left: 0, top, right: 400, bottom: top + 72, width: 400, height: 72 } as DOMRect;
	});
}
/** Whether the row's own handler kept a click from opening the link (jsdom then navigates nowhere either way). */
function clickPrevented(node: Element): boolean {
	let prevented = false;
	const spy = (event: Event) => {
		prevented = event.defaultPrevented;
		event.preventDefault();
	};
	document.addEventListener('click', spy);
	node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	document.removeEventListener('click', spy);
	return prevented;
}
const pointer = (type: string, node: Element, x: number, y: number) =>
	fireEvent(node, new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
const member = (expire = vi.fn()) =>
	new Session({
		status: () => 'member',
		member: () => ({ firstName: 'Ελένη' }),
		signOut: async () => undefined,
		expire
	});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('«Υπηρεσίες και τιμές» of the doctor (wave 5.2 · screen 83)', () => {
	it('🔴 U-212.1 · D-W52-81: the title, the lead, and every service a row «τίτλος · διάρκεια · τιμή» in the DOCTOR’s order, each a link to its own page — from 60 in hours (D-W52-10)', async () => {
		serve();
		open();
		await settled();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Υπηρεσίες και τιμές');
		expect(screen.getByTestId('doctor-services-lead')).toHaveTextContent(
			'Ό,τι κλείνουν οι ασθενείς, με τη διάρκεια και την τιμή του.'
		);
		expect(rowsRead()).toEqual([
			'Απλή επίσκεψη 30′ · 60 €',
			'Επανεξέταση 20′ · 45 €',
			'Ηλεκτροκαρδιογράφημα 20′ · 30 €',
			'Υπέρηχος καρδιάς 1 ώρα 30′ · 80 €'
		]);
		expect(handle(A)).toHaveAttribute('href', `/doctor/profile/services/${A}`);
		expect(handle(A)).toHaveAttribute('draggable', 'false');
		expect(screen.getByTestId('doctor-services-list').tagName.toLowerCase()).toBe('ul');
		expect(screen.getByTestId('doctor-services-list').className).not.toMatch(
			/\bgrid\b|flex-row|flex-wrap/u
		);
		// U-214.2: no word about empty texts, anywhere.
		expect(screen.getByTestId('doctor-services').textContent).not.toMatch(
			/eDoctor|χωρίς περιγραφή/iu
		);
		expect(screen.getByTestId('doctor-services-hint')).toHaveTextContent(
			'Οι τρεις πρώτες φαίνονται πρώτες στη σελίδα σας.'
		);
		expect(screen.getByTestId('doctor-services-foot')).toHaveTextContent(
			'Τιμή για έναν συγκεκριμένο ασθενή αλλάζει στο ίδιο το ραντεβού, στο «Υπηρεσίες και κόστος».'
		);
		// U-100: no colour under the pointer on the rows and «Προσθήκη υπηρεσίας» (the kit's «‹» is the kit's own).
		const list = screen.getByTestId('doctor-services-list');
		const add = screen.getByTestId('doctor-services-add');
		for (const node of [list, ...list.querySelectorAll('*'), add, ...add.querySelectorAll('*')]) {
			expect([...node.classList].filter((name) => name.includes('hover:'))).toEqual([]);
		}
	});

	it('🔴 D-W52-81: «Προσθήκη υπηρεσίας» opens the catalogue (a page, never a window) — and goes once the doctor offers every service of it', async () => {
		const server = serve();
		const first = open();
		await settled();
		const add = await screen.findByTestId('doctor-services-add');
		expect(add).toHaveAttribute('href', '/doctor/profile/services/new');
		expect(add).toHaveTextContent('Προσθήκη υπηρεσίας');
		expect(screen.queryByRole('dialog')).toBeNull();
		first.unmount();
		server.plant('GET', '/allowed-services', {
			status: 200,
			data: [
				{
					id: sampleServicesView()[0].serviceId,
					title: 'Απλή επίσκεψη',
					suggestedSubtitle: null,
					suggestedDescription: null,
					durationInMinutes: 30,
					owned: true
				}
			]
		});
		open();
		await settled();
		await waitFor(() => expect(screen.queryByTestId('doctor-services-add')).toBeNull());
	});

	it('🔴 D-W52-81 (the photos’ way, D-W52-39): ↓ / ↑ on a focused row move it a place — the order shows at once, ONE `PUT …/order` with every id, the focus stays, a reader hears where it went', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		const { client } = open();
		await settled();
		handle(A).focus();
		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(server.callsOf('PUT', ORDER)).toHaveLength(1));
		expect(server.callsOf('PUT', ORDER)[0].body).toEqual({ ids: [B, A, C, D] });
		expect(rowsRead()[1]).toMatch(/^Απλή επίσκεψη/u);
		expect(document.activeElement).toBe(handle(A));
		expect(screen.getByTestId('doctor-services-live')).toHaveTextContent(
			'Η υπηρεσία πήγε στη θέση 2 από 4.'
		);
		await waitFor(() => expect(server.titles()[1]).toBe('Απλή επίσκεψη'));
		// The first goes no higher: nothing is sent.
		handle(B).focus();
		await user.keyboard('{ArrowUp}');
		expect(server.callsOf('PUT', ORDER)).toHaveLength(1);
		// The write reads the lists of 70 / 72 again too.
		const spy = vi.spyOn(client, 'invalidateQueries');
		handle(A).focus();
		await user.keyboard('{ArrowUp}');
		await waitFor(() => expect(server.callsOf('PUT', ORDER)).toHaveLength(2));
		await waitFor(() =>
			expect(spy).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.servicesAll() })
		);
		expect(spy).toHaveBeenCalledWith({ queryKey: doctorDashboardQueryKeys.profile() });
	});

	it('🔴 D-W52-81: a drag — the row follows the pointer, the others take their places, ONE `PUT …/order` when it is let go; the click that ends it opens nothing; `Escape` puts it back', async () => {
		const server = serve();
		open();
		await settled();
		layOut();
		pointer('pointerdown', handle(A), 20, 30);
		pointer('pointermove', handle(A), 20, 31);
		expect(screen.getByTestId('doctor-service-row-1')).not.toHaveAttribute('data-lifted');
		pointer('pointermove', handle(A), 20, 160);
		await waitFor(() => expect(rowsRead()[2]).toMatch(/^Απλή επίσκεψη/u));
		expect(server.callsOf('PUT', ORDER)).toHaveLength(0);
		pointer('pointerup', handle(A), 20, 160);
		expect(clickPrevented(handle(A))).toBe(true);
		await waitFor(() => expect(server.callsOf('PUT', ORDER)).toHaveLength(1));
		expect(server.callsOf('PUT', ORDER)[0].body).toEqual({ ids: [B, C, A, D] });
		// A press that moves no farther than a click stays a click, sends nothing.
		pointer('pointerdown', handle(D), 20, 230);
		pointer('pointerup', handle(D), 21, 231);
		expect(clickPrevented(handle(D))).toBe(false);
		// `Escape` while lifted: as it was, nothing sent.
		pointer('pointerdown', handle(D), 20, 230);
		pointer('pointermove', handle(D), 20, 10);
		await waitFor(() => expect(rowsRead()[0]).toMatch(/^Υπέρηχος/u));
		fireEvent.keyDown(handle(D), { key: 'Escape' });
		await waitFor(() => expect(rowsRead()[3]).toMatch(/^Υπέρηχος/u));
		pointer('pointerup', handle(D), 20, 10);
		expect(server.callsOf('PUT', ORDER)).toHaveLength(1);
	});

	it('🔴 D-W52-81: a refused order is put back, said on the page and to a reader — and the list is read again (`DOCTOR_SERVICE_ORDER_MISMATCH`)', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		open();
		await settled();
		server.refuse('PUT', ORDER, 422, 'Validation Error: DOCTOR_SERVICE_ORDER_MISMATCH');
		handle(A).focus();
		await user.keyboard('{ArrowDown}');
		const failure = await screen.findByTestId('doctor-services-order-failure');
		expect(failure).toHaveTextContent(
			'Η σειρά δεν άλλαξε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(rowsRead()[0]).toMatch(/^Απλή επίσκεψη/u);
		expect(screen.getByTestId('doctor-services-live')).toHaveTextContent('Η σειρά δεν άλλαξε.');
		await waitFor(() =>
			expect(server.callsOf('GET', '/doctor-service/doctor-services').length).toBeGreaterThan(1)
		);
		// Too many writes: the page's own words.
		server.refuse('PUT', ORDER, 429, 'Too many requests');
		handle(A).focus();
		await user.keyboard('{ArrowDown}');
		await waitFor(() =>
			expect(screen.getByTestId('doctor-services-order-failure')).toHaveTextContent(
				'Πολλές προσπάθειες. Δοκιμάστε ξανά σε λίγο.'
			)
		);
		expect(rowsRead()[0]).toMatch(/^Απλή επίσκεψη/u);
	});

	it('the wait, a failed read with «Δοκιμάστε ξανά», and a session the server no longer knows (once)', async () => {
		const user = userEvent.setup({ delay: null });
		const server = serve();
		server.refuse('GET', '/doctor-service/doctor-services', 500);
		server.refuse('GET', '/doctor-service/doctor-services', 500);
		open();
		expect(screen.getByTestId('doctor-services')).toHaveAttribute('data-view', 'loading');
		await user.click(await screen.findByTestId('doctor-services-retry'));
		await settled();
		const expire = vi.fn();
		server.refuse('GET', '/doctor-service/doctor-services', 401, 'Unauthorized');
		open({ session: member(expire) });
		await waitFor(() => expect(expire).toHaveBeenCalledTimes(1));
	});

	it('🔴 U-65.6: a title of the server is a text node, never HTML; English on `/en`', async () => {
		const view = sampleServicesView();
		view[0] = { ...view[0], title: '<img src=x onerror=alert(1)>' };
		serve({ rows: view });
		open({ locale: 'en' });
		await settled();
		expect(
			within(screen.getByTestId('doctor-services-list')).getByText('<img src=x onerror=alert(1)>')
		).toBeInTheDocument();
		expect(screen.getByTestId('doctor-services-list').querySelector('img')).toBeNull();
		expect(screen.getByTestId('doctor-services-lead')).toHaveTextContent(
			'What patients book, with its length and its price.'
		);
	});
});
