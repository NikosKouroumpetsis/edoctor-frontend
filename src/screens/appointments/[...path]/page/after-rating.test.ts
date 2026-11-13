import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import RatingHarness from '$screens/ratings/[invitationId]/page/screen.harness.svelte';
import AppointmentsHarness from './screen.harness.svelte';

/*
 * 🔴 Review w4-w6 R1 MAJOR-1, composed (P-W4 §8.2): screen 54's «Υποβολή» and then the 51 it goes back to, on the SAME
 * cache and the same memory of the page — while the appointment's new read is still on its way, or failed. The visit
 * stands at once with «Η κριτική υποβλήθηκε.» AND «Η κριτική σας · Σε έλεγχο», never «Γράψτε κριτική». The server's
 * «now» Tuesday 10 November 21:00 in Athens. Made-up people and offices.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';
const H1 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5b';
const H2 = '0193a1b2-7c3d-7e4f-8a9b-0c1d2e3f4a5c';

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

/** The review the server made (`201`), «Σε έλεγχο». */
const reviewView = {
	id: 'rat-1',
	appointmentId: H1,
	doctorId: 'doc-maria',
	patientName: 'Ελένη',
	patientInitial: 'Π',
	overallRating: 5,
	comment: null,
	ratingModerationStatus: 'PENDING',
	aspect: {
		inDepthRating: 5,
		trustRating: 5,
		expertiseRating: 5,
		punctualRating: 5,
		friendlyRating: 5
	},
	createdAt: '2026-11-10T19:00:00.000Z'
};

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

type Call = { url: string; method: string };
let calls: Call[];
/** After the submit: what every NEW read of the person's appointments does — never answers, or answers 500. */
let after: 'answers' | 'held' | 'down';
const never = new Promise<Response>(() => {});

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	after = 'answers';
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url: input, method });
			const path = input.replace(/^.*\/api\/v1/u, '');
			if (method === 'POST') return json(reviewView, 201);
			if (path.startsWith('/appointment/') || path.startsWith('/appointment-rating/')) {
				if (after === 'held') return never;
				if (after === 'down') return json({}, 500);
			}
			if (path.startsWith('/appointment-rating/rating-invitations/')) {
				return json({
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
			}
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
	vi.stubGlobal(
		'matchMedia',
		vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	visit('/');
});

function visit(path: string) {
	(page as { url: URL }).url = new URL(path, 'http://localhost');
}

/** Screen 54 from 950 (its list beside it), the five aspects pressed, «Υποβολή» — with the reads after it as `then`. */
async function rateAndGoBack(then: 'held' | 'down') {
	const memory = new AppointmentsMemory();
	visit(`/ratings/${INVITATION}`);
	// ONE page host — its cache, its memory — draws screen 54 first; each screen's harness reads its own of these.
	const view = render(QueryHarness, {
		props: {
			component: RatingHarness as unknown as Component<never>,
			props: {
				invitationId: INVITATION,
				data: { address: { view: 'appointment', appointmentId: H1, step: null } },
				memory
			}
		}
	});
	const user = userEvent.setup({ delay: null });
	await screen.findByTestId('appointment-rating');
	// The list beside the form, read: its row of this visit still says «Γράψτε κριτική για την επίσκεψη».
	await waitFor(() => expect(screen.getAllByTestId('appointment-card-rate')).toHaveLength(2));
	for (const slider of screen.getAllByRole('slider')) {
		slider.focus();
		await user.keyboard('{End}');
	}
	after = then;
	const submit = screen.getByTestId('booking-save');
	await waitFor(() => expect(submit).toBeEnabled());
	await user.click(submit);
	// The `201` answered: the form remembered it for the visit's page and went back.
	await waitFor(() => expect(memory.doneOf(H1)).toEqual({ kind: 'rating' }));
	expect(calls.filter((call) => call.method === 'POST')).toHaveLength(1);

	// «Back»: the same page host (its cache, its memory) now draws the appointment's address.
	visit(`/appointments/${H1}`);
	await view.rerender({ component: AppointmentsHarness as unknown as Component<never> });
	return { memory };
}

const pane = () => screen.getByTestId('appointment-page');

describe('🔴 review w4-w6 R1 MAJOR-1 · 54 ⇒ 51 on one cache', () => {
	it('the appointment’s new read still on its way: the 51 stands at once with «Η κριτική υποβλήθηκε.» AND «Η κριτική σας · Σε έλεγχο» — never «Γράψτε κριτική», on the page or on the list’s card', async () => {
		await rateAndGoBack('held');
		expect(await screen.findByTestId('appointment-done')).toHaveTextContent(
			'Η κριτική υποβλήθηκε.'
		);
		const review = within(pane()).getByTestId('appointment-review');
		expect(review).toHaveTextContent('Η κριτική σας');
		expect(review).toHaveTextContent('Σε έλεγχο');
		expect(screen.queryByTestId('appointment-ask')).toBeNull();
		expect(screen.queryByTestId('appointment-rate')).toBeNull();
		expect(pane()).not.toHaveTextContent('Γράψτε κριτική');
		// The list beside it (from 950): this visit's card lost its link; the other visit keeps its own.
		const cards = screen.getAllByTestId('appointment-card');
		const mine = cards.find((card) => card.hasAttribute('data-selected')) as HTMLElement;
		expect(within(mine).queryByTestId('appointment-card-rate')).toBeNull();
		expect(screen.getAllByTestId('appointment-card-rate')).toHaveLength(1);
	});

	it('(negative) the new reads FAIL after the `201`: the same — the review and the green notice stay, «Γράψτε κριτική» never comes back', async () => {
		await rateAndGoBack('down');
		expect(await screen.findByTestId('appointment-done')).toHaveTextContent(
			'Η κριτική υποβλήθηκε.'
		);
		await waitFor(() =>
			expect(
				calls.filter((call) => call.url.includes(`/appointment/appointments/${H1}`)).length
			).toBeGreaterThan(1)
		);
		expect(within(pane()).getByTestId('appointment-review')).toHaveTextContent('Σε έλεγχο');
		expect(screen.queryByTestId('appointment-ask')).toBeNull();
		expect(pane()).not.toHaveTextContent('Γράψτε κριτική');
		expect(screen.queryByTestId('appointment-failed')).toBeNull();
	});
});
