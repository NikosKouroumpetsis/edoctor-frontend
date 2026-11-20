import type { DoctorReviewsPageView, DoctorReviewsSummaryView } from './types';

type SampleRating = DoctorReviewsPageView['items'][number];
type SampleVisit = NonNullable<DoctorReviewsPageView['visits']>[number];
type SampleAnswer = { status: number; data?: unknown; body?: unknown };
type SampleCall = { method: string; path: string; query: Record<string, string>; body: unknown };

const DOCTOR_ID = '0199a0d0-0000-7000-8000-0000000000d1';
/** Tests only: server ids of the made-up reviews, `…0c01`, `…0c02`, … */
export const sampleReviewId = (index: number) =>
	`0193d000-0000-7000-8000-000000000c${String(index).padStart(2, '0')}`;
/** Tests only: the appointment each review names, `…0a01`, `…0a02`, … */
export const sampleReviewAppointmentId = (index: number) =>
	`0193d000-0000-7000-8000-000000000a${String(index).padStart(2, '0')}`;

/**
 * One published review as the wire writes it (`AppointmentRatingResponseView`): the doctor's side, so every reply with
 * its state and never a note of the team. Made-up people.
 */
export function sampleReviewRow(
	index: number,
	input: {
		name?: string | null;
		initial?: string | null;
		stars?: number;
		comment?: string | null;
		createdAt?: string;
		reply?: { status: 'PENDING' | 'APPROVED' | 'REJECTED'; text: string; at: string } | null;
		/** 🔴 D-W52-86α: the doctor's list carries the team's reason of a rejected reply (`null` otherwise). */
		reason?: string | null;
	} = {}
): SampleRating {
	const reply = input.reply ?? null;
	return {
		id: sampleReviewId(index),
		appointmentId: sampleReviewAppointmentId(index),
		doctorId: DOCTOR_ID,
		patientId: `0193d000-0000-7000-8000-000000000b${String(index).padStart(2, '0')}`,
		patientName: input.name === undefined ? 'Κατερίνα' : input.name,
		patientInitial: input.initial === undefined ? 'Λ' : input.initial,
		overallRating: input.stars ?? 5,
		comment: input.comment === undefined ? 'Πολύ προσεκτική και ήρεμη.' : input.comment,
		ratingModerationStatus: 'APPROVED',
		ratingModerationNote: null,
		ratingModeratedAt: '2026-11-13T10:00:00.000Z',
		ratingModeratedByUserId: null,
		doctorReply: reply?.text ?? null,
		doctorReplyAt: reply?.at ?? null,
		replyModerationStatus: reply?.status ?? 'NONE',
		replyModerationNote: null,
		replyModeratedAt: null,
		replyModeratedByUserId: null,
		createdAt: input.createdAt ?? '2026-11-13T09:00:00.000Z',
		updatedAt: input.createdAt ?? '2026-11-13T09:00:00.000Z',
		aspect: null,
		replyRejectionReason: input.reason ?? null
	};
}

/** The visit of one review: Wednesday 11 November 2026, 10:00 Athens, an ECG. */
export function sampleReviewVisit(index: number, input: Partial<SampleVisit> = {}): SampleVisit {
	return {
		appointmentId: sampleReviewAppointmentId(index),
		startTime: '2026-11-11T08:00:00.000Z',
		officeTimeZone: 'Europe/Athens',
		serviceTitles: ['Ηλεκτροκαρδιογράφημα'],
		...input
	};
}

/**
 * The prototype's six reviews (`sw.js` `RV`), newest first, with the four states of the reply: none, published, being
 * checked, none, a rating alone, not published.
 */
export function sampleReviewRows(): SampleRating[] {
	return [
		sampleReviewRow(1, { createdAt: '2026-11-13T09:00:00.000Z' }),
		sampleReviewRow(2, {
			name: 'Ιωάννα',
			initial: 'Κ',
			comment: 'Εξαιρετική γιατρός.',
			createdAt: '2026-11-10T09:00:00.000Z',
			reply: {
				status: 'APPROVED',
				text: 'Σας ευχαριστώ πολύ για τα καλά σας λόγια.',
				at: '2026-11-11T09:00:00.000Z'
			}
		}),
		sampleReviewRow(3, {
			name: 'Αντώνης',
			initial: 'Π',
			stars: 4,
			comment: 'Πολύ καλή εξέταση, αλλά περίμενα αρκετή ώρα.',
			createdAt: '2026-11-06T09:00:00.000Z',
			reply: {
				status: 'PENDING',
				text: 'Σας ευχαριστώ. Έχετε δίκιο.',
				at: '2026-11-07T09:00:00.000Z'
			}
		}),
		sampleReviewRow(4, {
			name: 'Σοφία',
			initial: 'Ρ',
			stars: 2,
			comment: 'Δεν μπορούσα να βρω το ιατρείο στο τηλέφωνο.',
			createdAt: '2026-10-28T09:00:00.000Z'
		}),
		sampleReviewRow(5, {
			name: 'Παύλος',
			initial: 'Μ',
			comment: null,
			createdAt: '2026-10-20T09:00:00.000Z'
		}),
		sampleReviewRow(6, {
			name: 'Χρήστος',
			initial: 'Β',
			stars: 4,
			comment: 'Καλή εμπειρία συνολικά.',
			createdAt: '2026-10-02T09:00:00.000Z',
			reply: {
				status: 'REJECTED',
				text: 'Ευχαριστώ. Μην ξεχάσετε το Holter την Τρίτη.',
				at: '2026-10-03T09:00:00.000Z'
			},
			reason: 'Μια δημόσια απάντηση δεν γράφει στοιχεία υγείας του ασθενή.'
		})
	];
}

/** The summary for the doctor alone (`DoctorMyReviewsSummaryView`), the prototype's numbers. */
export function sampleReviewsSummary(input: Partial<DoctorReviewsSummaryView> = {}) {
	return {
		pendingCount: 1,
		count: 24,
		average: 4.8,
		distribution: [
			{ star: 5, count: 19 },
			{ star: 4, count: 3 },
			{ star: 3, count: 1 },
			{ star: 2, count: 1 },
			{ star: 1, count: 0 }
		],
		aspectAverages: {
			inDepthRating: 4.7,
			trustRating: 4.9,
			expertiseRating: 4.9,
			punctualRating: 4.5,
			friendlyRating: 4.8
		},
		topics: [
			{ topic: 'EXPLANATION', count: 11 },
			{ topic: 'COURTESY', count: 9 },
			{ topic: 'PATIENCE', count: 6 },
			{ topic: 'ORGANIZATION', count: 4 },
			{ topic: 'CLEANLINESS', count: 3 },
			{ topic: 'ACCESS', count: 2 }
		],
		...input
	} satisfies DoctorReviewsSummaryView;
}

/**
 * Tests only: the doctor's reviews on a small server in memory — the list of the doctor's side page after page (newest
 * first; `replyModerationStatus=NONE` reads NONE and REJECTED, the server's own rule), one review by its id (the one
 * `403` of D-107 for any other), the list of one appointment, the summary, and the writes of the reply and of a report
 * with the server's own refusals (409 «not published», «already exists», «does not exist», «open report»).
 */
export function sampleReviewsServer(
	start: {
		rows?: SampleRating[];
		visits?: SampleVisit[];
		reported?: string[];
		summary?: () => unknown;
		pageSize?: number;
	} = {}
) {
	let rows: SampleRating[] = [...(start.rows ?? sampleReviewRows())];
	const visits: SampleVisit[] =
		start.visits ?? rows.map((_, index) => sampleReviewVisit(index + 1));
	const reported = new Set(start.reported ?? []);
	const calls: SampleCall[] = [];
	const planted: { method: string; ending: string; answer: SampleAnswer }[] = [];
	const pageSize = start.pageSize ?? 20;

	const reply = ({ status, data, body }: SampleAnswer) =>
		new Response(
			JSON.stringify(
				body ?? { status: status < 400 ? 'success' : 'error', message: '', data: data ?? null }
			),
			{ status: status === 204 ? 200 : status }
		);
	const refusal = (status: number, errorMessage: string): SampleAnswer => ({
		status,
		body: { errorCode: `EC${status}`, errorMessage }
	});
	const forbidden = () => refusal(403, 'Forbidden: rating is not accessible to this account.');

	function page(query: Record<string, string>): SampleAnswer {
		let shown = rows;
		if (query.appointmentId)
			shown = shown.filter((row) => row.appointmentId === query.appointmentId);
		if (query.replyModerationStatus === 'NONE') {
			shown = shown.filter((row) => ['NONE', 'REJECTED'].includes(row.replyModerationStatus));
		}
		// The server's page never larger than this one's (a test may make it smaller than what the page asks).
		const limit = Math.min(Number(query.limit ?? pageSize), pageSize);
		const from = query.cursor ? Number(query.cursor) : 0;
		const items = shown.slice(from, from + limit);
		const next = from + limit < shown.length ? String(from + limit) : null;
		return {
			status: 200,
			data: {
				items,
				nextCursor: next,
				total: shown.length,
				visits: visits.filter((visit) =>
					items.some((item) => item.appointmentId === visit.appointmentId)
				),
				openReports: items
					.filter((item) => reported.has(item.id))
					.map((item) => ({ ratingId: item.id, reportedAt: '2026-11-14T10:00:00.000Z' }))
			}
		};
	}

	function writeReply(
		id: string,
		method: string,
		body: { reply?: unknown } | undefined
	): SampleAnswer {
		const at = rows.findIndex((row) => row.id === id);
		if (at < 0) return forbidden();
		const row = rows[at];
		if (method === 'DELETE') {
			if (row.replyModerationStatus === 'NONE')
				return refusal(409, 'Already exist: Doctor reply does not exist for this rating.');
			rows[at] = { ...row, doctorReply: null, doctorReplyAt: null, replyModerationStatus: 'NONE' };
			return { status: 200, data: rows[at] };
		}
		const text = body?.reply;
		if (typeof text !== 'string' || !text.trim() || text.length > 2000)
			return refusal(422, 'Validation Error: reply');
		if (method === 'POST' && !['NONE', 'REJECTED'].includes(row.replyModerationStatus))
			return refusal(409, 'Already exist: Doctor reply already exists for this rating.');
		if (method === 'PATCH' && !['PENDING', 'APPROVED'].includes(row.replyModerationStatus))
			return refusal(409, 'Already exist: Doctor reply does not exist for this rating.');
		rows[at] = {
			...row,
			doctorReply: text.trim(),
			doctorReplyAt: '2026-11-14T10:40:00.000Z',
			replyModerationStatus: 'PENDING'
		};
		return { status: 200, data: rows[at] };
	}

	function report(
		id: string,
		body: { reason?: unknown; text?: unknown } | undefined
	): SampleAnswer {
		if (!rows.some((row) => row.id === id)) return forbidden();
		const reasons = ['NOT_MY_PATIENT', 'OFFENSIVE', 'PERSONAL_DATA', 'NOT_ABOUT_VISIT', 'OTHER'];
		if (!body || !reasons.includes(String(body.reason)))
			return refusal(422, 'Validation Error: reason');
		if (typeof body.text === 'string' && body.text.length > 1000)
			return refusal(422, 'Validation Error: text');
		if (reported.has(id))
			return refusal(409, 'Already exist: An open report already exists for this rating.');
		reported.add(id);
		return {
			status: 201,
			data: {
				id: '0193d000-0000-7000-8000-000000000e01',
				ratingId: id,
				reason: body.reason,
				text: typeof body.text === 'string' ? body.text : null,
				status: 'OPEN',
				createdAt: '2026-11-14T10:40:00.000Z'
			}
		};
	}

	async function fetchStub(input: string | URL | Request, init?: RequestInit): Promise<Response> {
		const url = new URL(input instanceof Request ? input.url : String(input));
		const method = init?.method ?? 'GET';
		const path = url.pathname.replace(/^.*\/api\/v\d+/u, '');
		const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
		const query = Object.fromEntries(url.searchParams);
		calls.push({ method, path, query, body });
		const index = planted.findIndex(
			(entry) => entry.method === method && path.endsWith(entry.ending)
		);
		if (index >= 0) return reply(planted.splice(index, 1)[0].answer);
		const RATINGS = '/appointment-rating/ratings';
		if (method === 'GET' && path === '/doctor/me/reviews/summary') {
			return reply({ status: 200, data: start.summary ? start.summary() : sampleReviewsSummary() });
		}
		if (method === 'GET' && path === RATINGS) return reply(page(query));
		const one = new RegExp(`^${RATINGS}/([^/]+)(?:/(reply|report))?$`, 'u').exec(path);
		if (one) {
			const id = decodeURIComponent(one[1]);
			if (method === 'GET' && !one[2]) {
				const found = rows.find((row) => row.id === id);
				return reply(found ? { status: 200, data: found } : forbidden());
			}
			if (one[2] === 'reply') return reply(writeReply(id, method, body));
			if (one[2] === 'report' && method === 'POST') return reply(report(id, body));
		}
		return reply(refusal(404, 'Resource not found'));
	}

	return {
		fetch: fetchStub,
		calls,
		/** The writes the server took or refused, in order. */
		writes: () => calls.filter((call) => call.method !== 'GET'),
		rows: () => rows,
		set(next: SampleRating[]) {
			rows = [...next];
		},
		refuse(method: string, ending: string, status: number, errorMessage = 'Refused') {
			planted.push({ method, ending, answer: refusal(status, errorMessage) });
		},
		plant(method: string, ending: string, answer: SampleAnswer) {
			planted.push({ method, ending, answer });
		}
	};
}
