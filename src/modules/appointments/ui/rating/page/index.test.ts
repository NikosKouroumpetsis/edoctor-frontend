import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { Component } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';
import QueryHarness from '$shared/query/query.harness.svelte';
import { resetServerClock } from '$shared/lib/server-clock';
import type { Session, SessionStatus } from '$shared/state/session';
import type {
	AppointmentActionsFacts,
	AppointmentDetailFacts
} from '$modules/appointments/api/appointment';
import {
	appointmentActionsSample,
	appointmentDetailSample
} from '$modules/appointments/api/appointment/appointment.sample';
import type { RatingInvitationFacts } from '$modules/appointments/api/rating';
import type { RatingPreviewCard } from '$modules/appointments/lib/rating';
import type {
	AppointmentDoctorFacts,
	AppointmentsLinks,
	AppointmentsViewer
} from '$modules/appointments/types';
import type { AppointmentDetailRead } from '$modules/appointments/ui/detail';
import { AppointmentsMemory } from '$modules/appointments/ui/memory';
import type { RatingInvitationRead } from '../hooks/use-invitation.svelte';
import Harness from './rating.harness.svelte';

/*
 * Screen 54 «Αξιολόγηση επίσκεψης» (record §10, U-138; P-W4 §4.5): the form of the email's link — «Η επίσκεψή σας», five
 * aspects on the shared stars (a press whole, the same star again half), the grade by the server's formula, the words
 * to 2000 without `<` `>`, the preview, the four lines, «Πώς λειτουργούν οι κριτικές», ONE «Υποβολή»; the refusals, the
 * guest, an invitation already answered. The server's «now» Tuesday 10 November 21:00 in Athens; made-up people.
 */

const NOW = new Date('2026-11-10T19:00:00.000Z');
const ID = appointmentDetailSample.id;
const INVITATION = '0193c4d5-0000-7000-8000-0000000000c1';

const maria: AppointmentDoctorFacts = {
	doctorSlug: 'dr-maria',
	name: 'Μαρία Τριανταφύλλου',
	professional: { name: 'Δερματολόγος' },
	images: [],
	rating: 4.9,
	reviewCount: 22
};

const links: AppointmentsLinks = {
	list: (tab) => (tab === 'history' ? '/appointments?tab=history' : '/appointments'),
	appointment: (id) => `/appointments/${id}`,
	step: (id, step) => `/appointments/${id}/${step}`,
	rating: (id) => `/ratings/${id}`,
	doctor: (slug) => `/doctors/${slug}`,
	search: '/',
	help: '/help'
};

const closed: Partial<AppointmentActionsFacts> = {
	canCancel: false,
	canReschedule: false,
	cancellationCutoffHours: null,
	cancellationDeadline: null,
	rescheduleDenial: 'STATUS',
	reschedulesLeft: null
};

/** The visit the invitation rates: a kept one that took place on Thursday 22 October. */
const visited = (extra: Partial<AppointmentDetailFacts> = {}): AppointmentDetailFacts => ({
	...appointmentDetailSample,
	status: 'completed',
	startTime: '2026-10-22T07:00:00.000Z',
	endTime: '2026-10-22T07:30:00.000Z',
	...extra,
	actions: { ...appointmentActionsSample, ...closed }
});

const invitationOf = (extra: Partial<RatingInvitationFacts> = {}): RatingInvitationFacts => ({
	invitationId: INVITATION,
	appointmentId: ID,
	status: 'OPEN',
	expiresAt: '2026-12-21T08:00:00.000Z',
	canSubmit: true,
	submitBlocker: null,
	ratingId: null,
	patientName: 'Ελένη',
	patientInitial: 'Π',
	...extra
});

const readOf = (
	invitation: RatingInvitationFacts | null,
	extra: Partial<RatingInvitationRead> = {}
): RatingInvitationRead => ({
	invitation,
	refused: false,
	failed: false,
	loading: invitation === null,
	retry: vi.fn(),
	...extra
});

const visitOf = (
	appointment: AppointmentDetailFacts | null,
	extra: Partial<AppointmentDetailRead> = {}
): AppointmentDetailRead => ({
	appointment,
	missing: false,
	failed: false,
	loading: appointment === null,
	retry: vi.fn(),
	...extra
});

/** The profile's card of a review published now, as the screen composes it (D-W4-25 / D-W4-26). */
const previewOf = (draft: { stars: number; body: string }): RatingPreviewCard => ({
	authorName: 'Ελένη Π.',
	authorInitial: 'Ε',
	dateLabel: 'Σήμερα',
	rating: draft.stars,
	ratingLabel: `${draft.stars} από 5 αστέρια`,
	body: draft.body
});

/** The review the server made (`201`), «Σε έλεγχο». */
const reviewView = {
	id: 'rat-1',
	appointmentId: ID,
	doctorId: 'doc-maria',
	patientName: 'Ελένη',
	patientInitial: 'Π',
	overallRating: 4.6,
	comment: 'Πολύ καλά.',
	ratingModerationStatus: 'PENDING',
	aspect: {
		inDepthRating: 4.5,
		trustRating: 5,
		expertiseRating: 4.5,
		punctualRating: 4,
		friendlyRating: 5
	},
	createdAt: '2026-11-10T19:00:00.000Z'
};

type Call = { url: string; method: string; body?: Record<string, unknown> };
let calls: Call[];
let answer: () => Response;

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
const refusal = (status: number, errorMessage: string) =>
	new Response(JSON.stringify({ errorCode: 'EC000', errorMessage }), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	resetServerClock();
	calls = [];
	answer = () => json(reviewView, 201);
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init: RequestInit = {}) => {
			const method = init.method ?? 'GET';
			calls.push({ url, method, body: init.body ? JSON.parse(String(init.body)) : undefined });
			return method === 'POST' ? answer() : json({});
		})
	);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	page.state = {};
});

type Draw = {
	viewer?: AppointmentsViewer;
	status?: SessionStatus;
	read?: RatingInvitationRead;
	visit?: AppointmentDetailRead;
	authorName?: string | null;
	preview?: boolean;
	offline?: boolean;
	depth?: number;
	memory?: AppointmentsMemory;
};

function draw({
	viewer = 'member',
	status = 'member',
	read = readOf(invitationOf()),
	visit = visitOf(visited()),
	authorName = 'Ελένη Π.',
	preview = true,
	offline = false,
	depth = 1,
	memory = new AppointmentsMemory()
}: Draw = {}) {
	page.state = depth ? { appointment: { depth } } : {};
	const go = vi.spyOn(history, 'go').mockImplementation(() => {});
	const onSignIn = vi.fn();
	const onRetrySession = vi.fn();
	const handle: { session?: Session } = {};
	render(QueryHarness, {
		props: {
			component: Harness as unknown as Component<never>,
			props: {
				status,
				memory,
				onReady: (ready: { session: Session }) => Object.assign(handle, ready),
				props: {
					locale: 'el',
					viewer,
					read,
					visit,
					doctor: maria,
					links,
					offline,
					authorName,
					previewOf: (draft: { stars: number; body: string }) =>
						preview ? previewOf(draft) : null,
					how: {
						blocks: [
							{ heading: 'Ποιος γράφει κριτική', text: 'Μόνο ο ασθενής.' },
							{ heading: 'Έλεγχος πριν από τη δημοσίευση', text: 'Η ομάδα ελέγχει.' }
						],
						links: [{ label: 'Πολιτική κριτικών', href: '/legal/review-policy' }]
					},
					policyHref: '/legal/review-policy',
					onSignIn,
					onRetrySession
				}
			}
		}
	});
	return { go, memory, handle, onSignIn, onRetrySession, read, visit };
}

const user = () => userEvent.setup({ delay: null });
const submit = () => screen.getByTestId('booking-save');
const aspect = (id: string) => screen.getByTestId(`appointment-rating-stars-${id}`);
const star = (id: string, n: number) =>
	aspect(id).querySelector(`[data-star="${n}"]`) as HTMLElement;
const valueOf = (id: string) => screen.getByTestId(`appointment-rating-value-${id}`);

/** The five as the server orders them, given by presses: 4,5 · 5 · 4,5 · 4 · 5 (9, 10, 9, 8, 10). */
async function rateAll() {
	const press = user();
	await press.click(star('in-depth', 5));
	await press.click(star('in-depth', 5));
	await press.click(star('trust', 5));
	await press.click(star('expertise', 5));
	await press.click(star('expertise', 5));
	await press.click(star('punctuality', 4));
	await press.click(star('friendliness', 5));
}

describe('screen 54 · «Αξιολόγηση επίσκεψης» (record §10.2, U-138)', () => {
	it('U-138.3: the form at once — «Η επίσκεψή σας», the line of help, the five aspects in the server’s order with their lines; «Υποβολή» locked until all five', () => {
		draw();
		const form = screen.getByTestId('appointment-rating');
		expect(within(form).getByRole('heading', { level: 2 })).toHaveTextContent(
			'Αξιολόγηση επίσκεψης'
		);
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Η επίσκεψή σας');
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Πέμπτη 22 Οκτωβρίου');
		expect(form).toHaveTextContent(
			'Βαθμολογήστε και τις πέντε πτυχές. Για μισό αστέρι, πατήστε ξανά το ίδιο αστέρι.'
		);
		const rows = [...form.querySelectorAll('[data-slot="rating-aspect"]')];
		expect(rows.map((row) => row.getAttribute('data-aspect'))).toEqual([
			'in-depth',
			'trust',
			'expertise',
			'punctuality',
			'friendliness'
		]);
		expect(rows[0]).toHaveTextContent('Σε βάθος');
		expect(rows[0]).toHaveTextContent('Αφιέρωσε χρόνο και σας εξέτασε προσεκτικά.');
		expect(screen.getByTestId('appointment-rating-grade')).toHaveTextContent(
			'Βαθμός κριτικής Βγαίνει από τις πέντε πτυχές.'
		);
		expect(submit()).toBeDisabled();
		expect(submit()).toHaveTextContent('Υποβολή');
		expect(screen.getByTestId('booking-cancel')).toHaveTextContent('Άκυρο');
	});

	it('🔴 U-138.2 · D-W4-27 (the shared `StarInput` in the form): a press is whole, the same star again half, a third whole; the arrows move half a star; the reader hears «4,5 στα 5»', async () => {
		draw();
		const press = user();
		expect(aspect('trust')).toHaveAttribute('role', 'slider');
		expect(aspect('trust')).toHaveAttribute('aria-label', 'Εμπιστοσύνη');
		expect(aspect('trust')).toHaveAttribute('aria-valuetext', 'Χωρίς βαθμό');
		await press.click(star('trust', 5));
		expect(aspect('trust')).toHaveAttribute('aria-valuenow', '10');
		expect(valueOf('trust')).toHaveTextContent('5');
		await press.click(star('trust', 5));
		expect(aspect('trust')).toHaveAttribute('aria-valuetext', '4,5 στα 5');
		expect(valueOf('trust')).toHaveTextContent('4,5');
		await press.click(star('trust', 5));
		expect(aspect('trust')).toHaveAttribute('aria-valuenow', '10');
		aspect('trust').focus();
		await press.keyboard('{ArrowLeft}{ArrowLeft}');
		expect(aspect('trust')).toHaveAttribute('aria-valuetext', '4 στα 5');
		expect(screen.getByTestId('appointment-rating-grade')).toHaveTextContent('Λείπουν 4 πτυχές.');
	});

	it('«Βαθμός κριτικής» by the server’s formula once all five are given (9, 10, 9, 8, 10 ⇒ 4,6); then «Υποβολή» opens', async () => {
		draw();
		await rateAll();
		const grade = screen.getByTestId('appointment-rating-grade');
		expect(grade).toHaveTextContent('Το «Σε βάθος» και η «Εξειδίκευση» μετρούν περισσότερο.');
		expect(grade).toHaveTextContent('4,6');
		expect(grade.querySelector('[data-slot="rating"]')).not.toBeNull();
		expect(submit()).toBeEnabled();
	});

	it('U-138.4 · D-W4-25 / D-W4-26: «Έτσι θα φαίνεται στο προφίλ του γιατρού» once graded — the server’s name, the profile’s day, the words as typed (text, never markup); the four lines with «έως»', async () => {
		draw();
		expect(screen.queryByTestId('appointment-rating-preview')).toBeNull();
		await rateAll();
		await user().type(screen.getByTestId('appointment-rating-comment'), '  Ωραία & <i>ήσυχα</i>');
		const preview = screen.getByTestId('appointment-rating-preview');
		expect(preview).toHaveTextContent('Έτσι θα φαίνεται στο προφίλ του γιατρού');
		expect(preview).toHaveTextContent('Ελένη Π.');
		expect(preview).toHaveTextContent('Σήμερα');
		expect(preview).toHaveTextContent('Ωραία & <i>ήσυχα</i>');
		expect(preview.querySelector('i')).toBeNull();
		const form = screen.getByTestId('appointment-rating');
		const lines = [...form.querySelectorAll('li:not([data-slot])')].map((line) => line.textContent);
		expect(lines).toEqual([
			'Η ομάδα του eDoctor ελέγχει κάθε κριτική πριν δημοσιευτεί.',
			'Φαίνεται μόνο το μικρό σας όνομα και το αρχικό του επωνύμου: Ελένη Π.',
			'Μετά την υποβολή η κριτική δεν αλλάζει.',
			'Μπορείτε να αξιολογήσετε την επίσκεψη έως 21 Δεκεμβρίου 2026.'
		]);
	});

	it('D-W4-26 (negative): no name from the server ⇒ no name line and no preview, never a name of the client’s', async () => {
		draw({ authorName: null, preview: false });
		await rateAll();
		expect(screen.queryByTestId('appointment-rating-preview')).toBeNull();
		expect(screen.getByTestId('appointment-rating')).not.toHaveTextContent('μικρό σας όνομα');
	});

	it('🔴 U-65.6 (negative): `<` or `>` in the words is refused under the field (D-W4-13) and «Υποβολή» stays locked; the field keeps 2000 and counts them', async () => {
		draw();
		await rateAll();
		const field = screen.getByTestId('appointment-rating-comment');
		expect(field).toHaveAttribute('maxlength', '2000');
		await user().type(field, 'a > b');
		expect(screen.getByRole('alert')).toHaveTextContent(
			'Το κείμενο δεν μπορεί να περιέχει τα σύμβολα < και >.'
		);
		expect(submit()).toBeDisabled();
		expect(screen.getByTestId('appointment-rating')).toHaveTextContent('5/2000');
	});

	it('card w4-w7 (the prototype’s `.a-area`, `appt.css:303`): the words of the review stand at least 136 high (`review-comment`) — never the note’s 104 nor the 53’s 96', () => {
		draw();
		const field = screen.getByTestId('appointment-rating-comment');
		expect(field).toHaveClass('min-h-review-comment');
		expect(field).not.toHaveClass('min-h-checkout-note');
	});

	it('the submit: ONE press sends the five as the server names them (1–10) and the trimmed words; back on the visit with «Η αξιολόγηση υποβλήθηκε.» (D-W4-12, D-W4-33)', async () => {
		const { go, memory } = draw();
		await rateAll();
		await user().type(screen.getByTestId('appointment-rating-comment'), '  Πολύ καλά.  ');
		const press = user();
		await press.dblClick(submit());
		await waitFor(() => expect(go).toHaveBeenCalledWith(-1));
		const posts = calls.filter((call) => call.method === 'POST');
		expect(posts).toHaveLength(1);
		expect(posts[0].url).toContain(`/appointment-rating/rating-invitations/${INVITATION}/submit`);
		expect(posts[0].body).toEqual({
			aspect: {
				inDepthRating: 9,
				trustRating: 10,
				expertiseRating: 9,
				punctualRating: 8,
				friendlyRating: 10
			},
			comment: 'Πολύ καλά.'
		});
		expect(memory.doneOf(ID)).toEqual({ kind: 'rating' });
	});

	it('opened by its link (no step behind it): the submit puts the visit in the form’s place, never a step back out of the site', async () => {
		const { memory } = draw({ depth: 0 });
		await rateAll();
		await user().type(screen.getByTestId('appointment-rating-comment'), 'Πολύ προσεκτική');
		await user().click(submit());
		await waitFor(() =>
			expect(goto).toHaveBeenCalledWith(`/appointments/${ID}`, { replaceState: true })
		);
		// 🔴 D-W4-63 · D-W4-33: «Η αξιολόγηση υποβλήθηκε.» comes from the page's memory — no address the form asked for
		// carries a `done`, a word of the review or anything after `?`.
		expect(memory.doneOf(ID)).toEqual({ kind: 'rating' });
		for (const [href] of vi.mocked(goto).mock.calls) {
			expect(String(href)).toBe(`/appointments/${ID}`);
			expect(decodeURIComponent(String(href))).not.toMatch(/προσεκτική|done|name/u);
		}
	});

	it('a refusal of the server with its code (a blocker) locks the form with its words and one way back; without a code the invitation is not available (U-138.3)', async () => {
		answer = () => refusal(403, 'RATING_DOCTOR_LICENSE_INACTIVE: the doctor takes no ratings');
		const first = draw();
		await rateAll();
		await user().click(submit());
		const blocked = await screen.findByTestId('appointment-rating-blocked');
		expect(within(blocked).getByTestId('appointment-rating-blocker')).toHaveTextContent(
			'Ο γιατρός δεν μπορεί να δεχτεί αξιολογήσεις αυτή τη στιγμή.'
		);
		expect(submit()).toHaveTextContent('Πίσω στο ραντεβού');
		expect(screen.queryByTestId('booking-cancel')).toBeNull();
		await user().click(submit());
		expect(first.go).toHaveBeenCalledWith(-1);
		cleanup();

		answer = () => refusal(403, 'Forbidden');
		draw();
		await rateAll();
		await user().click(submit());
		const refused = await screen.findByTestId('appointment-rating-refused');
		expect(refused).toHaveTextContent('Η πρόσκληση δεν είναι διαθέσιμη');
		expect(within(refused).getByRole('link', { name: 'Τα ραντεβού μου' })).toHaveAttribute(
			'href',
			'/appointments'
		);
	});

	it('review w4-w6 R1 NIT-1: «←» of «Η πρόσκληση δεν είναι διαθέσιμη» does what its link says — «Τα ραντεβού μου» in this address’s place, with or without a step behind; never back into the visit', async () => {
		for (const depth of [1, 0]) {
			vi.mocked(goto).mockClear();
			const { go } = draw({
				read: readOf(null, { refused: true, loading: false }),
				visit: visitOf(null),
				depth
			});
			const back = screen.getByTestId('booking-back');
			expect(back).toHaveAttribute('href', '/appointments');
			await user().click(back);
			expect(vi.mocked(goto)).toHaveBeenCalledWith('/appointments', { replaceState: true });
			expect(go).not.toHaveBeenCalled();
			cleanup();
		}
	});

	it('a failure keeps the stars and the words with «Η αξιολόγηση δεν υποβλήθηκε…»; 🔴 U-84: a `401` opens the sign-in over the form and keeps them too', async () => {
		answer = () => refusal(500, 'boom');
		const { handle, go } = draw();
		await rateAll();
		await user().type(screen.getByTestId('appointment-rating-comment'), 'Μένει');
		await user().click(submit());
		expect(await screen.findByTestId('appointment-rating-failure')).toHaveTextContent(
			'Η αξιολόγηση δεν υποβλήθηκε. Ελέγξτε τη σύνδεσή σας και δοκιμάστε ξανά.'
		);
		expect(aspect('trust')).toHaveAttribute('aria-valuenow', '10');
		expect(screen.getByTestId('appointment-rating-comment')).toHaveValue('Μένει');
		expect(go).not.toHaveBeenCalled();

		answer = () => refusal(401, 'Unauthorized');
		await user().click(submit());
		await waitFor(() => expect(handle.session?.flowOpen).toBe(true));
		expect(screen.getByTestId('appointment-rating-comment')).toHaveValue('Μένει');
	});

	it('U-138.3: an invitation that takes no review now says why — its blocker in the prototype’s words — and leads back to the visit', () => {
		draw({
			read: readOf(
				invitationOf({
					status: 'EXPIRED',
					canSubmit: false,
					submitBlocker: 'RATING_INVITATION_EXPIRED'
				})
			)
		});
		expect(screen.getByTestId('appointment-rating-blocker')).toHaveTextContent(
			'Ο χρόνος για να αξιολογήσετε αυτή την επίσκεψη έληξε.'
		);
		expect(screen.getByTestId('appointment-context')).toHaveTextContent('Η επίσκεψή σας');
		expect(submit()).toHaveTextContent('Πίσω στο ραντεβού');
		expect(screen.queryByTestId('appointment-rating-aspects')).toBeNull();
	});

	it('🔴 D-W4-23: an invitation already answered (`SUBMITTED` with its review) puts its visit in the address’s place — no refusal shown', () => {
		draw({
			read: readOf(
				invitationOf({
					status: 'SUBMITTED',
					ratingId: 'rat-1',
					canSubmit: false,
					submitBlocker: 'RATING_INVITATION_NOT_OPEN'
				})
			)
		});
		expect(goto).toHaveBeenCalledWith(`/appointments/${ID}`, { replaceState: true });
		expect(screen.queryByTestId('appointment-rating-blocker')).toBeNull();
		expect(screen.getByTestId('appointment-rating-loading')).toBeInTheDocument();
	});

	it('its own states: the wait, a guest’s «Σύνδεση», «Η πρόσκληση δεν είναι διαθέσιμη» (another account’s, or its visit not found), a failure with «Δοκιμάστε ξανά»', async () => {
		draw({ viewer: 'waiting', status: 'unknown', read: readOf(null), visit: visitOf(null) });
		expect(screen.getByTestId('appointment-rating-loading')).toBeInTheDocument();
		expect(screen.queryByTestId('booking-save')).toBeNull();
		cleanup();

		const guest = draw({
			viewer: 'guest',
			status: 'guest',
			read: readOf(null),
			visit: visitOf(null)
		});
		await user().click(screen.getByRole('button', { name: 'Σύνδεση' }));
		expect(guest.onSignIn).toHaveBeenCalledOnce();
		cleanup();

		draw({ read: readOf(null, { refused: true, loading: false }), visit: visitOf(null) });
		expect(screen.getByTestId('appointment-rating-refused')).toHaveTextContent(
			'Η πρόσκληση αξιολόγησης δεν ανήκει σε αυτόν τον λογαριασμό ή δεν υπάρχει πια.'
		);
		cleanup();

		draw({ visit: visitOf(null, { missing: true, loading: false }) });
		expect(screen.getByTestId('appointment-rating-refused')).toBeInTheDocument();
		cleanup();

		const failed = draw({
			read: readOf(null, { failed: true, loading: false }),
			visit: visitOf(null)
		});
		await user().click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(failed.read.retry).toHaveBeenCalledOnce();
		cleanup();

		const offline = draw({ offline: true, read: readOf(null), visit: visitOf(null) });
		await user().click(screen.getByRole('button', { name: 'Δοκιμάστε ξανά' }));
		expect(offline.read.retry).toHaveBeenCalledOnce();
	});

	it('D-W4-24: «Πώς λειτουργούν οι κριτικές» opens the profile’s window of information; «Πολιτική κριτικών» leads to the policy', async () => {
		draw();
		expect(screen.queryByRole('dialog')).toBeNull();
		await user().click(screen.getByTestId('appointment-rating-how'));
		const dialog = await screen.findByRole('dialog');
		expect(dialog).toHaveTextContent('Πώς λειτουργούν οι κριτικές');
		expect(dialog).toHaveTextContent('Ποιος γράφει κριτική');
		expect(screen.getByTestId('appointment-rating-policy')).toHaveAttribute(
			'href',
			'/legal/review-policy'
		);
	});

	it('🔴 U-138.6: «αξιολόγηση» is the act (the title, the notice), «κριτική» what is published (the grade, the preview, the lines)', async () => {
		draw();
		await rateAll();
		expect(
			within(screen.getByTestId('appointment-rating')).getByRole('heading', { level: 2 })
		).toHaveTextContent(/αξιολόγ/iu);
		expect(screen.getByTestId('appointment-rating-grade')).toHaveTextContent(/κριτικής/u);
		expect(screen.getByTestId('appointment-rating-grade')).not.toHaveTextContent(/αξιολόγ/iu);
		expect(screen.getByTestId('appointment-rating-preview')).not.toHaveTextContent(/αξιολόγ/iu);
	});
});
