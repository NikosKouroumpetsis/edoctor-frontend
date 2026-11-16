import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { resetServerClock } from '$shared/lib/server-clock';
import { TODAY_NOW } from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import type { DoctorPatientsAddress } from '$modules/doctor-dashboard/lib/paths';
import Harness from './patients.harness.svelte';

/*
 * Wave 5.1 · screen 73 «Οι ασθενείς μου» (D-W51-73, D-W51-74): the list with the server stubbed at `fetch` (the module's
 * precedent), «now» the prototype's Saturday 14 November 2026, 12:40 Athens. Made-up people and ids only.
 */

const id = (n: number) => `0193d000-0000-7000-8000-${String(n).padStart(12, '0')}`;
const person = (
	n: number,
	firstName: string,
	lastName: string,
	patch: Record<string, unknown> = {}
) => ({
	key: { kind: 'account', id: id(n) },
	person: { kind: 'ACCOUNT', patientId: id(n), relativeId: null },
	firstName,
	lastName,
	phone: '306977654321',
	email: null,
	hasAccount: true,
	bookedBy: null,
	next: null,
	visits: { count: 2, firstAt: null, lastAt: '2026-11-13T16:00:00.000Z' },
	noShows: 0,
	...patch
});
const NIKOS = person(1, 'Νίκος', 'Μαυρίδης', {
	key: { kind: 'relative', id: id(11) },
	person: { kind: 'ACCOUNT', patientId: id(1), relativeId: id(11) },
	next: { startTime: '2026-11-14T15:30:00.000Z', status: 'pending' },
	visits: { count: 0, firstAt: null, lastAt: null },
	bookedBy: { firstName: 'Ελένη', lastName: 'Μαυρίδη', relationship: 'CHILD' }
});
const IOANNA = person(2, 'Ιωάννα', 'Καρρά', {
	next: { startTime: '2026-11-16T09:00:00.000Z', status: 'booked' },
	visits: { count: 4, firstAt: null, lastAt: '2026-10-22T08:00:00.000Z' }
});
const ZERVA = person(3, 'Καλλιόπη', 'Ζέρβα', {
	key: { kind: 'record', id: id(3) },
	person: { kind: 'RECORD', recordId: id(3) },
	hasAccount: false,
	visits: { count: 1, firstAt: null, lastAt: '2026-11-02T16:00:00.000Z' }
});

type Page = { items: unknown[]; nextCursor: string | null };
let pages: Record<string, Page> = {};
let reads: URL[] = [];

function serve(next: Record<string, Page>) {
	pages = next;
	reads = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			const url = new URL(String(input));
			reads.push(url);
			const at = `${url.searchParams.get('q') ?? ''}|${url.searchParams.get('cursor') ?? ''}`;
			const data = pages[at] ?? { items: [], nextCursor: null };
			return new Response(JSON.stringify({ status: 'success', message: '', data }), {
				status: 200
			});
		})
	);
}

const links = {
	menu: '/doctor/menu',
	card: (key: { kind: string; id: string }) => `/doctor/patients/${key.kind}/${key.id}`,
	newAppointment: '/doctor/appointments/new'
};

function open(address: DoctorPatientsAddress = { view: 'list' }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});
	return render(Harness, { props: { client, address, links } });
}

const wideScreen = (matches: boolean) =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
const page = () => screen.getByTestId('doctor-patients');
const settled = (view: string) => waitFor(() => expect(page()).toHaveAttribute('data-view', view));
const rowLinks = () => within(screen.getByTestId('doctor-patients-list')).getAllByRole('link');
const split = () => screen.getByTestId('doctor-patients-split');

type Observed = { callback: IntersectionObserverCallback; node: Element };
let observed: Observed[] = [];

beforeEach(() => {
	vi.useFakeTimers({ shouldAdvanceTime: true, now: TODAY_NOW });
	resetServerClock();
	wideScreen(false);
	observed = [];
	vi.stubGlobal(
		'IntersectionObserver',
		class {
			constructor(private callback: IntersectionObserverCallback) {}
			observe(node: Element) {
				observed.push({ callback: this.callback, node });
			}
			disconnect() {}
		}
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe('screen 73 «Οι ασθενείς μου», the list (D-W51-74)', () => {
	it('the title, its line, the search; the 55’s rows one under the other (U-112: γραμμές) in the server’s order — each a link to its card', async () => {
		serve({ '|': { items: [NIKOS, IOANNA, ZERVA], nextCursor: null } });
		open();
		await settled('ready');
		expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Οι ασθενείς μου');
		expect(screen.getByTestId('doctor-patients-lead')).toHaveTextContent(
			'Όσοι έκλεισαν ή ζήτησαν ραντεβού μαζί σας, και όσους προσθέσατε εσείς.'
		);
		const search = screen.getByTestId('doctor-patients-search');
		expect(search).toHaveAttribute('placeholder', 'Όνομα, επώνυμο ή κινητό');
		expect(search).toHaveAttribute('maxlength', '40');
		const list = screen.getByTestId('doctor-patients-list');
		expect(list).toHaveAttribute('data-look', 'lines');
		// Every word its own line (a text node of its own): the initials, the name, the lines, the quiet word.
		const words = (link: HTMLElement) =>
			[...link.querySelectorAll('span')]
				.filter((span) => span.children.length === 0)
				.map((span) => span.textContent?.trim())
				.filter(Boolean)
				.join(' ');
		expect(rowLinks().map((link) => [link.getAttribute('href'), words(link)])).toEqual([
			[
				`/doctor/patients/relative/${id(11)}`,
				'ΝΜ Νίκος Μαυρίδης Αίτημα · σήμερα, 17:30 Το κλείνει: Ελένη Μαυρίδη (γονέας)'
			],
			[
				`/doctor/patients/account/${id(2)}`,
				'ΙΚ Ιωάννα Καρρά Επόμενο: Δευτέρα 16 Νοεμβρίου, 11:00 · 4 επισκέψεις'
			],
			[
				`/doctor/patients/record/${id(3)}`,
				'ΚΖ Καλλιόπη Ζέρβα 1 επίσκεψη · τελευταία 2 Νοεμβρίου Χωρίς λογαριασμό eDoctor'
			]
		]);
		// The server's own read: no words, a page of 20, the doctor named by the session alone.
		expect(reads[0]?.pathname).toMatch(/\/appointment\/doctor\/patients$/u);
		expect(reads[0]?.searchParams.get('limit')).toBe('20');
		expect(reads[0]?.searchParams.has('q')).toBe(false);
		// The end of the list says nothing when the server has no more.
		expect(screen.queryByTestId('doctor-patients-more')).toBeNull();
	});

	it('the search: quiet a moment, cut at 40 (U-65.6); nobody found «Κανένας ασθενής σας με «…».»; cleared, every patient again', async () => {
		serve({
			'|': { items: [NIKOS, IOANNA], nextCursor: null },
			'697|': { items: [ZERVA], nextCursor: null }
		});
		open();
		await settled('ready');
		const search = screen.getByTestId('doctor-patients-search');
		await fireEvent.input(search, { target: { value: '697' } });
		await vi.advanceTimersByTimeAsync(400);
		await waitFor(() => expect(rowLinks()).toHaveLength(1));
		expect(rowLinks()[0]).toHaveTextContent('Καλλιόπη Ζέρβα');
		expect(reads.at(-1)?.searchParams.get('q')).toBe('697');
		await fireEvent.input(search, { target: { value: 'ξυζ' } });
		await vi.advanceTimersByTimeAsync(400);
		await settled('none');
		expect(screen.getByTestId('doctor-patients-none')).toHaveTextContent(
			'Κανένας ασθενής σας με «ξυζ».'
		);
		// (negative, U-65.6) a long paste reaches the server as 40 at most.
		await fireEvent.input(search, { target: { value: 'α'.repeat(60) } });
		await vi.advanceTimersByTimeAsync(400);
		await waitFor(() => expect(reads.at(-1)?.searchParams.get('q')?.length).toBe(40));
	});

	it('σελίδες: «Οι υπόλοιποι φορτώνουν καθώς κυλάτε.» while the server has more; the end nearing the screen reads the next page by its cursor', async () => {
		serve({
			'|': { items: [NIKOS, IOANNA], nextCursor: 'c2' },
			'|c2': { items: [ZERVA], nextCursor: null }
		});
		open();
		await settled('ready');
		expect(screen.getByTestId('doctor-patients-more')).toHaveTextContent(
			'Οι υπόλοιποι φορτώνουν καθώς κυλάτε.'
		);
		const end = observed.at(-1);
		end?.callback(
			[{ isIntersecting: true } as IntersectionObserverEntry],
			{} as IntersectionObserver
		);
		await waitFor(() => expect(rowLinks()).toHaveLength(3));
		expect(reads.at(-1)?.searchParams.get('cursor')).toBe('c2');
		expect(screen.queryByTestId('doctor-patients-more')).toBeNull();
	});

	it('κενή: «Δεν έχετε ακόμη ασθενείς», its words and «Νέο ραντεβού» (screen 72, one step on) — no search, no rows', async () => {
		serve({});
		open();
		await settled('empty');
		const empty = screen.getByTestId('doctor-patients-empty');
		expect(empty).toHaveTextContent('Δεν έχετε ακόμη ασθενείς');
		expect(empty).toHaveTextContent(
			'Όταν κάποιος κλείσει ή ζητήσει ραντεβού μαζί σας, θα τον βρείτε εδώ. Μπορείτε και εσείς να κλείσετε ραντεβού σε ασθενή που σας τηλεφωνεί.'
		);
		expect(screen.queryByTestId('doctor-patients-search')).toBeNull();
		await userEvent.click(screen.getByTestId('doctor-patients-empty-new'));
		expect(vi.mocked(goto)).toHaveBeenCalledWith('/doctor/appointments/new', {
			state: { doctorAppointment: { depth: 1 } }
		});
	});

	it('a read that failed: its words and «Δοκιμάστε ξανά»', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(JSON.stringify({ status: 'error', message: 'x' }), { status: 500 })
			)
		);
		open();
		await waitFor(() => expect(page()).toHaveAttribute('data-view', 'failed'), { timeout: 4000 });
		expect(screen.getByTestId('doctor-patients-error')).toHaveTextContent(
			'Δεν μπορέσαμε να φορτώσουμε τους ασθενείς σας.'
		);
	});
});

describe('🔴 D-W51-73 · split 1128 / 950 / 402', () => {
	it('1128: the first patient opens beside the list in place (67’s way); its row chosen; two columns', async () => {
		wideScreen(true);
		serve({ '|': { items: [NIKOS, IOANNA], nextCursor: null } });
		open();
		await settled('ready');
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/relative/${id(11)}`, {
				replaceState: true,
				noScroll: true,
				keepFocus: true
			})
		);
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveClass('laptop:grid', 'laptop:grid-split');
	});

	it('1128 with a card open: the list beside it, its row filled and `aria-current`; a press opens another in place (no step of the history)', async () => {
		wideScreen(true);
		serve({ '|': { items: [NIKOS, IOANNA], nextCursor: null } });
		open({ view: 'card', key: { kind: 'account', id: id(2) }, step: null });
		await settled('ready');
		expect(split()).toHaveAttribute('data-open');
		expect(screen.getByTestId('pane')).toHaveTextContent(`account:${id(2)}`);
		expect(rowLinks()[1]).toHaveAttribute('aria-current', 'page');
		expect(rowLinks()[1]?.closest('li')?.className).toContain('laptop:bg-chip');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		await userEvent.click(rowLinks()[0] as HTMLElement);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/relative/${id(11)}`, {
			noScroll: true,
			keepFocus: true
		});
	});

	it('950 / 402: ONE column — nothing opens by itself; a row opens the card one step on (its «‹» comes back to the list); «‹» to «Μενού» only below 744', async () => {
		serve({ '|': { items: [NIKOS, IOANNA], nextCursor: null } });
		open();
		await settled('ready');
		expect(split()).toHaveAttribute('data-solo');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		const back = screen.getByTestId('doctor-patients-back');
		expect(back).toHaveAttribute('href', '/doctor/menu');
		expect(back.className).toContain('tablet:hidden');
		await userEvent.click(rowLinks()[1] as HTMLElement);
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/doctor/patients/account/${id(2)}`, {
			state: { doctorPatient: { depth: 1 } }
		});
	});
});
