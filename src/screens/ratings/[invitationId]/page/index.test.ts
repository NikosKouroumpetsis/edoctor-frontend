import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import type { QueryClient } from '@tanstack/svelte-query';
import { resetPersonalQueries } from '$shared/query';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import type { Session, SessionStatus } from '$shared/state/session';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import Harness from './screen.harness.svelte';

/*
 * Screen 54 composed (record §10, U-138; P-W4 §4.5): the email's link reads its invitation (the patient's own), the visit
 * it rates and its doctor from a stubbed API; the name the review will carry is the server's (D-W4-26) and its preview
 * the profile's own card (D-W4-25); from 950 the visit's «Ιστορικό» stands beside the form. The server's «now» Tuesday
 * 10 November 21:00 in Athens. Made-up people and offices.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';
const H1 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
const H2 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5c';

/** A visit that took place (`AppointmentResponseView`), at Ερμού 101, with its open invitation. */
const visitView = (id: string, extra: Record<string, unknown> = {}) => ({
	id,
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'completed',
	bookedForType: 'SELF',
	relativeId: null,
	startTime: '2026-10-22T07:00:00.000Z',
	endTime: '2026-10-22T07:30:00.000Z',
	effectiveDurationInMinutes: 30,
	confirmationModeSnapshot: 'AUTO',
	updatedAt: '2026-10-22T08:00:00.000Z',
	patientNote: null,
	finalTotalAmount: 140,
	officePhone: '+302103210101',
	patientSnapshot: { id: 'pat-1', firstName: 'Ελένη', lastName: 'Παππά' },
	officeSnapshot: {
		id: 'off-ermou',
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10555',
		floor: 2,
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
	ratingInvitation: { invitationId: INVITATION, expiresAt: '2026-12-21T08:00:00.000Z' },
	ratingId: null,
	...extra
});

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number) =>
	new Response(JSON.stringify({ errorCode: 'EC000', errorMessage: 'Forbidden' }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

type Call = { url: string; method: string; credentials?: RequestCredentials };
let calls: Call[];
let invitation: () => Response;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	invitation = () =>
		json({
			invitationId: INVITATION,
			appointmentId: H1,
			status: 'OPEN',
			expiresAt: '2026-12-21T08:00:00.000Z',
			canSubmit: true,
			submitBlocker: null,
			ratingId: null,
			patientName: 'Ελένη',
			patientInitial: 'Π'
		});
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			calls.push({ url: input, method: init.method ?? 'GET', credentials: init.credentials });
			const path = input.replace(/^.*\/api\/v1/u, '');
			if (path.startsWith('/appointment-rating/rating-invitations/')) return invitation();
			if (path.startsWith('/appointment/appointments?')) {
				return json({ items: [visitView(H2), visitView(H1)], nextCursor: null, total: 2 });
			}
			if (path.startsWith('/appointment/appointments/')) {
				return json({ ...visitView(H1), actions: { canCancel: false, canReschedule: false } });
			}
			if (path.startsWith('/doctor/public/doctors/')) {
				return json({
					doctor: { doctorId: 'doc-maria', slug: 'dr-maria', fullName: 'Μαρία Τριανταφύλλου' }
				});
			}
			return json({});
		})
	);
	wideScreen(false);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	visit('/');
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

function wideScreen(matches: boolean) {
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
}

function draw(props: { start?: SessionStatus; memory?: AppointmentsMemory } = {}) {
	let handle: { session: Session; client: QueryClient; signIn: () => void } | undefined;
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				invitationId: INVITATION,
				...props,
				onReady: (found: NonNullable<typeof handle>) => (handle = found)
			}
		}
	});
	return () => handle as NonNullable<typeof handle>;
}

const invitationCalls = () => calls.filter((call) => call.url.includes('/rating-invitations/'));
const listCalls = () => calls.filter((call) => call.url.includes('/appointment/appointments?'));
const split = () => screen.getByTestId('appointments-split');
const user = () => userEvent.setup({ delay: null });

describe('screens/ratings/[invitationId] · screen 54 composed (U-138.3)', () => {
	it('P-W4 §7: «Κριτική επίσκεψης» in the tab, never indexed; (negative) the invitation’s id is drawn nowhere', async () => {
		visit(`/ratings/${INVITATION}`);
		draw();
		expect(document.title).toBe('Κριτική επίσκεψης | eDoctor');
		expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
			'content',
			'noindex'
		);
		await screen.findByTestId('appointment-rating');
		expect(document.body.innerHTML).not.toContain(INVITATION);
	});

	it('U-138.3 · P-A4 Σ15 · 🔴 U-80.1 Ε6: a guest asks the server nothing — the sign-in opens over the form once, the guest’s words behind it, one column', () => {
		visit(`/ratings/${INVITATION}`);
		const handle = draw({ start: 'guest' });
		expect(handle().session.flowOpen).toBe(true);
		expect(screen.getByTestId('appointment-rating-guest')).toHaveTextContent('Σύνδεση');
		expect(split()).toHaveAttribute('data-solo');
		expect(calls).toEqual([]);
	});

	it('the form at once below 950: the invitation (with the cookies), its visit «Η επίσκεψή σας», its doctor; the list is not read under it (D-103)', async () => {
		visit(`/ratings/${INVITATION}`);
		draw();
		await screen.findByTestId('appointment-rating');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-context')).toHaveTextContent('Dr. Μαρία Τριανταφύλλου')
		);
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Η επίσκεψή σας');
		expect(invitationCalls()).toHaveLength(1);
		expect(invitationCalls()[0].credentials).toBe('include');
		expect(listCalls()).toEqual([]);
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('🔴 D-W4-25 / D-W4-26: the preview is the profile’s own card — the server’s «Ελένη Π.», «Σήμερα», the grade’s half stars — and the line of the name says it', async () => {
		visit(`/ratings/${INVITATION}`);
		draw();
		await screen.findByTestId('appointment-rating');
		const press = user();
		for (const id of ['in-depth', 'trust', 'expertise', 'punctuality', 'friendliness']) {
			await press.click(
				screen
					.getByTestId(`appointment-rating-stars-${id}`)
					.querySelector('[data-star="5"]') as HTMLElement
			);
		}
		const preview = screen.getByTestId('appointment-rating-preview');
		expect(preview).toHaveTextContent('Ελένη Π.');
		expect(preview).toHaveTextContent('Σήμερα');
		expect(preview.querySelector('[data-slot="review-card"]')).toHaveAttribute(
			'data-layout',
			'list'
		);
		expect(screen.getByTestId('appointment-rating')).toHaveTextContent(
			'Φαίνεται μόνο το μικρό σας όνομα και το αρχικό του επωνύμου: Ελένη Π.'
		);
	});

	it('from 950: two columns from the first paint — the list’s wait (no read before the visit tells its tab, D-103) beside the form’s; then the visit’s «Ιστορικό», the visit selected; the list never opens another (U-136.2)', async () => {
		wideScreen(true);
		visit(`/ratings/${INVITATION}`);
		draw();
		expect(split()).not.toHaveAttribute('data-solo');
		expect(screen.getByTestId('appointments-loading')).toBeInTheDocument();
		expect(screen.getByTestId('appointment-rating-loading')).toBeInTheDocument();
		expect(listCalls()).toEqual([]);
		await screen.findByTestId('appointment-rating');
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		expect(new URL(listCalls()[0].url).searchParams.get('scope')).toBe('history');
		const selected = screen
			.getAllByTestId('appointment-card')
			.filter((card) => card.hasAttribute('data-selected'));
		expect(selected).toHaveLength(1);
		expect(within(selected[0]).getByTestId('appointment-card-link')).toHaveAttribute(
			'href',
			`/appointments/${H1}`
		);
		expect(split()).not.toHaveAttribute('data-solo');
		expect(goto).not.toHaveBeenCalled();
	});

	it('U-139.1: an invitation that is not this account’s from 950 — «Η πρόσκληση δεν είναι διαθέσιμη» alone in the middle (no list beside nothing)', async () => {
		wideScreen(true);
		invitation = () => refusal(403);
		visit(`/ratings/${INVITATION}`);
		draw();
		expect(await screen.findByTestId('appointment-rating-refused')).toHaveTextContent(
			'Η πρόσκληση δεν είναι διαθέσιμη'
		);
		expect(split()).toHaveAttribute('data-solo');
		expect(listCalls()).toEqual([]);
	});

	it('🔴 D-W4-23: the link of an invitation already answered opens its visit in the address’s place', async () => {
		invitation = () =>
			json({
				invitationId: INVITATION,
				appointmentId: H1,
				status: 'SUBMITTED',
				expiresAt: '2026-12-21T08:00:00.000Z',
				canSubmit: false,
				submitBlocker: 'RATING_INVITATION_NOT_OPEN',
				ratingId: 'rat-1',
				patientName: 'Ελένη',
				patientInitial: 'Π'
			});
		visit(`/ratings/${INVITATION}`);
		draw();
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith(`/appointments/${H1}`, { replaceState: true })
		);
		expect(screen.queryByTestId('appointment-rating-blocker')).toBeNull();
	});
});

describe('screens/ratings/[invitationId] · 🔴 U-65.6 (security review of the web, MINOR-2): the person who left is on no page', () => {
	const THEIRS = [
		'Μαρία',
		'Τριανταφύλλου',
		'Ερμού 101',
		'Πέμπτη 22 Οκτωβρίου',
		'Απλή επίσκεψη',
		'Ελένη Π.'
	];
	const nothingOfTheirs = () => {
		const body = document.body.textContent ?? '';
		for (const word of THEIRS) expect(body, word).not.toContain(word);
	};
	const opened = async () => {
		await screen.findByTestId('appointment-rating');
		await waitFor(() =>
			expect(screen.getByTestId('appointment-context')).toHaveTextContent('Dr. Μαρία Τριανταφύλλου')
		);
	};

	it('54 · a sign-out with the form open (from 950, the visit’s list beside it): the guest’s words alone — no visit, no doctor, no name the review would carry, no list; nothing more asked', async () => {
		wideScreen(true);
		visit(`/ratings/${INVITATION}`);
		const handle = draw();
		await opened();
		await waitFor(() => expect(screen.getAllByTestId('appointment-card')).toHaveLength(2));
		const asked = calls.length;
		await handle().session.signOut();
		await waitFor(() => expect(screen.getByTestId('appointment-rating-guest')).toBeInTheDocument());
		expect(screen.queryByTestId('appointment-rating')).toBeNull();
		expect(screen.queryByTestId('appointment-context')).toBeNull();
		expect(screen.queryAllByTestId('appointment-card')).toEqual([]);
		nothingOfTheirs();
		expect(document.body.innerHTML).not.toContain(INVITATION);
		await Promise.resolve();
		expect(calls).toHaveLength(asked);
	});

	it('54 · another account in the same tab: the invitation is asked again for the new one — refused (it is not theirs), «Η πρόσκληση δεν είναι διαθέσιμη» with nothing of the last person’s visit', async () => {
		visit(`/ratings/${INVITATION}`);
		const handle = draw();
		await opened();
		invitation = () => refusal(403);
		void resetPersonalQueries(handle().client);
		handle().session.accountChanged();
		await screen.findByTestId('appointment-rating-refused');
		expect(screen.queryByTestId('appointment-rating')).toBeNull();
		expect(screen.queryByTestId('appointment-context')).toBeNull();
		nothingOfTheirs();
	});
});
