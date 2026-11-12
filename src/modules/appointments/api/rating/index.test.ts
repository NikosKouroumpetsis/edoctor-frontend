import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	getOwnReview,
	getRatingInvitation,
	mapOwnReview,
	mapRatingInvitation,
	ownReviewQuery,
	ratingInvitationQuery,
	readRatingFailure,
	submitRating
} from '.';

afterEach(() => vi.unstubAllGlobals());

const answering = (data: unknown, status = 200) =>
	vi.fn(async () => new Response(JSON.stringify({ status: 'success', data }), { status }));

/** The invitation of the email (P-B4 §13.2), made-up ids. */
const invitation = {
	invitationId: 'inv-1',
	appointmentId: 'apt-h1',
	status: 'OPEN',
	expiresAt: '2026-12-21T08:00:00.000Z',
	canSubmit: true,
	submitBlocker: null,
	ratingId: null,
	patientName: 'Ελένη',
	patientInitial: 'Π'
};

/** The review of P-B4 §13.2 (0–5 stars), with what the patient never reads. */
const review = {
	id: 'rat-1',
	appointmentId: 'apt-h3',
	doctorId: 'doc-maria',
	patientId: 'pat-1',
	patientName: 'Ελένη',
	patientInitial: 'Π',
	overallRating: 4.9,
	comment: ' Πολύ προσεκτική εξέταση. ',
	ratingModerationStatus: 'APPROVED',
	ratingModerationNote: 'σημείωση ελεγκτή',
	ratingModeratedByUserId: 'mod-1',
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

describe('screen 54 · the invitation (U-138.3)', () => {
	it('maps the invitation; 🔴 D-W4-26: the name the review will carry is the server’s own (`patientName`, `patientInitial`)', () => {
		expect(mapRatingInvitation(invitation as never)).toEqual({
			invitationId: 'inv-1',
			appointmentId: 'apt-h1',
			status: 'OPEN',
			expiresAt: '2026-12-21T08:00:00.000Z',
			canSubmit: true,
			submitBlocker: null,
			ratingId: null,
			patientName: 'Ελένη',
			patientInitial: 'Π'
		});
	});

	it('D-W4-26 (negative): no name from the server is no name — never one of the client’s; a name that is no text is none', () => {
		expect(
			mapRatingInvitation({ ...invitation, patientName: null, patientInitial: null } as never)
		).toMatchObject({ patientName: null, patientInitial: null });
		expect(
			mapRatingInvitation({ ...invitation, patientName: '  ', patientInitial: 7 } as never)
		).toMatchObject({ patientName: null, patientInitial: null });
		// An answer from before the contract named them (no such keys at all).
		const older: Record<string, unknown> = { ...invitation };
		delete older.patientName;
		delete older.patientInitial;
		expect(mapRatingInvitation(older as never)).toMatchObject({
			patientName: null,
			patientInitial: null
		});
	});

	it('W-4 (negative): no id, no appointment, a state the contract lacks ⇒ none; a blocker it lacks ⇒ none; `canSubmit` only when `true`', () => {
		expect(mapRatingInvitation({ ...invitation, invitationId: 7 } as never)).toBeNull();
		expect(mapRatingInvitation({ ...invitation, appointmentId: '' } as never)).toBeNull();
		expect(mapRatingInvitation({ ...invitation, status: 'PAUSED' } as never)).toBeNull();
		expect(mapRatingInvitation(null)).toBeNull();
		expect(
			mapRatingInvitation({
				...invitation,
				canSubmit: 'true',
				submitBlocker: 'RATING_SOMETHING',
				expiresAt: 'soon'
			} as never)
		).toMatchObject({ canSubmit: false, submitBlocker: null, expiresAt: null });
		// Review w4-w6 R1 MINOR-1: a day alone, a local hour, the engine's own reading, an RFC date — never a moment.
		for (const expiresAt of [
			'2026-12-21',
			'2026-12-21T08:00:00',
			'12/21/2026',
			'Mon, 21 Dec 2026 08:00:00 GMT'
		]) {
			expect(mapRatingInvitation({ ...invitation, expiresAt } as never), expiresAt).toMatchObject({
				expiresAt: null
			});
		}
	});

	it('the read is the patient’s own, with the cookies, its id encoded; personal in the cache', async () => {
		const spy = answering(invitation);
		vi.stubGlobal('fetch', spy);
		await expect(getRatingInvitation('inv/1')).resolves.toMatchObject({ invitationId: 'inv-1' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/appointment-rating/rating-invitations/inv%2F1');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
		expect(ratingInvitationQuery('inv-1')).toMatchObject({
			queryKey: ['appointments', 'rating-invitation', 'inv-1'],
			meta: { personal: true }
		});
	});
});

describe('«Η κριτική σας» (U-138.5)', () => {
	it('maps the review on the stars, its words as text, the approved reply; 🔴 never the moderator’s note or ids', () => {
		const facts = mapOwnReview(review as never);
		expect(facts).toEqual({
			ratingId: 'rat-1',
			appointmentId: 'apt-h3',
			doctorId: 'doc-maria',
			patientName: 'Ελένη',
			patientInitial: 'Π',
			overallStars: 4.9,
			comment: 'Πολύ προσεκτική εξέταση.',
			moderation: 'APPROVED',
			aspects: { 'in-depth': 5, trust: 5, expertise: 5, punctuality: 4.5, friendliness: 5 },
			reply: { body: 'Σας ευχαριστώ.', at: '2026-07-08T09:00:00.000Z' },
			createdAt: '2026-07-05T09:00:00.000Z'
		});
		expect(JSON.stringify(facts)).not.toContain('σημείωση ελεγκτή');
		expect(JSON.stringify(facts)).not.toContain('mod-1');
	});

	it('🔴 the patient reads a reply only approved; U-49 (negative): a score off the 0–5 scale is none, never clamped', () => {
		expect(
			mapOwnReview({ ...review, replyModerationStatus: 'PENDING' } as never)?.reply
		).toBeNull();
		expect(mapOwnReview({ ...review, doctorReply: '  ' } as never)?.reply).toBeNull();
		const offScale = mapOwnReview({
			...review,
			overallRating: 9.8,
			aspect: { ...review.aspect, trustRating: 10, inDepthRating: 'x' }
		} as never);
		expect(offScale?.overallStars).toBeNull();
		expect(offScale?.aspects).toMatchObject({ trust: null, 'in-depth': null, expertise: 5 });
	});

	it('W-4 (negative): no id, no appointment, a moderation the contract lacks ⇒ none; no aspect record ⇒ no aspects', () => {
		expect(mapOwnReview({ ...review, id: null } as never)).toBeNull();
		expect(mapOwnReview({ ...review, appointmentId: 3 } as never)).toBeNull();
		expect(mapOwnReview({ ...review, ratingModerationStatus: 'HIDDEN' } as never)).toBeNull();
		expect(mapOwnReview({ ...review, aspect: null } as never)?.aspects).toBeNull();
		expect(mapOwnReview('x' as never)).toBeNull();
	});

	it('P-B4 §13.3.5 (card rule 5): by the `ratingId` of its appointment, without `as`, with the cookies; personal in the cache', async () => {
		const spy = answering(review);
		vi.stubGlobal('fetch', spy);
		await expect(getOwnReview('rat/1')).resolves.toMatchObject({ ratingId: 'rat-1' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toMatch(/\/appointment-rating\/ratings\/rat%2F1$/u);
		expect(new URL(url).search).toBe('');
		expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
		for (const data of [null, { id: 'rat-1' }, 'x']) {
			vi.stubGlobal('fetch', answering(data));
			await expect(getOwnReview('rat-1')).resolves.toBeNull();
		}
		expect(ownReviewQuery('rat-1')).toMatchObject({
			queryKey: ['appointments', 'review', 'rat-1'],
			meta: { personal: true }
		});
	});

	it('the submit posts the five and the words to the invitation; the answer is the review, `null` for none', async () => {
		const spy = answering(review, 201);
		vi.stubGlobal('fetch', spy);
		const body = {
			aspect: {
				inDepthRating: 10,
				trustRating: 9,
				expertiseRating: 10,
				punctualRating: 8,
				friendlyRating: 10
			},
			comment: 'Πολύ καλά.'
		};
		await expect(submitRating('inv-1', body)).resolves.toMatchObject({ ratingId: 'rat-1' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/appointment-rating/rating-invitations/inv-1/submit');
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual(body);
		vi.stubGlobal('fetch', answering({ id: 9 }, 201));
		await expect(submitRating('inv-1', body)).resolves.toBeNull();
	});
});

describe('why the invitation’s read or the submit was refused', () => {
	const refusal = (message: string, status: number) => new ApiError(message, status, '/x');

	it('a blocker named in the `403`; the one `403` of another account’s invitation; a second review; a field', () => {
		expect(readRatingFailure(refusal('Forbidden: RATING_INVITATION_EXPIRED', 403))).toEqual({
			kind: 'blocked',
			status: 403,
			blocker: 'RATING_INVITATION_EXPIRED'
		});
		expect(
			readRatingFailure(refusal('rating invitation is not accessible to this account.', 403)).kind
		).toBe('not-accessible');
		expect(readRatingFailure(refusal('Conflict', 409)).kind).toBe('already-rated');
		expect(readRatingFailure(refusal('comment cannot include angle brackets.', 422)).kind).toBe(
			'invalid'
		);
	});

	it('(negative) the session, the rate, nobody decided; a code that only starts the same is none', () => {
		expect(readRatingFailure(refusal('no', 401)).kind).toBe('session');
		expect(readRatingFailure(refusal('slow', 429)).kind).toBe('rate-limited');
		expect(readRatingFailure(refusal('down', 503)).kind).toBe('unknown');
		expect(readRatingFailure(new Error('offline')).kind).toBe('unknown');
		expect(readRatingFailure(refusal('RATING_INVITATION_EXPIREDX', 403))).toEqual({
			kind: 'not-accessible',
			status: 403,
			blocker: null
		});
	});
});
