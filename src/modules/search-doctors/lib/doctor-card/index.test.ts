import { describe, expect, it, vi } from 'vitest';
import type { SearchDoctorsCardFacts } from '$modules/search-doctors/api/marketplace/types';
import {
	buildDoctorCard,
	buildFee,
	buildSearchResultCard,
	formatAddressLabel,
	formatAvailabilityLabel,
	formatBadgeLabel,
	formatDistanceLabel,
	formatInstantDayTime,
	formatRatingLabel,
	formatReviewCountLabel
} from '.';

/** An Athens wall-clock reading as the instant it names (EEST until 25/10/2026 04:00, EET after). */
const athens = (iso: string) => Date.parse(iso);

// The server's «now»: Saturday 24 October 2026, 12:00 in Athens (the application's fixture).
const NOW = athens('2026-10-24T12:00:00+03:00');

describe('search-doctors::lib::doctor-card', () => {
	// The application's own cases (`application/src/shared/lib/format-day-time/index.unit.spec.ts`), word for word.
	it.each([
		['today', athens('2026-10-24T18:30:00+03:00'), 'Σήμερα · 18:30', 'Today · 18:30'],
		['tomorrow', athens('2026-10-25T09:00:00+02:00'), 'Αύριο · 09:00', 'Tomorrow · 09:00'],
		['later', athens('2026-10-26T10:00:00+02:00'), 'Δευ 26 Οκτ · 10:00', 'Mon, Oct 26 · 10:00'],
		[
			'another month',
			athens('2026-11-02T10:00:00+02:00'),
			'Δευ 2 Νοε · 10:00',
			'Mon, Nov 2 · 10:00'
		],
		[
			'another year',
			athens('2027-01-04T10:00:00+02:00'),
			'Δευ 4 Ιαν · 10:00',
			'Mon, Jan 4 · 10:00'
		],
		['earlier today', athens('2026-10-24T09:00:00+03:00'), 'Σήμερα · 09:00', 'Today · 09:00']
	])(
		'U-20 (S-32.9): the card writes a slot of %s as the application does (el «%s»)',
		(_, instant, el, en) => {
			expect(formatInstantDayTime(instant, NOW, 'el')).toBe(el);
			expect(formatInstantDayTime(instant, NOW, 'en')).toBe(en);
		}
	);

	it('U-20 (S-32.9): never the old shapes — no «Μεθαύριο», no «26/10 9:00», no time without its «·»', () => {
		const dayAfter = formatInstantDayTime(athens('2026-10-26T09:00:00+02:00'), NOW, 'el');
		expect(dayAfter).toBe('Δευ 26 Οκτ · 09:00');
		expect(dayAfter).not.toContain('Μεθαύριο');
		expect(dayAfter).not.toBe('26/10 9:00');
		expect(formatInstantDayTime(athens('2026-10-25T10:00:00+02:00'), NOW, 'el')).not.toBe(
			'Αύριο 10:00'
		);
	});

	it('U-20 (D-118): today and tomorrow are the Greek calendar’s, across Greek midnight and whatever the device clock', () => {
		const slot = athens('2026-10-25T00:15:00+03:00');
		expect(formatInstantDayTime(slot, athens('2026-10-24T23:45:00+03:00'), 'el')).toBe(
			'Αύριο · 00:15'
		);
		expect(formatInstantDayTime(slot, athens('2026-10-25T00:05:00+03:00'), 'el')).toBe(
			'Σήμερα · 00:15'
		);
		expect(formatInstantDayTime(slot, athens('2026-10-23T23:45:00+03:00'), 'el')).toBe(
			'Κυρ 25 Οκτ · 00:15'
		);
		vi.useFakeTimers({ now: NOW - 24 * 60 * 60 * 1000 });
		try {
			expect(formatInstantDayTime(athens('2026-10-25T09:00:00+02:00'), NOW, 'el')).toBe(
				'Αύριο · 09:00'
			);
		} finally {
			vi.useRealTimers();
		}
		expect(formatInstantDayTime(Number.NaN, NOW, 'el')).toBe('');
	});

	it('U-20: the availability line — the next slot from today on, else the flags, else nothing (a past slot never shows)', () => {
		const next = (nextAvailableAt: string | null, hasToday = false, hasNext3Days = false) =>
			formatAvailabilityLabel({ nextAvailableAt, hasToday, hasNext3Days }, NOW, 'el');
		expect(next('2026-10-30T10:00:00+02:00')).toBe('Παρ 30 Οκτ · 10:00');
		expect(next('2026-10-20T10:00:00+03:00', false, true)).toBe('Επόμενες 3 ημέρες');
		expect(next(null, true)).toBe('Σήμερα');
		expect(next('not-a-date')).toBe('');
	});

	it('U-20: the fee — the guest’s sign-in words while pricing is hidden, «on request» without a price, else «Από»', () => {
		expect(buildFee(60, false, 'el')).toEqual({ kind: 'login', label: 'Συνδεθείτε για κόστος' });
		expect(buildFee(null, true, 'el')).toEqual({
			kind: 'on-request',
			label: 'Επικοινωνία για κόστος'
		});
		const amount = buildFee(60, true, 'el');
		expect(amount.kind).toBe('amount');
		expect(amount.label).toMatch(/^Από 60\s€$/u);
		expect(buildFee(42.5, true, 'en').label).toBe('From €42.50');
	});

	it('U-20 (S-31.1, app = web): the rating — «4,9» in Greek, «4.9» in English, «Νέο» only without reviews (the count decides)', () => {
		expect(formatRatingLabel(4.9, 12, 'el')).toBe('4,9');
		expect(formatRatingLabel(4.9, 12, 'en')).toBe('4.9');
		expect(formatRatingLabel(5, 3, 'el')).toBe('5,0');
		expect(formatRatingLabel(4.2, 0, 'el')).toBe('Νέο');
		expect(formatRatingLabel(null, 0, 'en')).toBe('New');
		expect(formatRatingLabel(null, 4, 'el')).toBe('0,0');
	});
});

/**
 * The results card's lines (U-24.1), from the application's `lib/doctor-card` cases. Rewritten for U-24.1, with the
 * reason: the application's «builds the list-variant location line as «city · street streetNumber»», «omits the
 * address part … when the street is absent» and «S-31.3: shows the distance first …» pinned its former line
 * («Athens · Ermou 17», «0,1 χλμ · Piraeus · Ermou 17»); the approved card writes the full address as an address
 * — «Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι» — and the distance after it («· 0,6 χλμ», §7.4). S-31.3 itself stands: the
 * distance only when the server measured one.
 */
describe('search-doctors::lib::doctor-card (results card, U-24.1)', () => {
	it('U-24.1: builds the full address «street number, area», and degrades to what there is', () => {
		const office = { city: 'Αμπελόκηποι', street: 'Λεωφόρος Αλεξάνδρας', streetNumber: '112' };
		expect(formatAddressLabel(office, 'el')).toBe('Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι');
		expect(formatAddressLabel({ city: 'Αμπελόκηποι' }, 'el')).toBe('Αμπελόκηποι');
		expect(formatAddressLabel({ city: 'Αμπελόκηποι', streetNumber: '17' }, 'el')).toBe(
			'17, Αμπελόκηποι'
		);
		expect(formatAddressLabel(null, 'el')).toBe('');
		expect(formatAddressLabel({ street: 'Ερμού', streetNumber: '17' }, 'el')).toBe('Ερμού 17');
	});

	it('S-31.3 (U-24.1): the distance follows the address when the server sent one, and nothing otherwise', () => {
		const office = { city: 'Πειραιάς', street: 'Ακτή Μιαούλη', streetNumber: '25' };
		expect(formatAddressLabel({ ...office, distanceKm: 0.6 }, 'el')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς · 0,6 χλμ'
		);
		expect(formatAddressLabel({ ...office, distanceKm: 0.08 }, 'el')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς · 0,1 χλμ'
		);
		expect(formatAddressLabel({ ...office, distanceKm: 2.46 }, 'en')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς · 2.5 km'
		);
		expect(formatAddressLabel({ ...office, distanceKm: 3 }, 'el')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς · 3 χλμ'
		);
		expect(formatAddressLabel({ ...office, distanceKm: 0 }, 'el')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς · 0,1 χλμ'
		);
		expect(formatAddressLabel(office, 'el')).not.toContain('χλμ');
		expect(formatAddressLabel({ ...office, distanceKm: null }, 'el')).toBe(
			'Ακτή Μιαούλη 25, Πειραιάς'
		);
		expect(formatDistanceLabel(Number.NaN, 'el')).toBe('');
	});

	it('S-31.1: names a doctor with no reviews «Νέο» and shows no review count', () => {
		expect(formatRatingLabel(0, 0, 'el')).toBe('Νέο');
		expect(formatReviewCountLabel(0, 'el')).toBeNull();
		expect(formatReviewCountLabel(Number.NaN, 'el')).toBeNull();
		expect(formatRatingLabel(5, 1, 'el')).toBe('5,0');
		expect(formatReviewCountLabel(1, 'el')).toBe('1');
		expect(formatReviewCountLabel(1234, 'el')).toBe('1.234');
		expect(formatReviewCountLabel(1234, 'en')).toBe('1,234');
	});
});

// 🔴 U-32.1: the cards are built here from the api's facts (the application's `buildSearchDoctorCard`).
describe('search-doctors::lib::doctor-card (the cards from the facts, U-32.1)', () => {
	const facts = (overrides: Partial<SearchDoctorsCardFacts> = {}): SearchDoctorsCardFacts => ({
		id: 'd1',
		doctorSlug: 'maria-alexiou',
		name: 'Μαρία Αλεξίου',
		professionalName: 'Καρδιολόγος',
		imageUrl: null,
		office: {
			city: 'Αμπελόκηποι',
			street: 'Λεωφόρος Αλεξάνδρας',
			streetNumber: '112',
			distanceKm: 0.6
		},
		point: { latitude: 37.989, longitude: 23.7605 },
		description: ' Καρδιολόγος με 15 χρόνια. ',
		availability: {
			nextAvailableAt: '2026-10-25T09:00:00+02:00',
			hasToday: false,
			hasNext3Days: true
		},
		rating: 4.9,
		reviewCount: 184,
		pricingVisible: true,
		primaryServicePrice: 60,
		readAt: NOW,
		...overrides
	});

	it('U-32.1: the home’s card and the results card from the same facts — every line in the page’s language, the day on the card’s `readAt`', () => {
		const card = buildDoctorCard(facts(), 'el');
		expect(card).toEqual({
			id: 'd1',
			doctorSlug: 'maria-alexiou',
			name: 'Μαρία Αλεξίου',
			specialty: 'Καρδιολόγος',
			area: 'Αμπελόκηποι',
			imageUrl: null,
			availabilityLabel: 'Αύριο · 09:00',
			fee: { kind: 'amount', label: expect.stringMatching(/^Από 60\s€$/u) },
			ratingLabel: '4,9'
		});
		expect(buildSearchResultCard(facts(), 'en')).toMatchObject({
			specialty: 'Καρδιολόγος',
			availabilityLabel: 'Tomorrow · 09:00',
			description: 'Καρδιολόγος με 15 χρόνια.',
			address: 'Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι · 0.6\u00a0km',
			reviewCountLabel: '184',
			point: { latitude: 37.989, longitude: 23.7605 },
			pinLabel: '€60'
		});
	});

	it('U-32.1 (negative, D-118): the words follow the clock the card was read at, never the device’s — a device a day ahead still writes «Αύριο»', () => {
		vi.useFakeTimers({ now: athens('2026-10-25T12:00:00+02:00'), toFake: ['Date'] });
		try {
			expect(buildDoctorCard(facts(), 'el').availabilityLabel).toBe('Αύριο · 09:00');
			expect(buildDoctorCard(facts({ readAt: Date.now() }), 'el').availabilityLabel).toBe(
				'Σήμερα · 09:00'
			);
		} finally {
			vi.useRealTimers();
		}
		// A guest's pin is the dot and a blank description is none, from the same facts.
		expect(
			buildSearchResultCard(facts({ pricingVisible: false, description: '  ' }), 'el')
		).toMatchObject({
			fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' },
			pinLabel: null,
			description: null
		});
	});

	it('U-45.2 (app = web): «Επιλογή ασθενών» only on a card the backend marks (`badgeId`), in the page’s language; a card without one has no badge, whatever its rating', () => {
		expect(buildDoctorCard(facts({ badgeId: 'patient-favorite' }), 'el').badgeLabel).toBe(
			'Επιλογή ασθενών'
		);
		expect(buildSearchResultCard(facts({ badgeId: 'patient-favorite' }), 'en').badgeLabel).toBe(
			'Patient favorite'
		);
		expect(buildDoctorCard(facts({ rating: 5, reviewCount: 900 }), 'el')).not.toHaveProperty(
			'badgeLabel'
		);
		expect(formatBadgeLabel(undefined, 'el')).toBeUndefined();
	});
});
