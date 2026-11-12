import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { flushSync, type Component } from 'svelte';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import type { QueryClient } from '@tanstack/svelte-query';
import { resetPersonalQueries } from '$shared/query';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import type { Session, SessionStatus } from '$shared/state/session';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import type { AppointmentsScreenData } from '../types';
import HostedHarness from './hosted.harness.svelte';
import Harness from './screen.harness.svelte';

/*
 * Screens 50 + 51 composed (P-W4 §4.1, §4.2): the session, the person's appointments and their doctors read from a
 * stubbed API, the page's memory, the contact of screen 18. The server's «now» Tuesday 10 November 21:00 in Athens.
 * Made-up people and offices.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const A1 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
const A2 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5c';
const A3 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5d';

/** One appointment as the server answers it (`AppointmentResponseView`), a kept visit at Ερμού 101. */
const view = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'booked',
	bookedForType: 'SELF',
	relativeId: null,
	startTime: '2026-11-12T10:30:00.000Z',
	endTime: '2026-11-12T11:00:00.000Z',
	effectiveDurationInMinutes: 30,
	confirmationModeSnapshot: 'AUTO',
	confirmedAt: '2026-11-01T09:00:00.000Z',
	updatedAt: '2026-11-01T09:00:00.000Z',
	patientNote: null,
	finalTotalAmount: 140,
	officePhone: '+302103210101',
	patientSnapshot: {
		id: 'pat-1',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		email: 'patient@example.test'
	},
	officeSnapshot: {
		id: 'off-ermou',
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10555',
		state: 'Αττική',
		floor: 2,
		phone: '+302103210101',
		translations: []
	},
	serviceLines: [
		{
			doctorServiceId: 'svc-simple',
			isActive: true,
			serviceTitleSnapshot: 'Απλή επίσκεψη',
			durationInMinutesSnapshot: 30,
			lineGrossAmount: 140
		}
	],
	...extra
});

/** «Η κριτική σας» as the server answers it (`GET /appointment-rating/ratings/{ratingId}`), published, with a reply. */
const reviewView = {
	id: 'rat-1',
	appointmentId: '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b',
	doctorId: 'doc-maria',
	patientName: 'Ελένη',
	patientInitial: 'Π',
	overallRating: 4.9,
	comment: 'Πολύ προσεκτική εξέταση.',
	ratingModerationStatus: 'APPROVED',
	doctorReply: 'Σας ευχαριστώ.',
	doctorReplyAt: '2026-07-08T09:00:00.000Z',
	replyModerationStatus: 'APPROVED',
	createdAt: '2026-07-05T09:00:00.000Z',
	aspect: {
		inDepthRating: 5,
		trustRating: 5,
		expertiseRating: 5,
		punctualRating: 4.5,
		friendlyRating: 5
	}
};

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

type Call = { url: string; method: string; credentials?: RequestCredentials };
let calls: Call[];
let upcoming: ReturnType<typeof view>[];
/** «Ιστορικό»'s rows, when the test tells them apart from the upcoming ones (else the same answer). */
let history: ReturnType<typeof view>[] | null;
/** The doctors the public profile knows; anybody else answers as the first (the suite's one doctor). */
const DOCTORS: Record<string, { slug: string; fullName: string }> = {
	'doc-maria': { slug: 'dr-maria', fullName: 'Μαρία Τριανταφύλλου' },
	'doc-nikos': { slug: 'dr-nikos', fullName: 'Νίκος Αντωνίου' },
	'doc-anna': { slug: 'dr-anna', fullName: 'Άννα Βασιλείου' }
};
let detail: Record<string, unknown> | null;
/** An appointment whose answer waits until the test lets it go. */
let held: { id: string; wait: Promise<void>; release: () => void } | null;
/** Every read of the appointments answers 500. */
let down: boolean;
/** The answer of a write (`PATCH` / `POST`), when the test gives one. */
let written: (() => Response) | null;
/** What every write carried, in order. */
let bodies: unknown[];

function hold(id: string) {
	let release = () => {};
	const wait = new Promise<void>((resolve) => (release = resolve));
	held = { id, wait, release };
	return () => release();
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	bodies = [];
	held = null;
	down = false;
	written = null;
	history = null;
	upcoming = [view(A1), view(A2, { startTime: '2026-11-16T07:00:00.000Z' })];
	detail = {
		...view(A1),
		actions: { canCancel: true, canReschedule: true, cancellationCutoffHours: 24 }
	};
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			calls.push({ url: input, method: init.method ?? 'GET', credentials: init.credentials });
			const path = input.replace(/^.*\/api\/v1/u, '');
			if (down && path.startsWith('/appointment/appointments')) return json({}, 500);
			if (init.method === 'PATCH' || init.method === 'POST') {
				bodies.push(init.body ? JSON.parse(String(init.body)) : null);
			}
			if (written && (init.method === 'PATCH' || init.method === 'POST')) return written();
			if (path.startsWith('/appointment/appointments?')) {
				const items = history && path.includes('scope=history') ? history : upcoming;
				return json({ items, nextCursor: null, total: items.length });
			}
			if (path.startsWith('/appointment/appointments/')) {
				const id = path.slice('/appointment/appointments/'.length);
				if (held && id === held.id) await held.wait;
				return detail ? json({ ...detail, id }) : json({}, 404);
			}
			if (path.startsWith('/doctor/public/doctors/')) {
				const asked = decodeURIComponent(
					path.slice('/doctor/public/doctors/'.length).split(/[/?]/u)[0]
				);
				const doctorId = DOCTORS[asked] ? asked : 'doc-maria';
				return json({ doctor: { doctorId, ...DOCTORS[doctorId] } });
			}
			if (path.startsWith('/appointment-rating/ratings/')) return json(reviewView);
			return json({});
		})
	);
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	visit('/');
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function draw(
	data: AppointmentsScreenData,
	props: { start?: SessionStatus; memory?: AppointmentsMemory } = {}
) {
	let handle:
		| {
				session: Session;
				client: QueryClient;
				signIn: () => void;
				otherSignsIn: () => void;
				go: (next: AppointmentsScreenData) => void;
		  }
		| undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: { data, ...props, onReady: (found: NonNullable<typeof handle>) => (handle = found) }
		}
	});
	return () => handle as NonNullable<typeof handle>;
}

const LIST: AppointmentsScreenData = { address: { view: 'list', tab: 'upcoming' } };
const ONE: AppointmentsScreenData = {
	address: { view: 'appointment', appointmentId: A1, step: null }
};
const appointmentCalls = () => calls.filter((call) => call.url.includes('/appointment/'));
const listCalls = () => calls.filter((call) => call.url.includes('/appointment/appointments?'));
const wideScreen = () =>
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
const split = () => screen.getByTestId('appointments-split');
/** The very same elements (never redrawn), not merely equal ones. */
const sameNodes = (now: HTMLElement[], before: HTMLElement[]) =>
	now.length === before.length && now.every((node, index) => node === before[index]);
const doctorCalls = () => calls.filter((call) => call.url.includes('/doctor/public/'));

describe('screens/appointments/[...path] · screens 50 + 51 composed', () => {
	it('P-W4 §7: «Τα ραντεβού μου» names itself in the tab and is never indexed', () => {
		visit('/appointments');
		draw(LIST, { start: 'guest' });
		expect(document.title).toBe('Τα ραντεβού μου | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		expect(screen.getByTestId('appointments-page')).toHaveAttribute('data-view', 'list');
	});

	it('🔴 U-65.6 (P-W4 §4.2): an appointment’s tab says «Το ραντεβού μου» — never its id, a doctor or a day — and in English under /en', async () => {
		visit(`/appointments/${A1}/cancel`);
		draw({ address: { view: 'appointment', appointmentId: A1, step: 'cancel' } });
		// Card w4-w5: the address names screen 53, which stands in the appointment's place (no title of its own).
		await screen.findByTestId('appointment-cancel');
		expect(document.title).toBe('Το ραντεβού μου | eDoctor');
		expect(document.title).not.toMatch(/Μαρία|Πέμπτη|12/u);
		cleanupAndVisit('/en/appointments');
		draw(LIST, { start: 'guest' });
		expect(document.title).toBe('My appointments | eDoctor');
	});

	it('🔴 U-80.1 Ε6 · U-139.1: a guest asks the server nothing and reads one column in the middle with «Σύνδεση» over the page', async () => {
		visit('/appointments');
		const handle = draw(LIST, { start: 'guest' });
		expect(screen.getByTestId('appointments-split')).toHaveAttribute('data-solo');
		await userEvent
			.setup({ delay: null })
			.click(
				within(screen.getByTestId('appointments-guest')).getByRole('button', { name: 'Σύνδεση' })
			);
		expect(handle().session.flowOpen).toBe(true);
		expect(calls).toEqual([]);
	});

	it('the wait: the page draws the list’s wait until the browser knows who reads it, and asks nothing', () => {
		visit('/appointments');
		draw(LIST, { start: 'unknown' });
		expect(screen.getByTestId('appointments-loading')).toBeInTheDocument();
		expect(calls).toEqual([]);
	});

	it('🔴 D-W4-29: a member’s list with ONE public profile read per different doctor (two cards, one doctor), anonymous; the cards name the doctor', async () => {
		visit('/appointments');
		draw(LIST);
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		await waitFor(() => expect(screen.getAllByText('Dr. Μαρία Τριανταφύλλου')).toHaveLength(2));
		expect(doctorCalls()).toHaveLength(1);
		expect(doctorCalls()[0].credentials).toBe('omit');
		const list = appointmentCalls()[0];
		expect(new URL(list.url).searchParams.get('as')).toBe('patient');
		expect(new URL(list.url).searchParams.get('scope')).toBe('upcoming');
		expect(list.credentials).toBe('include');
	});

	it('screen 51 composed: the appointment, its doctor (read once), «Μήνυμα στον γιατρό» of screen 18; below 950 the list is not read under it (D-103)', async () => {
		visit(`/appointments/${A1}`);
		draw(ONE);
		await screen.findByTestId('appointment-when');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-doctor')).toHaveAttribute('href', '/doctors/dr-maria')
		);
		expect(screen.getByTestId('appointment-message')).toHaveTextContent('Μήνυμα στον γιατρό');
		expect(doctorCalls()).toHaveLength(1);
		expect(appointmentCalls().map((call) => call.url)).toEqual([
			expect.stringContaining(`/appointment/appointments/${A1}`)
		]);
	});

	it('from 950 the list stands beside the appointment, read once that one told its tab; two columns (U-134.2)', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		visit(`/appointments/${A1}`);
		draw(ONE);
		await screen.findByTestId('appointment-when');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(screen.getByTestId('appointments-split')).not.toHaveAttribute('data-solo');
		expect(screen.getAllByTestId('appointment-card')[0]).toHaveAttribute('data-selected');
	});

	it('🔴 review w4-w4 R1 MAJOR-1 (P-W4 §3.6, the shot `w-loading-1440`): from 950 the list keeps its cards — the same ones, its focus, read once — while the next appointment is read; only the right column waits', async () => {
		wideScreen();
		visit(`/appointments/${A1}`);
		const handle = draw(ONE);
		await screen.findByTestId('appointment-when');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		const cards = screen.getAllByTestId('appointment-card');
		const pressed = within(cards[1]).getByTestId('appointment-card-link');
		pressed.focus();

		const release = hold(A2);
		visit(`/appointments/${A2}`);
		handle().go({ address: { view: 'appointment', appointmentId: A2, step: null } });
		expect(await screen.findByTestId('appointment-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('appointments-empty')).toBeNull();
		expect(screen.queryByTestId('appointments-loading')).toBeNull();
		expect(sameNodes(screen.getAllByTestId('appointment-card'), cards)).toBe(true);
		expect(document.activeElement).toBe(pressed);
		expect(split()).not.toHaveAttribute('data-solo');

		release();
		await waitFor(() =>
			expect(screen.getAllByTestId('appointment-card')[1]).toHaveAttribute('data-selected')
		);
		expect(sameNodes(screen.getAllByTestId('appointment-card'), cards)).toBe(true);
		expect(listCalls()).toHaveLength(1);
	});

	it('🔴 MAJOR-1 · U-139.1 (the shot `w-loading-1440`): a cold open from 950 (a link, a reload) is TWO columns of two waits from the first paint — never one column, never «no appointments» — and asks the list nothing until the appointment told its tab (D-103)', async () => {
		wideScreen();
		const release = hold(A1);
		visit(`/appointments/${A1}`);
		const handle = draw(ONE, { start: 'unknown' });
		// The first paint: the session not yet known (the server's page knows nobody).
		expect(split()).not.toHaveAttribute('data-solo');
		expect(split()).toHaveClass('split:grid');
		expect(screen.getByTestId('appointments-loading')).toBeInTheDocument();
		expect(screen.getByTestId('appointment-loading')).toBeInTheDocument();
		handle().signIn();
		expect(await screen.findByTestId('appointment-loading')).toBeInTheDocument();
		await waitFor(() => expect(appointmentCalls()).toHaveLength(1));
		expect(screen.queryByTestId('appointments-empty')).toBeNull();
		expect(screen.getByTestId('appointments-loading')).toBeInTheDocument();
		expect(split()).not.toHaveAttribute('data-solo');
		expect(listCalls()).toHaveLength(0);

		release();
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(screen.queryByTestId('appointments-empty')).toBeNull();
		expect(split()).not.toHaveAttribute('data-solo');
	});

	it('🔴 U-139.1 (review w4-w4 R1 MINOR-2): from 950 both reads failed ⇒ ONE column in the middle, the appointment’s failure — never two columns of two failures', async () => {
		wideScreen();
		down = true;
		visit(`/appointments/${A1}`);
		draw(ONE);
		await screen.findByTestId('appointment-failed');
		await waitFor(() => expect(screen.getByTestId('appointments-error')).toBeInTheDocument());
		expect(split()).toHaveAttribute('data-solo');
		expect(
			screen.getByTestId('appointment-failed').closest('[data-slot="split-view-pane"]')
		).toHaveClass('split:mx-auto', 'split:max-w-split-solo');
	});

	it('review w4-w4 R1 MINOR-1: from 950 «Τα ραντεβού μου» paints the list beside the wait of its first — two columns at once — while that one opens in place', async () => {
		wideScreen();
		visit('/appointments');
		draw(LIST);
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(split()).not.toHaveAttribute('data-solo');
		expect(
			screen.getByTestId('appointment-loading').closest('[data-slot="split-view-pane"]')
		).toHaveClass('split:block');
		expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${A1}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	});

	it('404 and 403 alike: «Δεν βρήκαμε αυτό το ραντεβού» (another account’s appointment is never told apart)', async () => {
		detail = null;
		visit(`/appointments/${A3}`);
		draw({ address: { view: 'appointment', appointmentId: A3, step: null } });
		expect(await screen.findByTestId('appointment-missing')).toHaveTextContent(
			'Δεν βρήκαμε αυτό το ραντεβού'
		);
	});

	it('🔴 D-W4-33: what was just saved is said from the page’s memory on its own appointment — never from the address', async () => {
		const memory = new AppointmentsMemory();
		memory.remember(A1, { kind: 'note', removed: false });
		visit(`/appointments/${A1}`);
		draw(ONE, { memory });
		expect(await screen.findByTestId('appointment-done')).toHaveTextContent(
			'Η σημείωση αποθηκεύτηκε.'
		);
		expect(page.url.search).toBe('');
	});

	it('🔴 U-138.5 · P-B4 §13.3.5 (card w4-w6, rule 5): a visit with its review reads it by its `ratingId` — «Η κριτική σας» on the 51, the name it is published under (the profile’s rule), the way to the doctor’s reviews at this one', async () => {
		detail = {
			...view(A1, { status: 'completed', startTime: '2026-07-03T08:30:00.000Z' }),
			ratingId: 'rat-1',
			actions: { canCancel: false, canReschedule: false }
		};
		visit(`/appointments/${A1}`);
		draw(ONE);
		const card = await screen.findByTestId('appointment-review');
		expect(card).toHaveTextContent('Η κριτική σας');
		expect(card).toHaveTextContent('Δημοσιεύτηκε');
		expect(card).toHaveTextContent('Φαίνεται στο προφίλ του γιατρού με το όνομα Ελένη Π.');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-review-profile')).toHaveAttribute(
				'href',
				'/doctors/dr-maria/details/reviews?focus=rat-1'
			)
		);
		expect(screen.getByTestId('appointment-review-reply')).toHaveTextContent(
			'Απάντηση από Dr. Μαρία Τριανταφύλλου'
		);
		const reads = calls.filter((call) => call.url.includes('/appointment-rating/ratings'));
		expect(reads).toHaveLength(1);
		expect(reads[0].url).toMatch(/\/appointment-rating\/ratings\/rat-1$/u);
		expect(reads[0].credentials).toBe('include');
	});

	it('W4-9 · P-B4 §13.3.1 / §13.3.3 through the contract (card w4-w6): the server’s deadline lights «Δηλαδή έως…» on the 51; its `LIMIT_REACHED` «Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται…»', async () => {
		detail = {
			...view(A1),
			actions: {
				canCancel: true,
				canReschedule: false,
				cancellationCutoffHours: 24,
				isPastCancellationCutoff: false,
				cancellationDeadline: '2026-11-11T10:30:00.000Z',
				rescheduleDenial: 'LIMIT_REACHED',
				reschedulesLeft: 0
			}
		};
		visit(`/appointments/${A1}`);
		draw(ONE);
		expect(await screen.findByTestId('appointment-terms')).toHaveTextContent(
			'Δηλαδή έως Τετάρτη 11 Νοεμβρίου, 12:30.'
		);
		expect(screen.getByTestId('appointment-page')).toHaveTextContent(
			'Έχετε αλλάξει την ώρα όσες φορές επιτρέπεται. Για άλλη αλλαγή, καλέστε το ιατρείο.'
		);
	});

	it('W4-9 · P-B4 §13.3.4 (negative): no `ratingId` reads no review — never a list of reviews per appointment; an open invitation lights «Πώς ήταν η επίσκεψη;» and the card’s «Αξιολογήστε»', async () => {
		const invited = {
			status: 'completed',
			startTime: '2026-10-22T07:00:00.000Z',
			ratingInvitation: { invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00.000Z' }
		};
		upcoming = [view(A1, invited)];
		detail = { ...view(A1, invited), actions: { canCancel: false, canReschedule: false } };
		visit(`/appointments/${A1}`);
		draw(ONE);
		expect(await screen.findByTestId('appointment-ask')).toHaveTextContent('Πώς ήταν η επίσκεψη;');
		expect(screen.getByTestId('appointment-rate')).toHaveAttribute('href', '/ratings/inv-1');
		expect(screen.queryByTestId('appointment-review')).toBeNull();
		expect(calls.filter((call) => call.url.includes('/appointment-rating/'))).toEqual([]);
		cleanup();
		visit('/appointments?tab=history');
		draw({ address: { view: 'list', tab: 'history' } });
		expect(await screen.findByTestId('appointment-card-rate')).toHaveAttribute(
			'href',
			'/ratings/inv-1'
		);
	});

	it('D-W4-33 (negative): the memory of another appointment is not said here, and is let go', async () => {
		const memory = new AppointmentsMemory();
		memory.remember(A2, { kind: 'note', removed: true });
		visit(`/appointments/${A1}`);
		draw(ONE, { memory });
		await screen.findByTestId('appointment-when');
		expect(screen.queryByTestId('appointment-done')).toBeNull();
		expect(memory.saved).toBeNull();
	});
});

describe('screens/appointments/[...path] · screens 52 + 53 composed (U-136.2, U-137.2, D-W4-20)', () => {
	const at = (step: 'time' | 'for-whom' | 'note' | 'cancel'): AppointmentsScreenData => ({
		address: { view: 'appointment', appointmentId: A1, step }
	});
	const slotCalls = () => calls.filter((call) => call.url.includes('/availability/public/slots'));

	it('«Αλλαγή ώρας»: the doctor’s window of the appointment’s ONE office, for its service, read anonymously — and nothing else of the doctor’s', async () => {
		visit(`/appointments/${A1}/time`);
		draw(at('time'));
		expect(await screen.findByTestId('appointment-change-time')).toBeInTheDocument();
		await waitFor(() => expect(slotCalls()).toHaveLength(1));
		const slots = new URL(slotCalls()[0].url).searchParams;
		expect(slots.get('officeId')).toBe('off-ermou');
		expect(slots.get('doctorServiceId')).toBe('svc-simple');
		expect(slots.get('doctorId')).toBe('doc-maria');
		expect(slotCalls()[0].credentials).not.toBe('include');
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('the 51 opens no window of slots (D-103: nothing read for nobody to see)', async () => {
		visit(`/appointments/${A1}`);
		draw(ONE);
		await screen.findByTestId('appointment-when');
		expect(slotCalls()).toHaveLength(0);
	});

	it('screen 53 in the appointment’s place; its opening reads the appointment again (P-W4 §4.4)', async () => {
		visit(`/appointments/${A1}/cancel`);
		draw(at('cancel'));
		expect(await screen.findByTestId('appointment-cancel')).toBeInTheDocument();
		await waitFor(() =>
			expect(
				appointmentCalls().filter((call) => call.url.endsWith(`/appointment/appointments/${A1}`))
			).toHaveLength(2)
		);
		expect(screen.getByTestId('appointment-cancel-terms')).toHaveTextContent('Προθεσμία ακύρωσης');
	});

	it('a guest at a screen 52 address reads the 51’s «Σύνδεση» and asks the server nothing', () => {
		visit(`/appointments/${A1}/note`);
		draw(at('note'), { start: 'guest' });
		expect(screen.getByTestId('appointment-guest')).toBeInTheDocument();
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		expect(calls).toEqual([]);
	});

	it('review w4-w5 R1 NIT-4 (D-103): an hour that may not move reads none of the doctor’s hours — the screen gives way to the appointment', async () => {
		detail = { ...view(A1), actions: { canCancel: true, canReschedule: false } };
		visit(`/appointments/${A1}/time`);
		draw(at('time'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${A1}`, { replaceState: true })
		);
		expect(slotCalls()).toHaveLength(0);
	});

	it('🔴 D-W4-37 composed: a 403 with no code — the patient stays with the words, reads «Η αλλαγή δεν αποθηκεύτηκε…», the appointment is read again; read closed, the screen gives way to the 51', async () => {
		written = () =>
			new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		const detailReads = () =>
			calls.filter(
				(call) => call.method === 'GET' && call.url.endsWith(`/appointment/appointments/${A1}`)
			);
		visit(`/appointments/${A1}/note`);
		draw(at('note'));
		const field = await screen.findByTestId('appointment-note-field');
		await userEvent.setup({ delay: null }).type(field, 'Να μη χαθεί.');
		await userEvent.setup({ delay: null }).click(screen.getByTestId('booking-save'));
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await waitFor(() => expect(detailReads()).toHaveLength(2));
		expect(screen.getByTestId('appointment-note-field')).toHaveValue('Να μη χαθεί.');
		expect(vi.mocked(goto)).not.toHaveBeenCalled();

		detail = {
			...view(A1, { status: 'canceled' }),
			actions: { canCancel: false, canReschedule: false }
		};
		await userEvent.setup({ delay: null }).click(screen.getByTestId('booking-save'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${A1}`, { replaceState: true })
		);
	});

	it('🔴 review w4-a6 R1 MINOR-2 (parity, D-W4-37.1): the read after a refusal FAILS — the form stays with the words written and «Η αλλαγή δεν αποθηκεύτηκε…»; never the page’s failure in its place', async () => {
		written = () =>
			new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		const detailReads = () =>
			calls.filter(
				(call) => call.method === 'GET' && call.url.endsWith(`/appointment/appointments/${A1}`)
			);
		visit(`/appointments/${A1}/note`);
		draw(at('note'));
		const field = await screen.findByTestId('appointment-note-field');
		await userEvent.setup({ delay: null }).type(field, 'Να μη χαθεί.');
		down = true;
		await userEvent.setup({ delay: null }).click(screen.getByTestId('booking-save'));
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Η αλλαγή δεν αποθηκεύτηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await waitFor(() => expect(detailReads()).toHaveLength(2));
		await Promise.resolve();
		expect(screen.getByTestId('appointment-note-field')).toHaveValue('Να μη χαθεί.');
		expect(screen.getByRole('alert')).toHaveTextContent('Η αλλαγή δεν αποθηκεύτηκε.');
		expect(screen.queryByTestId('appointment-failed')).toBeNull();
		expect(screen.getByTestId('booking-save')).toBeEnabled();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
	});

	it('🔴 review w4-a6 R1 MINOR-2 (parity) on screen 53: the read after a refused cancellation FAILS — the reason and the words stay, with the cancellation’s own failure', async () => {
		written = () =>
			new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Forbidden' }), {
				status: 403,
				headers: { 'Content-Type': 'application/json' }
			});
		visit(`/appointments/${A1}/cancel`);
		draw(at('cancel'));
		await screen.findByTestId('appointment-cancel');
		const press = userEvent.setup({ delay: null });
		await press.click(screen.getAllByRole('radio')[0]);
		down = true;
		const send = screen.getByTestId('booking-save');
		await waitFor(() => expect(send).toBeEnabled());
		await press.click(send);
		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Η ακύρωση δεν ολοκληρώθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		await Promise.resolve();
		expect(screen.getByTestId('appointment-cancel')).toBeInTheDocument();
		expect(screen.getAllByRole('radio')[0]).toBeChecked();
		expect(screen.queryByTestId('appointment-failed')).toBeNull();
	});

	it('🔴 review w4-w4 R1 MAJOR-1 beside 52 / 53: from 950 the list keeps its cards while the next appointment’s change is read', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		visit(`/appointments/${A1}/note`);
		const handle = draw(at('note'));
		await screen.findByTestId('appointment-change-note');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		const cards = screen.getAllByTestId('appointment-card');
		const release = hold(A2);
		visit(`/appointments/${A2}/cancel`);
		handle().go({ address: { view: 'appointment', appointmentId: A2, step: 'cancel' } });
		expect(await screen.findByTestId('appointment-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('appointments-empty')).toBeNull();
		expect(sameNodes(screen.getAllByTestId('appointment-card'), cards)).toBe(true);
		expect(screen.getByTestId('appointments-split')).not.toHaveAttribute('data-solo');
		release();
		expect(await screen.findByTestId('appointment-cancel')).toBeInTheDocument();
		expect(sameNodes(screen.getAllByTestId('appointment-card'), cards)).toBe(true);
	});

	it('from 950 the change stands in the right column beside the list (U-136.2): two columns', async () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
		);
		visit(`/appointments/${A1}/note`);
		draw(at('note'));
		const note = await screen.findByTestId('appointment-change-note');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(screen.getByTestId('appointments-split')).not.toHaveAttribute('data-solo');
		expect(note.closest('[data-slot="split-view-pane"]')).not.toBeNull();
	});
});

describe('screens/appointments/[...path] · 🔴 Σ1 (live check w4-live-web): the page follows its address while the doctors on screen change', () => {
	/** Three appointments of three different doctors, as the test patient's «Επερχόμενα». */
	const threeDoctors = () => [
		view(A1),
		view(A2, { doctorId: 'doc-nikos', startTime: '2026-11-16T07:00:00.000Z' }),
		view(A3, { doctorId: 'doc-anna', startTime: '2026-11-18T07:00:00.000Z' })
	];
	const names = ['Dr. Μαρία Τριανταφύλλου', 'Dr. Νίκος Αντωνίου', 'Dr. Άννα Βασιλείου'];
	const listOfThree = async () => {
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(3));
		for (const name of names) await screen.findAllByText(name);
	};
	/**
	 * The capsules that say «chosen», each of the three ways the page says it (the live check found them disagreeing):
	 * `aria-current`, the chip's state, and the dark fill itself.
	 */
	const chosenTab = () => {
		const tabs = (['upcoming', 'history'] as const).map((value) => ({
			value,
			chip: screen.getByTestId(`appointments-tab-${value}`)
		}));
		const by = (told: (chip: HTMLElement) => boolean) =>
			tabs.filter(({ chip }) => told(chip)).map(({ value }) => value);
		const current = by((chip) => chip.getAttribute('aria-current') === 'page');
		expect(by((chip) => chip.getAttribute('data-state') === 'on')).toEqual(current);
		expect(by((chip) => chip.querySelector('.bg-foreground') !== null)).toEqual(current);
		return current;
	};
	/** The route's `load` answering another address of the same page, flushed here: what the page throws is thrown to the test. */
	const go = (
		handle: ReturnType<typeof draw>,
		path: string,
		next: AppointmentsScreenData
	): (() => void) => {
		visit(path);
		return () => flushSync(() => handle().go(next));
	};

	it('below 950 a card of a list of three doctors opens ITS appointment: nothing thrown, the 51 on screen, the list gone', async () => {
		upcoming = threeDoctors();
		detail = { ...view(A2, { doctorId: 'doc-nikos' }), actions: { canCancel: true } };
		visit('/appointments');
		const handle = draw(LIST);
		await listOfThree();

		expect(
			go(handle, `/appointments/${A2}`, {
				address: { view: 'appointment', appointmentId: A2, step: null }
			})
		).not.toThrow();
		await screen.findByTestId('appointment-when');
		expect(screen.getByTestId('appointments-page')).toHaveAttribute('data-view', 'appointment');
		expect(document.title).toBe('Το ραντεβού μου | eDoctor');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-doctor')).toHaveAttribute('href', '/doctors/dr-nikos')
		);

		// And back to the list: the three again, each doctor read once in all (D-W4-29).
		expect(go(handle, '/appointments', LIST)).not.toThrow();
		await listOfThree();
		expect(doctorCalls()).toHaveLength(3);
	});

	it('«Ιστορικό» (every width): three doctors give way to the history’s one — its card, «Ιστορικό» the chosen capsule — and back', async () => {
		upcoming = threeDoctors();
		history = [view(A1, { status: 'completed', startTime: '2026-10-22T07:00:00.000Z' })];
		visit('/appointments');
		const handle = draw(LIST);
		await listOfThree();
		expect(chosenTab()).toEqual(['upcoming']);

		expect(
			go(handle, '/appointments?tab=history', { address: { view: 'list', tab: 'history' } })
		).not.toThrow();
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(1));
		expect(chosenTab()).toEqual(['history']);

		expect(go(handle, '/appointments', LIST)).not.toThrow();
		await listOfThree();
	});

	it('from 950, an appointment that is closed (as after its cancellation) moves the list of three doctors to «Ιστορικό» by itself, the dark capsule with it', async () => {
		wideScreen();
		upcoming = threeDoctors();
		history = [view(A2, { status: 'canceled' })];
		visit(`/appointments/${A1}`);
		const handle = draw(ONE);
		await screen.findByTestId('appointment-when');
		await listOfThree();
		expect(chosenTab()).toEqual(['upcoming']);

		detail = { ...view(A2, { status: 'canceled' }), actions: { canCancel: false } };
		expect(
			go(handle, `/appointments/${A2}`, {
				address: { view: 'appointment', appointmentId: A2, step: null }
			})
		).not.toThrow();
		await waitFor(() => expect(chosenTab()).toEqual(['history']));
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(1));
		expect(chosenTab()).toEqual(['history']);
	});
});

describe('screens/appointments/[...path] · 🔴 U-65.6 (security review of the web, MINOR-2): the person who left is on no page', () => {
	/** What the stubbed server says of the first person: nothing of it may stay on a guest's or another's page. */
	const THEIRS = ['Μαρία', 'Τριανταφύλλου', 'Ερμού 101', 'Πέμπτη 12 Νοεμβρίου', 'Απλή επίσκεψη'];
	const nothingOfTheirs = () => {
		const body = document.body.textContent ?? '';
		for (const word of THEIRS) expect(body, word).not.toContain(word);
	};

	it('50 · a sign-out: the guest’s page at once — no card, no doctor, no day of the person who left — and the server is asked nothing more', async () => {
		visit('/appointments');
		const handle = draw(LIST);
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		await waitFor(() => expect(screen.getAllByText('Dr. Μαρία Τριανταφύλλου')).toHaveLength(2));
		const asked = calls.length;
		await handle().session.signOut();
		await waitFor(() => expect(screen.getByTestId('appointments-guest')).toBeInTheDocument());
		expect(screen.queryAllByTestId('appointment-card')).toEqual([]);
		nothingOfTheirs();
		await Promise.resolve();
		expect(calls).toHaveLength(asked);
	});

	it('51 · a sign-out with an appointment and its review open: the guest’s «Σύνδεση» — nothing of the visit, its doctor, its office or «Η κριτική σας» left, from 950 no list either; nothing more asked', async () => {
		wideScreen();
		detail = {
			...view(A1, { status: 'completed', startTime: '2026-11-05T10:30:00.000Z' }),
			ratingId: 'rat-1',
			actions: { canCancel: false, canReschedule: false }
		};
		visit(`/appointments/${A1}`);
		const handle = draw(ONE);
		await screen.findByTestId('appointment-review');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-doctor')).toHaveTextContent('Μαρία Τριανταφύλλου')
		);
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		const asked = calls.length;
		await handle().session.signOut();
		await waitFor(() =>
			expect(screen.getByTestId('appointment-page')).toHaveAttribute('data-state', 'guest')
		);
		expect(screen.queryByTestId('appointment-review')).toBeNull();
		expect(screen.queryByTestId('appointment-facts')).toBeNull();
		expect(screen.queryAllByTestId('appointment-card')).toEqual([]);
		nothingOfTheirs();
		expect(document.body.textContent).not.toContain('Πολύ προσεκτική εξέταση.');
		await Promise.resolve();
		expect(calls).toHaveLength(asked);
	});

	it('51 · another account in the same tab (no guest between): the last person’s appointment leaves the page at once; the new one’s is read and shown — never the old words meanwhile', async () => {
		visit(`/appointments/${A1}`);
		const handle = draw(ONE);
		await screen.findByTestId('appointment-when');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-doctor')).toHaveTextContent('Μαρία Τριανταφύλλου')
		);
		// The same address, answered for the other account: another doctor, another day, another office.
		detail = {
			...view(A1, {
				doctorId: 'doc-nikos',
				startTime: '2026-11-20T08:00:00.000Z',
				officeSnapshot: {
					id: 'off-2',
					street: 'Σόλωνος',
					streetNumber: '9',
					city: 'Αθήνα',
					translations: []
				},
				serviceLines: []
			}),
			actions: { canCancel: true, canReschedule: true, cancellationCutoffHours: 24 }
		};
		const release = hold(A1);
		// What the site's sign-in host does when another account answers (`auth/ui/host`).
		void resetPersonalQueries(handle().client);
		handle().session.accountChanged();
		await screen.findByTestId('appointment-loading');
		expect(screen.queryByTestId('appointment-when')).toBeNull();
		nothingOfTheirs();
		release();
		await waitFor(() =>
			expect(screen.getByTestId('appointment-when')).toHaveTextContent('Παρασκευή 20 Νοεμβρίου')
		);
		await waitFor(() =>
			expect(screen.getByTestId('appointment-doctor')).toHaveTextContent('Νίκος Αντωνίου')
		);
		nothingOfTheirs();
	});
});

describe('screens/appointments/[...path] · 🔴 D-W4-78 (review w4-w9-r1 MAJOR-1, U-84): a session that ends on an open form of 52 / 53', () => {
	const at = (step: 'note' | 'cancel'): AppointmentsScreenData => ({
		address: { view: 'appointment', appointmentId: A1, step }
	});
	const WORDS = 'Να μη χαθεί τίποτα.';
	/** What the stubbed server says of the first person, and what that person wrote. */
	const THEIRS = ['Μαρία', 'Τριανταφύλλου', 'Ερμού 101', 'Πέμπτη 12 Νοεμβρίου', 'Απλή επίσκεψη'];
	const nothingOfTheirs = () => {
		const body = document.body.textContent ?? '';
		for (const word of THEIRS) expect(body, word).not.toContain(word);
		for (const field of document.body.querySelectorAll('textarea, input')) {
			expect((field as HTMLTextAreaElement).value).not.toContain(WORDS);
		}
	};
	/** The same address answered for another account: another doctor, another day, another office, no service. */
	const OTHERS = {
		...view(A1, {
			doctorId: 'doc-nikos',
			startTime: '2026-11-20T08:00:00.000Z',
			officeSnapshot: {
				id: 'off-2',
				street: 'Σόλωνος',
				streetNumber: '9',
				city: 'Αθήνα',
				translations: []
			},
			serviceLines: []
		}),
		actions: { canCancel: true, canReschedule: true, cancellationCutoffHours: 24 }
	};
	const unauthorized = () =>
		new Response(JSON.stringify({ errorCode: 'EC401', errorMessage: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	const detailReads = () =>
		calls.filter(
			(call) => call.method === 'GET' && call.url.endsWith(`/appointment/appointments/${A1}`)
		);
	const press = () => userEvent.setup({ delay: null });
	const noteField = () => screen.getByTestId('appointment-note-field');
	const cancelText = () => screen.getByTestId('appointment-cancel-text');

	/** Screen 52's note with the words written, sent, and refused with `401`: the harness's session ends as the site's. */
	async function expireOnNote() {
		visit(`/appointments/${A1}/note`);
		const handle = draw(at('note'));
		const field = await screen.findByTestId('appointment-note-field');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-change-note')).toHaveTextContent('Μαρία Τριανταφύλλου')
		);
		await press().type(field, WORDS);
		written = unauthorized;
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		return { handle, field };
	}

	it('52 · the `401` of «Αποθήκευση»: the page knows nobody, the sign-in opens OVER the form — the very same field with the words, on its appointment — and nothing personal is asked; signed in again, the same field, its doctor read anew, and the save goes through', async () => {
		const { handle, field } = await expireOnNote();
		await Promise.resolve();
		flushSync();
		expect(noteField()).toBe(field);
		expect(field).toHaveValue(WORDS);
		expect(handle().session.status).toBe('guest');
		expect(handle().session.expired).toBe(true);
		expect(screen.getByTestId('appointment-change-note')).toHaveTextContent(
			'Πέμπτη 12 Νοεμβρίου · 12:30'
		);
		expect(screen.queryByTestId('appointment-guest')).toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();
		// A guest asks the server nothing: the appointment was read once, and is not asked again until the sign-in.
		expect(detailReads()).toHaveLength(1);

		handle().signIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(noteField()).toBe(field);
		expect(field).toHaveValue(WORDS);
		await waitFor(() => expect(detailReads()).toHaveLength(2));
		await Promise.resolve();
		flushSync();
		expect(noteField()).toBe(field);
		expect(field).toHaveValue(WORDS);
		// The doctor's profile is a read of the person's too (it left with the session): asked again, named again.
		await waitFor(() =>
			expect(screen.getByTestId('appointment-change-note')).toHaveTextContent('Μαρία Τριανταφύλλου')
		);

		written = () => json({ ...view(A1, { patientNote: WORDS }) });
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() =>
			expect(vi.mocked(goto)).toHaveBeenCalledWith(`/appointments/${A1}`, { replaceState: true })
		);
		expect(bodies).toEqual([{ patientNote: WORDS }, { patientNote: WORDS }]);
	});

	it('53 · the `401` of the cancellation, from 950: the reason and the words stay in the very same form under the sign-in; signed in again they are still there beside the list read anew, and ONE press cancels', async () => {
		wideScreen();
		visit(`/appointments/${A1}/cancel`);
		const handle = draw(at('cancel'));
		await screen.findByTestId('appointment-cancel');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		const reason = screen.getAllByRole('radio')[1];
		await press().click(reason);
		await press().type(cancelText(), WORDS);
		const text = cancelText();
		const send = screen.getByTestId('booking-save');
		await waitFor(() => expect(send).toBeEnabled());
		written = unauthorized;
		await press().click(send);
		await waitFor(() => expect(handle().session.flowOpen).toBe(true));
		await Promise.resolve();
		flushSync();
		expect(handle().session.status).toBe('guest');
		expect(cancelText()).toBe(text);
		expect(text).toHaveValue(WORDS);
		expect(screen.getAllByRole('radio')[1]).toBe(reason);
		expect(reason).toBeChecked();
		expect(screen.queryByTestId('appointment-guest')).toBeNull();
		// The list is a personal read: its cards leave with the session; the form stands alone meanwhile.
		expect(screen.queryAllByTestId('appointment-card')).toEqual([]);
		expect(text.closest('[data-slot="split-view-pane"]')).not.toBeNull();
		expect(vi.mocked(goto)).not.toHaveBeenCalled();

		handle().signIn();
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(cancelText()).toBe(text);
		expect(text).toHaveValue(WORDS);
		expect(reason).toBeChecked();
		expect(split()).not.toHaveAttribute('data-solo');

		detail = {
			...view(A1, { status: 'canceled' }),
			actions: { canCancel: false, canReschedule: false }
		};
		written = () => json(detail);
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(bodies).toHaveLength(2));
		expect(bodies[1]).toEqual(bodies[0]);
		expect(bodies[1]).toMatchObject({ reasonText: WORDS });
	});

	it('(negative · α) a guest who OPENS a form’s address was never the member of this page: the 51’s «Σύνδεση», no form, nothing asked — and no session «ended» here', () => {
		for (const step of ['note', 'cancel'] as const) {
			visit(`/appointments/${A1}/${step}`);
			const handle = draw(at(step), { start: 'guest' });
			expect(handle().session.expired).toBe(false);
			expect(screen.getByTestId('appointment-guest')).toBeInTheDocument();
			expect(screen.queryByTestId('appointment-change-note')).toBeNull();
			expect(screen.queryByTestId('appointment-cancel')).toBeNull();
			expect(calls).toEqual([]);
			cleanup();
		}
	});

	it('(negative · β) a sign-out BY HAND on the open form, words written: the guest’s page at once — no form, no word of the person’s, nothing of the visit — and nothing more asked', async () => {
		visit(`/appointments/${A1}/note`);
		const handle = draw(at('note'));
		await press().type(await screen.findByTestId('appointment-note-field'), WORDS);
		const asked = calls.length;
		await handle().session.signOut();
		await waitFor(() => expect(screen.getByTestId('appointment-guest')).toBeInTheDocument());
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		nothingOfTheirs();
		await Promise.resolve();
		expect(calls).toHaveLength(asked);
	});

	it('(negative · β) another account in the same tab on the open form (no session ended): the last person’s form and words leave at once; the new one’s appointment is read — never the old words in its form', async () => {
		visit(`/appointments/${A1}/note`);
		const handle = draw(at('note'));
		await press().type(await screen.findByTestId('appointment-note-field'), WORDS);
		detail = OTHERS;
		const release = hold(A1);
		void resetPersonalQueries(handle().client);
		handle().session.accountChanged();
		await screen.findByTestId('appointment-loading');
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		nothingOfTheirs();
		release();
		expect(await screen.findByTestId('appointment-note-field')).toHaveValue('');
		nothingOfTheirs();
	});

	it('(negative · γ) the sign-in CLOSED without signing in: the guest’s page — no form, no word of the person’s, nothing asked; whoever signs in later finds a new, empty form', async () => {
		const { handle, field } = await expireOnNote();
		expect(noteField()).toBe(field);
		const asked = calls.length;
		handle().session.cancelSignIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(screen.getByTestId('appointment-guest')).toBeInTheDocument();
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		nothingOfTheirs();
		await Promise.resolve();
		expect(calls).toHaveLength(asked);

		const release = hold(A1);
		handle().signIn();
		flushSync();
		// Nothing kept stands in for the read on its way: the 51's wait, never the form that was closed.
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		nothingOfTheirs();
		release();
		const fresh = await screen.findByTestId('appointment-note-field');
		expect(fresh).not.toBe(field);
		expect(fresh).toHaveValue('');
	});

	it('(negative · δ) ANOTHER account signs in over the ended session: the last person’s form and words are gone the moment that account is known — never shown beside or instead of the new one’s read', async () => {
		const { handle, field } = await expireOnNote();
		expect(noteField()).toBe(field);
		detail = OTHERS;
		const release = hold(A1);
		handle().otherSignsIn();
		flushSync();
		expect(handle().session.expired).toBe(false);
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		expect(screen.getByTestId('appointment-loading')).toBeInTheDocument();
		nothingOfTheirs();
		release();
		const fresh = await screen.findByTestId('appointment-note-field');
		expect(fresh).not.toBe(field);
		expect(fresh).toHaveValue('');
		nothingOfTheirs();
	});

	it('(negative · δ) the other account’s read is REFUSED (the visit is not theirs): «Δεν βρήκαμε αυτό το ραντεβού» — the last person’s form never stands in for it', async () => {
		const { handle } = await expireOnNote();
		detail = null;
		handle().otherSignsIn();
		expect(await screen.findByTestId('appointment-missing')).toBeInTheDocument();
		expect(screen.queryByTestId('appointment-change-note')).toBeNull();
		nothingOfTheirs();
	});

	describe('🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ5): the form under the sign-in of an ended session, when the browser puts the page back from its back/forward cache — under the site’s REAL host', () => {
		/** Whether the server still knows the person (`GET /patient/me`, the host's own read). */
		let known: boolean;

		beforeEach(() => {
			known = true;
			const answer = globalThis.fetch as unknown as (
				input: string,
				init?: RequestInit
			) => Promise<Response>;
			vi.stubGlobal(
				'fetch',
				vi.fn(async (input: string, init: RequestInit = {}) => {
					if (!input.includes('/patient/me')) return answer(input, init);
					return known
						? json({ id: 'pat-1', firstName: 'Ελένη', tenantUserId: 'account-a' })
						: unauthorized();
				})
			);
		});

		const drawHosted = (data: AppointmentsScreenData) =>
			render(QueryHarness, {
				props: { component: HostedHarness as unknown as Component<never>, props: { data } }
			});
		/** The browser shows the page: put back from its back/forward cache as it was left (`persisted`), or loaded. */
		function pageShown(persisted: boolean) {
			const event = new Event('pageshow');
			Object.defineProperty(event, 'persisted', { value: persisted });
			window.dispatchEvent(event);
		}
		const signIn = () => screen.queryByTestId('auth-dialog');

		/** Screen 52's note with the words written; `end`: sent and refused with `401`, the site's sign-in over it. */
		async function onNote(end: boolean) {
			visit(`/appointments/${A1}/note`);
			drawHosted(at('note'));
			const field = await screen.findByTestId('appointment-note-field');
			await press().type(field, WORDS);
			if (end) {
				written = unauthorized;
				known = false;
				await press().click(screen.getByTestId('booking-save'));
				await waitFor(() => expect(signIn()).toHaveAttribute('data-state', 'open'));
				await Promise.resolve();
				flushSync();
			}
			// Where the rule starts from: the very same field, with the words, on its appointment.
			expect(noteField()).toBe(field);
			expect(field).toHaveValue(WORDS);
			return field;
		}

		it('52 · put back with the ended session under its sign-in: the guest’s page as by «×» — the sign-in closed, no form, no word of the person’s, nothing of the visit — and the server asked nothing more', async () => {
			await onNote(true);
			const asked = calls.length;
			pageShown(true);
			await waitFor(() => expect(screen.getByTestId('appointment-guest')).toBeInTheDocument());
			expect(screen.queryByTestId('appointment-change-note')).toBeNull();
			await waitFor(() => expect(signIn()).not.toBeInTheDocument());
			nothingOfTheirs();
			await Promise.resolve();
			expect(calls).toHaveLength(asked);
		});

		it('53 · the same on the cancellation, from 950: the reason and the words are gone with the form, one column of the guest’s «Σύνδεση»', async () => {
			wideScreen();
			visit(`/appointments/${A1}/cancel`);
			drawHosted(at('cancel'));
			await screen.findByTestId('appointment-cancel');
			await press().click(screen.getAllByRole('radio')[1]);
			await press().type(cancelText(), WORDS);
			const text = cancelText();
			const send = screen.getByTestId('booking-save');
			await waitFor(() => expect(send).toBeEnabled());
			written = unauthorized;
			known = false;
			await press().click(send);
			await waitFor(() => expect(signIn()).toHaveAttribute('data-state', 'open'));
			await Promise.resolve();
			flushSync();
			expect(cancelText()).toBe(text);
			expect(text).toHaveValue(WORDS);

			pageShown(true);
			await waitFor(() => expect(screen.getByTestId('appointment-guest')).toBeInTheDocument());
			expect(screen.queryByTestId('appointment-cancel')).toBeNull();
			expect(screen.queryAllByRole('radio')).toEqual([]);
			await waitFor(() => expect(signIn()).not.toBeInTheDocument());
			nothingOfTheirs();
		});

		it('(negative) merely shown (`persisted` false): the form stays under the sign-in — the very same field, the words', async () => {
			const field = await onNote(true);
			pageShown(false);
			await new Promise((done) => setTimeout(done, 0));
			flushSync();
			expect(noteField()).toBe(field);
			expect(field).toHaveValue(WORDS);
			expect(signIn()).toHaveAttribute('data-state', 'open');
			expect(screen.queryByTestId('appointment-guest')).toBeNull();
		});

		it('(negative) put back with NO ended session — a member on the open form, words written: nothing changes', async () => {
			const field = await onNote(false);
			const asked = calls.length;
			pageShown(true);
			await new Promise((done) => setTimeout(done, 0));
			flushSync();
			expect(noteField()).toBe(field);
			expect(field).toHaveValue(WORDS);
			expect(signIn()).not.toBeInTheDocument();
			expect(screen.queryByTestId('appointment-guest')).toBeNull();
			expect(calls).toHaveLength(asked);
		});
	});
});

describe('screens/appointments/[...path] · 🔴 U-153 (card w4-w12; live check w4-live-web-3 Δ1): back on the appointment after a write, the page starts at its top — once per write', () => {
	const at = (step: 'note' | 'cancel'): AppointmentsScreenData => ({
		address: { view: 'appointment', appointmentId: A1, step }
	});
	const WORDS = 'Να φέρω τις εξετάσεις.';
	const press = () => userEvent.setup({ delay: null });
	let top: MockInstance<typeof window.scrollTo>;
	let back: MockInstance<typeof window.history.go>;

	beforeEach(() => {
		// jsdom keeps no place on the page: what is measured here is that the top is ASKED, and when (the place itself is
		// read in a real browser).
		top = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
		// (`history` is this file's own word for the list's rows.)
		back = vi.spyOn(window.history, 'go').mockImplementation(() => {});
	});
	afterEach(() => {
		top.mockRestore();
		back.mockRestore();
		page.state = {};
	});

	/** A screen of the appointment opened from it, one step on in the history (`use-steps`). */
	function open(step: 'note' | 'cancel', handle?: ReturnType<typeof draw>) {
		visit(`/appointments/${A1}/${step}`);
		page.state = { appointment: { depth: 1 } };
		if (handle) flushSync(() => handle().go(at(step)));
		return handle ?? draw(at(step), { memory: new AppointmentsMemory() });
	}

	/**
	 * `history.go(-1)` answered: the same page at the appointment's address, then — AFTER the router has put that entry's
	 * scroll back (`@sveltejs/kit` `client.js`, `navigate`) — every `afterNavigate` of the page.
	 */
	function arrive(handle: ReturnType<typeof draw>) {
		visit(`/appointments/${A1}`);
		page.state = {};
		flushSync(() => handle().go(ONE));
		for (const [told] of vi.mocked(afterNavigate).mock.calls as unknown as [() => void][]) told();
	}

	it('52 · «Αποθήκευση» of the note: the appointment with «Η σημείωση αποθηκεύτηκε.» asks for its top ONCE; (negative) «Αλλαγή» again and «Άκυρο» — nothing saved — asks nothing more, the notice still said', async () => {
		const handle = open('note');
		await press().type(await screen.findByTestId('appointment-note-field'), WORDS);
		written = () => json({ ...view(A1, { patientNote: WORDS }) });
		await press().click(screen.getByTestId('booking-save'));
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(top).not.toHaveBeenCalled();

		arrive(handle);
		expect(await screen.findByTestId('appointment-done')).toHaveTextContent(
			'Η σημείωση αποθηκεύτηκε.'
		);
		expect(top).toHaveBeenCalledTimes(1);
		expect(top).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });

		open('note', handle);
		await press().click(await screen.findByTestId('booking-cancel'));
		expect(back).toHaveBeenCalledTimes(2);
		arrive(handle);
		expect(await screen.findByTestId('appointment-done')).toHaveTextContent(
			'Η σημείωση αποθηκεύτηκε.'
		);
		expect(top).toHaveBeenCalledTimes(1);
	});

	it('53 · the cancellation: back on the canceled visit its page asks for its top ONCE, and not again on a second arrival', async () => {
		const handle = open('cancel');
		await screen.findByTestId('appointment-cancel');
		await press().click(screen.getAllByRole('radio')[1]);
		const send = screen.getByTestId('booking-save');
		await waitFor(() => expect(send).toBeEnabled());
		detail = {
			...view(A1, { status: 'canceled' }),
			actions: { canCancel: false, canReschedule: false }
		};
		written = () => json(detail);
		await press().click(send);
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		expect(top).not.toHaveBeenCalled();

		arrive(handle);
		await screen.findByTestId('appointment-page');
		expect(top).toHaveBeenCalledTimes(1);
		arrive(handle);
		expect(top).toHaveBeenCalledTimes(1);
	});

	it('(negative) a screen opened and left with NOTHING written: the appointment keeps the place the router gave it — the top is never asked', async () => {
		const handle = open('note');
		await press().type(await screen.findByTestId('appointment-note-field'), WORDS);
		await press().click(screen.getByTestId('booking-cancel'));
		await waitFor(() => expect(back).toHaveBeenCalledWith(-1));
		arrive(handle);
		await screen.findByTestId('appointment-page');
		expect(screen.queryByTestId('appointment-done')).toBeNull();
		expect(top).not.toHaveBeenCalled();
		expect(bodies).toEqual([]);
	});
});

function cleanupAndVisit(path: string) {
	cleanup();
	visit(path);
}
