import { describe, expect, it } from 'vitest';
import type { DoctorReviewsSummary } from '$modules/doctor/api/reviews';
import { sampleDoctorProfile } from '../detail.sample';
import {
	buildDoctorOfficePage,
	buildDoctorReviewListCard,
	buildDoctorReviewsModalContent,
	doctorOfficePageTitle
} from './index';

describe('lib/detail build-modal-content (the reviews window)', () => {
	it('U-45.2 (app = web): the window’s score carries «Επιλογή ασθενών» and its explanation only for a doctor the backend marks', () => {
		const doctor = sampleDoctorProfile({ isPatientsChoice: true });
		const header = buildDoctorReviewsModalContent({
			doctor,
			summary: null,
			locale: 'el'
		})?.header;
		expect(header?.badgeTitle).toBe('Επιλογή ασθενών');
		// 🔴 U-67.2 Ε3: what the code really checks, in the approved words.
		expect(header?.description).toBe(
			'Αυτός ο γιατρός είναι Επιλογή ασθενών: μέσος όρος τουλάχιστον 4,8 από τουλάχιστον 5 κριτικές.'
		);
		expect(header?.scoreLabel).toBe('4,90');
	});

	it('U-45.2 (negative) — αντικαθίσταται από U-45.2 ο κανόνας «κάθε γιατρός με κριτικές»: a rated doctor the backend does not mark keeps the score, without the badge or its line', () => {
		const doctor = sampleDoctorProfile();
		const header = buildDoctorReviewsModalContent({
			doctor,
			summary: null,
			locale: 'el'
		})?.header;
		expect(header?.scoreLabel).toBe('4,90');
		expect(header).not.toHaveProperty('badgeTitle');
		expect(header).not.toHaveProperty('description');
	});

	it('U-66.2, U-91.2: the section with its six labels and the server’s order; none without a topic', () => {
		const doctor = sampleDoctorProfile();
		const summary = {
			count: 10,
			average: 4.5,
			buckets: [],
			chips: [],
			topics: [
				{ topic: 'PATIENCE', count: 1234 },
				{ topic: 'EXPLANATION', count: 46 },
				{ topic: 'CLEANLINESS', count: 35 },
				{ topic: 'COURTESY', count: 53 },
				{ topic: 'ORGANIZATION', count: 44 },
				{ topic: 'ACCESS', count: 27 }
			]
		} satisfies DoctorReviewsSummary;
		const el = buildDoctorReviewsModalContent({ doctor, summary, locale: 'el' }).mentions;
		expect(el?.title).toBe('Οι ασθενείς αναφέρουν');
		expect(el?.clearLabel).toBe('Καθαρισμός');
		expect(el?.chips.map(({ label, count }) => [label, count])).toEqual([
			['Υπομονή', '1.234'],
			['Εξήγηση', '46'],
			['Καθαριότητα ιατρείου', '35'],
			['Ευγένεια', '53'],
			['Οργάνωση', '44'],
			['Πρόσβαση', '27']
		]);
		const en = buildDoctorReviewsModalContent({ doctor, summary, locale: 'en' }).mentions;
		expect(en?.title).toBe('Patients mention');
		expect(en?.chips.map(({ label }) => label)).toEqual([
			'Patience',
			'Explanations',
			'Cleanliness',
			'Courtesy',
			'Organisation',
			'Getting there'
		]);

		for (const empty of [null, undefined, { ...summary, topics: [] }]) {
			expect(
				buildDoctorReviewsModalContent({ doctor, summary: empty, locale: 'el' }).mentions
			).toBeNull();
		}
	});

	it('U-66.3: the bars and the aspects are the server’s totals, `null` until they are in', () => {
		const doctor = sampleDoctorProfile();
		expect(
			buildDoctorReviewsModalContent({ doctor, summary: null, locale: 'el' }).ratings
		).toBeNull();
		const { ratings } = buildDoctorReviewsModalContent({
			doctor,
			summary: {
				count: 10,
				average: 4.5,
				buckets: [
					{ star: 5, count: 8 },
					{ star: 4, count: 2 },
					{ star: 3, count: 0 },
					{ star: 2, count: 0 },
					{ star: 1, count: 0 }
				],
				chips: [{ id: 'trust', score: 4.95 }],
				topics: []
			},
			locale: 'el'
		});
		expect(ratings?.buckets[0]).toEqual({ star: 5, count: 8, share: 0.8 });
		expect(ratings?.chips).toEqual([{ id: 'trust', title: 'Εμπιστοσύνη', score: '4,95' }]);
	});

	it('U-66.1 Π7, Π8: a list’s card has its day in words, half stars, and the approved reply', () => {
		const now = Date.parse('2026-11-04T10:00:00Z');
		const review = {
			id: 'r',
			body: 'Καλή.',
			patientName: 'Μαρία Κ.',
			patientInitial: 'Κ',
			publishedAt: '2026-11-01T10:00:00Z',
			rating: 4.5
		};
		const plain = buildDoctorReviewListCard(review, { doctorName: 'Dr. Α', locale: 'el', now });
		expect(plain.relativeLabel).toBe('Πριν από 3 ημέρες');
		expect(plain.rating).toBe(4.5);
		expect(plain).not.toHaveProperty('reply');
		const answered = buildDoctorReviewListCard(
			{ ...review, reply: { body: 'Ευχαριστώ.', repliedAt: '2026-11-04T08:00:00Z' } },
			{ doctorName: 'Dr. Α', locale: 'el', now }
		);
		expect(answered.reply).toEqual({
			lead: 'Απάντηση από',
			author: 'Dr. Α',
			dateLabel: 'Σήμερα',
			body: 'Ευχαριστώ.'
		});
	});

	it('U-68.1 Ε3: «Τα ιατρεία» with two offices or more, else «Το ιατρείο»', () => {
		expect(doctorOfficePageTitle(2, 'el')).toBe('Τα ιατρεία');
		expect(doctorOfficePageTitle(1, 'el')).toBe('Το ιατρείο');
		expect(doctorOfficePageTitle(0, 'el')).toBe('Το ιατρείο');
	});

	it('U-34.3, P-B §7: the office’s page has each part only with data, the directions by its point', () => {
		const empty = buildDoctorOfficePage({
			facts: { street: 'Νίκης', streetNumber: '12', city: 'Αθήνα' },
			officeCount: 1,
			locale: 'el',
			now: 0
		});
		expect(empty.hours).toEqual([]);
		expect(empty.photos).toEqual([]);
		expect(empty).not.toHaveProperty('gettingThere');
		expect(new URL(empty.directionsUrl ?? '').searchParams.get('destination')).toMatch(/Νίκης 12/u);
		const full = buildDoctorOfficePage({
			facts: {
				street: 'Νίκης',
				streetNumber: '12',
				latitude: 37.9,
				longitude: 23.7,
				gettingThere: 'Με το μετρό.',
				images: [{ id: 'i', url: '/m', largeUrl: '/l', thumbUrl: '/s' }]
			},
			officeCount: 2,
			locale: 'el',
			now: 0
		});
		expect(full.title).toBe('Τα ιατρεία');
		expect(new URL(full.directionsUrl ?? '').searchParams.get('destination')).toBe('37.9,23.7');
		expect(full.photos[0].alt).toBe('Φωτογραφία 1 από 1');
	});
});
