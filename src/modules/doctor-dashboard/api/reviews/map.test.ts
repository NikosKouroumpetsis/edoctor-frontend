import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	deleteDoctorReviewReply,
	getDoctorAppointmentReview,
	getDoctorReviewsSummary,
	listDoctorReviews,
	reportDoctorReview,
	writeDoctorReviewReply
} from './endpoints';
import { readDoctorReviewsFailure } from './failure';
import {
	mapDoctorReview,
	mapDoctorReviewsPage,
	mapDoctorReviewsSummary,
	toDoctorReviewReportBody
} from './map';
import {
	sampleReviewAppointmentId,
	sampleReviewId,
	sampleReviewRow,
	sampleReviewRows,
	sampleReviewsServer,
	sampleReviewsSummary,
	sampleReviewVisit
} from './reviews.sample';

/*
 * Wave 5.2 · screen 84 (D-W52-84 … 90, `w52-b8` §10): the doctor's reviews as the contract writes them — read field by
 * field, ONLY what the server gave, and the calls with the cookies, `no-store`, the doctor's side, nothing of a doctor.
 */

afterEach(() => {
	vi.unstubAllGlobals();
});

function serve(start: Parameters<typeof sampleReviewsServer>[0] = {}) {
	const server = sampleReviewsServer(start);
	const spy = vi.fn(server.fetch);
	vi.stubGlobal('fetch', spy);
	return { server, spy };
}

describe('api/reviews · map (D-W52-84 / 85)', () => {
	it('🔴 D-W52-84: one review field by field — the patient as the public page names them, the stars, the words, the reply with its state; never a note of the team', () => {
		const review = mapDoctorReview({
			...sampleReviewRow(2, {
				name: ' Ιωάννα ',
				initial: 'Κ',
				reply: { status: 'APPROVED', text: ' Ευχαριστώ. ', at: '2026-11-11T09:00:00.000Z' }
			}),
			ratingModerationNote: 'σημείωση της ομάδας',
			replyModerationNote: 'σημείωση'
		});
		expect(review).toEqual({
			id: sampleReviewId(2),
			appointmentId: sampleReviewAppointmentId(2),
			patientName: 'Ιωάννα',
			patientInitial: 'Κ',
			stars: 5,
			comment: 'Πολύ προσεκτική και ήρεμη.',
			reply: 'Ευχαριστώ.',
			replyAt: '2026-11-11T09:00:00.000Z',
			replyStatus: 'APPROVED',
			replyRejectionReason: null,
			createdAt: '2026-11-13T09:00:00.000Z'
		});
		expect(JSON.stringify(review)).not.toContain('σημείωση');
	});

	it('🔴 D-W52-86α: the reason of a rejected reply — kept, as text, ONLY while the reply is `REJECTED`; none in every other state, none without words', () => {
		const rejected = (reason: unknown, status = 'REJECTED') =>
			mapDoctorReview({
				...sampleReviewRow(6, {
					reply: {
						status: status as 'REJECTED',
						text: 'Ευχαριστώ.',
						at: '2026-10-03T09:00:00.000Z'
					}
				}),
				replyRejectionReason: reason
			});
		expect(rejected(' Γράφει στοιχεία υγείας. ')).toMatchObject({
			replyStatus: 'REJECTED',
			replyRejectionReason: 'Γράφει στοιχεία υγείας.'
		});
		expect(rejected('<img src=x onerror=alert(1)>')?.replyRejectionReason).toBe(
			'<img src=x onerror=alert(1)>'
		);
		expect(rejected('α'.repeat(1200))?.replyRejectionReason).toHaveLength(1000);
		for (const status of ['PENDING', 'APPROVED']) {
			expect(rejected('λόγος', status)?.replyRejectionReason, status).toBeNull();
		}
		for (const reason of [null, undefined, '  ', 7, { text: 'x' }]) {
			expect(rejected(reason)?.replyRejectionReason, String(reason)).toBeNull();
		}
		// No reply at all (NONE): never a reason, whatever came.
		expect(
			mapDoctorReview({ ...sampleReviewRow(1), replyRejectionReason: 'λόγος' })
				?.replyRejectionReason
		).toBeNull();
	});

	it('🔴 U-65.6 (negative): an id out of the server’s shape, stars off the scale, a state the contract does not name — no review; a reply without words — none', () => {
		const row = sampleReviewRow(1);
		expect(mapDoctorReview({ ...row, id: '../x' })).toBeNull();
		expect(mapDoctorReview({ ...row, appointmentId: 7 })).toBeNull();
		expect(mapDoctorReview({ ...row, overallRating: 9 })).toBeNull();
		expect(mapDoctorReview({ ...row, overallRating: Number.NaN })).toBeNull();
		expect(mapDoctorReview({ ...row, replyModerationStatus: 'HIDDEN' })).toBeNull();
		expect(mapDoctorReview({ ...row, createdAt: 'yesterday' })).toBeNull();
		expect(mapDoctorReview(null)).toBeNull();
		expect(mapDoctorReview([row])).toBeNull();
		expect(
			mapDoctorReview({ ...row, replyModerationStatus: 'PENDING', doctorReply: '  ' })
		).toMatchObject({ reply: null, replyStatus: 'NONE', replyAt: null });
		// A state of NONE never carries words, whatever came.
		expect(mapDoctorReview({ ...row, doctorReply: 'ξεχασμένη' })).toMatchObject({
			reply: null,
			replyStatus: 'NONE'
		});
		// Markup stays text.
		expect(mapDoctorReview({ ...row, comment: '<img src=x onerror=alert(1)>' })?.comment).toBe(
			'<img src=x onerror=alert(1)>'
		);
	});

	it('🔴 D-W52-84 / 87: a page — ONLY what the server gave: a broken review stays out, each id once, the visits and the reports of the page, the total as the server counts it', () => {
		const rows = sampleReviewRows();
		const page = mapDoctorReviewsPage({
			items: [...rows.slice(0, 2), { ...rows[2], id: 'no' }, rows[0]],
			nextCursor: 'c2',
			total: 24,
			visits: [
				sampleReviewVisit(1),
				sampleReviewVisit(2, { officeTimeZone: 'Europe/Athens; drop' }),
				sampleReviewVisit(3, { startTime: 'soon' }),
				{ ...sampleReviewVisit(4), serviceTitles: ['Επίσκεψη', 7, ' ', '<b>x</b>'] }
			],
			openReports: [
				{ ratingId: sampleReviewId(1), reportedAt: '2026-11-14T10:00:00.000Z' },
				{ ratingId: 'x', reportedAt: '2026-11-14T10:00:00.000Z' },
				{ ratingId: sampleReviewId(2), reportedAt: 'later' }
			]
		});
		expect(page?.items.map((item) => item.id)).toEqual([sampleReviewId(1), sampleReviewId(2)]);
		expect(page?.total).toBe(24);
		expect(page?.nextCursor).toBe('c2');
		expect(page?.visits.map((visit) => visit.appointmentId)).toEqual([
			sampleReviewAppointmentId(1),
			sampleReviewAppointmentId(4)
		]);
		expect(page?.visits[0]).toEqual({
			appointmentId: sampleReviewAppointmentId(1),
			startTime: '2026-11-11T08:00:00.000Z',
			timeZone: 'Europe/Athens',
			serviceTitles: ['Ηλεκτροκαρδιογράφημα']
		});
		expect(page?.visits[1]?.serviceTitles).toEqual(['Επίσκεψη', '<b>x</b>']);
		expect(page?.openReports).toEqual([
			{ ratingId: sampleReviewId(1), reportedAt: '2026-11-14T10:00:00.000Z' }
		]);
		// The patient's side has no visits and no reports: none, never a failure.
		expect(mapDoctorReviewsPage({ items: [], nextCursor: null, total: 0 })).toEqual({
			items: [],
			nextCursor: null,
			total: 0,
			visits: [],
			openReports: []
		});
		expect(mapDoctorReviewsPage({ items: 'x' })).toBeNull();
		expect(mapDoctorReviewsPage(null)).toBeNull();
		expect(
			mapDoctorReviewsPage({ items: [], nextCursor: 'x'.repeat(600), total: -1 })
		).toMatchObject({ nextCursor: null, total: 0 });
	});

	it('🔴 D-W52-85: the summary — count, average, the five stars 5 → 1 each once, the five averages all or none, ONLY the six topics, and `pendingCount`', () => {
		expect(mapDoctorReviewsSummary(sampleReviewsSummary())).toEqual({
			count: 24,
			average: 4.8,
			distribution: [
				{ star: 5, count: 19 },
				{ star: 4, count: 3 },
				{ star: 3, count: 1 },
				{ star: 2, count: 1 },
				{ star: 1, count: 0 }
			],
			aspects: {
				trust: 4.9,
				expertise: 4.9,
				punctuality: 4.5,
				friendliness: 4.8,
				inDepth: 4.7
			},
			topics: [
				{ topic: 'EXPLANATION', count: 11 },
				{ topic: 'COURTESY', count: 9 },
				{ topic: 'PATIENCE', count: 6 },
				{ topic: 'ORGANIZATION', count: 4 },
				{ topic: 'CLEANLINESS', count: 3 },
				{ topic: 'ACCESS', count: 2 }
			],
			pendingCount: 1
		});
		const broken = mapDoctorReviewsSummary({
			...sampleReviewsSummary(),
			distribution: [
				{ star: 5, count: 3 },
				{ star: 5, count: 9 },
				{ star: 6, count: 1 }
			],
			aspectAverages: { trustRating: 4 },
			topics: [
				{ topic: 'WAIT', count: 3 },
				{ topic: 'COURTESY', count: 2 },
				{ topic: 'COURTESY', count: 7 }
			]
		});
		expect(broken?.distribution).toEqual([
			{ star: 5, count: 3 },
			{ star: 4, count: 0 },
			{ star: 3, count: 0 },
			{ star: 2, count: 0 },
			{ star: 1, count: 0 }
		]);
		expect(broken?.aspects).toBeNull();
		// 🔴 U-91.2: never a topic of the wait.
		expect(broken?.topics).toEqual([{ topic: 'COURTESY', count: 2 }]);
		expect(
			mapDoctorReviewsSummary({ ...sampleReviewsSummary(), count: 0, average: 4.8 })
		).toMatchObject({ average: null, aspects: null });
		expect(mapDoctorReviewsSummary({ count: 'x', pendingCount: 0 })).toBeNull();
		expect(mapDoctorReviewsSummary(null)).toBeNull();
	});

	it('🔴 D-W52-87: a report’s body — one reason, the words only when there are any', () => {
		expect(toDoctorReviewReportBody('OFFENSIVE', '  ')).toEqual({ reason: 'OFFENSIVE' });
		expect(toDoctorReviewReportBody('OTHER', ' λόγος ')).toEqual({
			reason: 'OTHER',
			text: 'λόγος'
		});
	});
});

describe('api/reviews · the calls (D-W52-84 … 90)', () => {
	it('🔴 D-W52-84: the list — the doctor’s side, published only, «Χωρίς απάντηση» as `NONE`, the page’s size and cursor, with the cookies and `no-store`, never a doctor', async () => {
		const { spy, server } = serve();
		await listDoctorReviews({ filter: 'all', limit: 20 });
		await listDoctorReviews({ filter: 'unanswered', limit: 20, cursor: '20' });
		expect(server.calls.map((call) => [call.path, call.query])).toEqual([
			[
				'/appointment-rating/ratings',
				{ as: 'doctor', ratingModerationStatus: 'APPROVED', limit: '20' }
			],
			[
				'/appointment-rating/ratings',
				{
					as: 'doctor',
					ratingModerationStatus: 'APPROVED',
					replyModerationStatus: 'NONE',
					limit: '20',
					cursor: '20'
				}
			]
		]);
		for (const [, init] of spy.mock.calls) {
			expect(init).toMatchObject({ credentials: 'include', cache: 'no-store' });
		}
		expect(JSON.stringify(server.calls)).not.toMatch(/doctorId/u);
	});

	it('🔴 D-W52-89: the review of ONE appointment — the list’s own filter, `limit=1`; 🔴 D-W52-85 the summary in the page’s language', async () => {
		const { server } = serve();
		const page = await getDoctorAppointmentReview(sampleReviewAppointmentId(2));
		expect(page?.items.map((item) => item.id)).toEqual([sampleReviewId(2)]);
		await getDoctorReviewsSummary('en');
		expect(server.calls.map((call) => [call.path, call.query])).toEqual([
			[
				'/appointment-rating/ratings',
				{
					as: 'doctor',
					appointmentId: sampleReviewAppointmentId(2),
					ratingModerationStatus: 'APPROVED',
					limit: '1'
				}
			],
			['/doctor/me/reviews/summary', { lang: 'en' }]
		]);
	});

	it('🔴 D-W52-86 / 87: the writes — a new reply (`POST`), its change (`PATCH`), its deletion (`DELETE`), a report — ONE call each, the words alone', async () => {
		const { server } = serve();
		expect(
			(await writeDoctorReviewReply(sampleReviewId(1), 'Ευχαριστώ!', 'new'))?.replyStatus
		).toBe('PENDING');
		await writeDoctorReviewReply(sampleReviewId(2), 'Ευχαριστώ ξανά!', 'change');
		expect((await deleteDoctorReviewReply(sampleReviewId(2)))?.replyStatus).toBe('NONE');
		expect(await reportDoctorReview(sampleReviewId(4), 'OFFENSIVE', '')).toBe(true);
		expect(server.writes().map((call) => [call.method, call.path, call.body])).toEqual([
			['POST', `/appointment-rating/ratings/${sampleReviewId(1)}/reply`, { reply: 'Ευχαριστώ!' }],
			[
				'PATCH',
				`/appointment-rating/ratings/${sampleReviewId(2)}/reply`,
				{ reply: 'Ευχαριστώ ξανά!' }
			],
			['DELETE', `/appointment-rating/ratings/${sampleReviewId(2)}/reply`, undefined],
			['POST', `/appointment-rating/ratings/${sampleReviewId(4)}/report`, { reason: 'OFFENSIVE' }]
		]);
	});

	it('the keys: every read under `reviews()`, so a write reads them all again', () => {
		const root = doctorDashboardQueryKeys.reviews();
		for (const key of [
			doctorDashboardQueryKeys.reviewList('all'),
			doctorDashboardQueryKeys.reviewList('unanswered'),
			doctorDashboardQueryKeys.reviewSummary('el'),
			doctorDashboardQueryKeys.review(sampleReviewId(1)),
			doctorDashboardQueryKeys.appointmentReview(sampleReviewAppointmentId(1))
		]) {
			expect(key.slice(0, root.length)).toEqual([...root]);
		}
	});
});

describe('api/reviews · the refusals (D-W52-86 / 87, `w52-b8` §10)', () => {
	const refused = (status: number, message = 'Refused') =>
		readDoctorReviewsFailure(new ApiError(message, status, '/appointment-rating/ratings/x/reply'));

	it('each status and each of the server’s words in the page’s own kind of refusal', () => {
		expect(refused(401)).toBe('session');
		expect(refused(429)).toBe('rate-limited');
		expect(refused(403, 'Forbidden: rating is not accessible to this account.')).toBe('gone');
		expect(refused(404)).toBe('gone');
		expect(refused(409, 'Already exist: rating is not published.')).toBe('gone');
		expect(refused(409, 'Already exist: An open report already exists for this rating.')).toBe(
			'reported'
		);
		expect(refused(409, 'Already exist: Doctor reply already exists for this rating.')).toBe(
			'changed'
		);
		expect(refused(409, 'Already exist: Doctor reply does not exist for this rating.')).toBe(
			'changed'
		);
		expect(refused(422, 'Validation Error: reply')).toBe('invalid');
		expect(refused(500)).toBe('unknown');
		expect(refused(0)).toBe('unknown');
		expect(readDoctorReviewsFailure(new Error('x'))).toBe('unknown');
	});
});
