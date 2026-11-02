import { describe, expect, it } from 'vitest';
import type { DoctorPublicMarketplaceProfileResponseView } from '$shared/lib/api-client';
import {
	DoctorProfileNotFoundError,
	extractParagraphs,
	mapDoctorProfile,
	mapDoctorReview
} from './map';

/** The backend's answer, the fields the mapper reads (the rest of the contract absent). */
function answer(doctor: Record<string, unknown> | null, pricingVisible = false) {
	return { doctor, pricingVisible } as unknown as DoctorPublicMarketplaceProfileResponseView;
}

const base = {
	doctorId: 'doc-1',
	slug: 'dr-athena',
	fullName: 'Αθηνά Παπαδοπούλου',
	professional: { id: 'pro-1', name: 'Παθολόγος', slug: 'pathologos' },
	images: [
		{
			id: 'img-1',
			mediumSizeUrl: 'https://media.example/m/1.jpg',
			lgSizeUrl: 'https://media.example/l/1.jpg',
			smSizeUrl: 'https://media.example/s/1.jpg',
			translations: [{ language: 'el', alt: 'Το ιατρείο' }]
		}
	],
	services: [
		{ doctorServiceId: 'svc-1', title: 'Simple visit', price: null, isSpecialized: true },
		{ doctorServiceId: 'svc-2', title: 'Vaccination', price: null }
	],
	socialLinks: {
		website: 'https://athena.example',
		facebook: 'javascript:alert(1)',
		instagram: 'data:text/html,x',
		linkedin: 'http://linkedin.example/in/athena'
	},
	description: {
		blocks: [
			{ children: [{ text: 'Πρώτη παράγραφος.' }] },
			{ children: [{ text: '  ' }] },
			{ children: [{ text: 'Δεύτερη' }, { text: 'παράγραφος.' }] }
		]
	}
};

describe('api/profile map', () => {
	it('U-36.2 (app = web): a service carries the server’s `isSpecialized` mark (absent ⇒ false)', () => {
		const profile = mapDoctorProfile(answer(base), { slug: 'dr-athena', lang: 'el' });
		expect(profile.services?.map((service) => [service.id, service.isSpecialized])).toEqual([
			['svc-1', true],
			['svc-2', false]
		]);
	});

	it('U-35.3: only `http(s)` links reach an `href` — a `javascript:` or `data:` address from the wire is dropped', () => {
		const profile = mapDoctorProfile(answer(base), { slug: 'dr-athena', lang: 'el' });
		expect(profile.socialLinks).toEqual([
			{ id: 'website', url: 'https://athena.example' },
			{ id: 'linkedin', url: 'http://linkedin.example/in/athena' }
		]);
	});

	it('U-41.1 / U-42.1: every photo with its three sizes and its words; the description’s paragraphs, blank ones dropped', () => {
		const profile = mapDoctorProfile(answer(base), { slug: 'dr-athena', lang: 'el' });
		expect(profile.images).toEqual([
			{
				id: 'img-1',
				url: 'https://media.example/m/1.jpg',
				largeUrl: 'https://media.example/l/1.jpg',
				thumbUrl: 'https://media.example/s/1.jpg',
				alt: 'Το ιατρείο'
			}
		]);
		expect(profile.description?.paragraphs).toEqual(['Πρώτη παράγραφος.', 'Δεύτερη παράγραφος.']);
		expect(extractParagraphs('not rich text')).toEqual([]);
	});

	it('U-34.4: the guest’s answer hides the prices (`pricingVisible`), the member’s shows them', () => {
		expect(mapDoctorProfile(answer(base), { slug: 'dr-athena', lang: 'el' }).pricingVisible).toBe(
			false
		);
		expect(
			mapDoctorProfile(answer(base, true), { slug: 'dr-athena', lang: 'el' }).pricingVisible
		).toBe(true);
	});

	it('Π7 / 404: a `doctor: null` answer is no profile — the mapper never makes one up', () => {
		expect(() => mapDoctorProfile(answer(null), { slug: 'dr-gone', lang: 'el' })).toThrow(
			DoctorProfileNotFoundError
		);
	});

	it('U-43 (app = web): `responseMetrics` of a MANUAL doctor with values — the word as the design’s id, the rate, the visits (answer 1 of `s5m-backend.md`)', () => {
		const profile = mapDoctorProfile(
			answer({
				...base,
				responseMetrics: {
					windowMonths: 6,
					responseTime: 'WITHIN_HOUR',
					responseRatePercent: 85,
					completedVisitCount: 6
				}
			}),
			{ slug: 'dr-athena', lang: 'el' }
		);
		expect(profile.responseMetrics).toEqual({
			responseTimeId: 'within-hour',
			responseRatePercent: 85,
			completedVisits: 6
		});
	});

	it('U-43.1 (app = web): below the sample only the visits come (answer 2); before the first computation nothing at all (answer 3)', () => {
		const below = mapDoctorProfile(
			answer({
				...base,
				responseMetrics: {
					windowMonths: 6,
					responseTime: null,
					responseRatePercent: null,
					completedVisitCount: 3
				}
			}),
			{ slug: 'dr-athena', lang: 'el' }
		);
		expect(below.responseMetrics).toEqual({ completedVisits: 3 });
		const none = mapDoctorProfile(
			answer({
				...base,
				responseMetrics: {
					windowMonths: 6,
					responseTime: null,
					responseRatePercent: null,
					completedVisitCount: null
				}
			}),
			{ slug: 'dr-athena', lang: 'el' }
		);
		expect(none.responseMetrics).toBeUndefined();
		expect(
			mapDoctorProfile(answer(base), { slug: 'dr-athena', lang: 'el' }).responseMetrics
		).toBeUndefined();
	});

	it('U-43.2 (app = web): the four words map to the design’s ids; an unknown word or a rate out of 0..100 is left out, a «0%» stays', () => {
		const idOf = (responseTime: string) =>
			mapDoctorProfile(
				answer({
					...base,
					responseMetrics: {
						windowMonths: 6,
						responseTime,
						responseRatePercent: null,
						completedVisitCount: null
					}
				}),
				{ slug: 'dr-athena', lang: 'el' }
			).responseMetrics?.responseTimeId;
		expect(['WITHIN_HOUR', 'WITHIN_FEW_HOURS', 'WITHIN_DAY', 'FEW_DAYS'].map(idOf)).toEqual([
			'within-hour',
			'within-few-hours',
			'within-day',
			'few-days'
		]);
		expect(idOf('SOON')).toBeUndefined();
		expect(idOf('toString')).toBeUndefined();
		const rateOf = (responseRatePercent: number) =>
			mapDoctorProfile(
				answer({
					...base,
					responseMetrics: {
						windowMonths: 6,
						responseTime: null,
						responseRatePercent,
						completedVisitCount: null
					}
				}),
				{ slug: 'dr-athena', lang: 'el' }
			).responseMetrics?.responseRatePercent;
		expect(rateOf(0)).toBe(0);
		expect(rateOf(140)).toBeUndefined();
		expect(rateOf(-1)).toBeUndefined();
	});

	it('U-45.2: «Επιλογή ασθενών» is the backend’s `isPatientsChoice` — only a `true` marks the doctor; `false` or a missing field is no badge', () => {
		const of = (doctor: Record<string, unknown>) =>
			mapDoctorProfile(answer(doctor), { slug: 'dr-athena', lang: 'el' }).isPatientsChoice;
		expect(of({ ...base, isPatientsChoice: true })).toBe(true);
		expect(of({ ...base, isPatientsChoice: false })).toBe(false);
		expect(of(base)).toBe(false);
		expect(of({ ...base, isPatientsChoice: 'true' })).toBe(false);
	});

	it('U-49 (app = web): every score on the 5 stars passes as it comes — the average, the aspects’ averages, a review’s overall and its half-star aspects', () => {
		const profile = mapDoctorProfile(
			answer({
				...base,
				rating: {
					average: 4.91,
					count: 12,
					aspectAverages: { trustRating: 4.95, expertiseRating: 4.5, punctualRating: null }
				},
				reviewsPreview: [
					{
						id: 'rev-1',
						comment: 'Εξαιρετική.',
						patientName: 'Μαρία Κ.',
						patientInitial: 'Μ',
						createdAt: '2026-10-01T10:00:00Z',
						overallRating: 4.28,
						aspect: { trustRating: 4.5, expertiseRating: 5, punctualRating: 0.5 }
					}
				]
			}),
			{ slug: 'dr-athena', lang: 'el' }
		);
		expect(profile.rating).toBe(4.91);
		expect(profile.reviewSummary).toEqual({ count: 12, score: 4.91 });
		expect(profile.reviewChips).toEqual([
			{ id: 'trust', score: 4.95 },
			{ id: 'expertise', score: 4.5 }
		]);
		expect(profile.reviewSnippets?.[0]).toMatchObject({
			rating: 4.28,
			aspects: [
				{ id: 'trust', score: 4.5 },
				{ id: 'expertise', score: 5 },
				{ id: 'punctuality', score: 0.5 }
			]
		});
	});

	it('U-49 (negative): a value above 5 (the old 1–10 scale) never reaches the page — no average, no aspect, no review with it; never clamped, never halved', () => {
		const profile = mapDoctorProfile(
			answer({
				...base,
				rating: {
					average: 9.2,
					count: 12,
					aspectAverages: { trustRating: 9.6, expertiseRating: 4.5 }
				},
				reviewsPreview: [
					{
						id: 'rev-old',
						comment: 'Παλιά κλίμακα.',
						patientName: 'Νίκος Π.',
						patientInitial: 'Ν',
						createdAt: '2026-10-01T10:00:00Z',
						overallRating: 8.56,
						aspect: { trustRating: 9 }
					}
				]
			}),
			{ slug: 'dr-athena', lang: 'el' }
		);
		expect(profile.rating).toBe(0);
		expect(profile.reviewSummary).toBeUndefined();
		expect(profile.reviewChips).toEqual([{ id: 'expertise', score: 4.5 }]);
		expect(profile.reviewSnippets).toBeUndefined();
		expect(
			mapDoctorReview({
				id: 'rev-2',
				comment: 'Καλή.',
				patientName: 'Ελένη',
				patientInitial: 'Ε',
				createdAt: '2026-10-01T10:00:00Z',
				overallRating: 4.5,
				aspect: { trustRating: 10, expertiseRating: 4 }
			} as never)?.aspects
		).toEqual([{ id: 'expertise', score: 4 }]);
	});
});
