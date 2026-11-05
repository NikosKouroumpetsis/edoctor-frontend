import { describe, expect, it } from 'vitest';
import type {
	DoctorPublicMarketplaceReviewsResponseView,
	DoctorPublicMarketplaceReviewsSummaryResponseView
} from '$shared/lib/api-client';
import { isDoctorReviewTopic, mapDoctorReviews, mapDoctorReviewsSummary } from './map';
import { DOCTOR_REVIEW_TOPICS } from '$modules/doctor/config/review-topics';
import { doctorReviewsQueryKeys, normalizeDoctorReviewSearch } from './queries';

const review = {
	id: 'r1',
	comment: '<b>Καλή</b>',
	patientName: 'Μαρία Κ.',
	patientInitial: 'Κ',
	createdAt: '2026-10-01T10:00:00Z',
	overallRating: 4.5,
	doctorReply: ' Ευχαριστώ ',
	doctorReplyAt: '2026-10-02T10:00:00Z',
	aspect: {}
};

const summaryWith = (topics: unknown[]) =>
	mapDoctorReviewsSummary({
		summary: {
			count: 12,
			average: 4.9,
			distribution: [],
			aspectAverages: {},
			topics
		},
		language: 'el'
	} as unknown as DoctorPublicMarketplaceReviewsSummaryResponseView);

describe('doctor::api::reviews', () => {
	it('U-91.2: six topics, none about the wait: the wait is no topic, from the wire or an address', () => {
		expect(DOCTOR_REVIEW_TOPICS).toEqual([
			'COURTESY',
			'EXPLANATION',
			'ORGANIZATION',
			'CLEANLINESS',
			'PATIENCE',
			'ACCESS'
		]);
		for (const value of ['WAIT', 'PUNCTUALITY', 'courtesy', '', '<script>', null, undefined, 1]) {
			expect(isDoctorReviewTopic(value), String(value)).toBe(false);
		}
	});

	it('U-66.2: the topics in the server’s order; empty when it has none', () => {
		expect(
			summaryWith([
				{ topic: 'PATIENCE', count: 62 },
				{ topic: 'COURTESY', count: 53 }
			])?.topics
		).toEqual([
			{ topic: 'PATIENCE', count: 62 },
			{ topic: 'COURTESY', count: 53 }
		]);
		expect(summaryWith([])?.topics).toEqual([]);
	});

	it('U-65.6, U-91.2 (negative): a topic off the list or a count of none from the wire is left out', () => {
		expect(
			summaryWith([
				{ topic: 'WAIT', count: 40 },
				{ topic: '<b>x</b>', count: 3 },
				{ topic: 'ACCESS', count: 0 },
				{ topic: 'ACCESS', count: -1 },
				{ topic: 'CLEANLINESS', count: 35 }
			])?.topics
		).toEqual([{ topic: 'CLEANLINESS', count: 35 }]);
	});

	it('U-66.2: each topic has its own cache entry', () => {
		const key = (mention: 'COURTESY' | 'ACCESS' | null) =>
			JSON.stringify(doctorReviewsQueryKeys.list('s', 'el', { sort: 'newest', q: null, mention }));
		expect(new Set([key(null), key('COURTESY'), key('ACCESS')]).size).toBe(3);
	});

	it('U-66.3: a page’s facts: the approved reply and its day, the next page and the total', () => {
		const page = mapDoctorReviews({
			reviews: [review],
			nextCursor: 'next',
			total: 184,
			language: 'el'
		} as unknown as DoctorPublicMarketplaceReviewsResponseView);
		expect(page?.nextCursor).toBe('next');
		expect(page?.total).toBe(184);
		expect(page?.reviews[0].reply).toEqual({
			body: 'Ευχαριστώ',
			repliedAt: '2026-10-02T10:00:00Z'
		});
		// U-65.6: the words stay as written; the page draws them as text.
		expect(page?.reviews[0].body).toBe('<b>Καλή</b>');
	});

	it('U-66.3 (negative): no reply, no block; a hidden doctor is `null`, kept apart from no reviews', () => {
		const page = mapDoctorReviews({
			reviews: [{ ...review, doctorReply: null, doctorReplyAt: null }],
			nextCursor: null,
			total: 1,
			language: 'el'
		} as unknown as DoctorPublicMarketplaceReviewsResponseView);
		expect(page?.reviews[0]).not.toHaveProperty('reply');
		expect(
			mapDoctorReviews({
				reviews: null,
				nextCursor: null,
				total: null,
				language: 'el'
			} as unknown as DoctorPublicMarketplaceReviewsResponseView)
		).toBeNull();
	});

	it('U-66.3: the totals are the server’s: always the five stars from 5 down', () => {
		const summary = mapDoctorReviewsSummary({
			summary: {
				count: 3,
				average: 4.9,
				distribution: [
					{ star: 1, count: 1 },
					{ star: 5, count: 2 }
				],
				aspectAverages: {
					trustRating: 4.95,
					expertiseRating: null,
					punctualRating: null,
					friendlyRating: null,
					inDepthRating: null
				},
				topics: []
			},
			language: 'el'
		} as unknown as DoctorPublicMarketplaceReviewsSummaryResponseView);
		expect(summary?.buckets).toEqual([
			{ star: 5, count: 2 },
			{ star: 4, count: 0 },
			{ star: 3, count: 0 },
			{ star: 2, count: 0 },
			{ star: 1, count: 1 }
		]);
		expect(summary?.chips).toEqual([{ id: 'trust', score: 4.95 }]);
		expect(
			mapDoctorReviewsSummary({
				summary: null,
				language: 'el'
			} as unknown as DoctorPublicMarketplaceReviewsSummaryResponseView)
		).toBeNull();
	});

	it('🔴 U-65.6: the search as the server takes it: ≤ 100 characters, ≤ 8 words, no control characters', () => {
		expect(normalizeDoctorReviewSearch('   ')).toBeNull();
		expect(normalizeDoctorReviewSearch(null)).toBeNull();
		expect(normalizeDoctorReviewSearch(' καλή  γιατρός ')).toBe('καλή γιατρός');
		expect(normalizeDoctorReviewSearch('α'.repeat(150))?.length).toBe(100);
		expect(normalizeDoctorReviewSearch('1 2 3 4 5 6 7 8 9 10')).toBe('1 2 3 4 5 6 7 8');
		expect(normalizeDoctorReviewSearch('α\u0000β')).toBe('α β');
		expect(normalizeDoctorReviewSearch('%_\\')).toBe('%_\\');
	});
});
