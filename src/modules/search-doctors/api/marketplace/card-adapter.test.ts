import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordServerNow, resetServerClock } from '$shared/lib/server-clock';

import { buildDoctorCard, buildSearchResultCard } from '$modules/search-doctors/lib/doctor-card';
import { mapCardToFacts, type CardAdapterContext } from './card-adapter';
import type { DoctorPublicMarketplaceCardView } from './types';

/**
 * 🔴 U-32.1: the adapter answers the card's FACTS (`mapCardToFacts`) and `lib/doctor-card` writes them
 * (`buildDoctorCard`, `buildSearchResultCard`). The guards below read the two together, as every page does — the
 * former `mapCardToDoctor` / `mapCardToResultCard`, composed here — with their titles and assertions as before.
 */
type CardContext = CardAdapterContext & { lang: string };
const mapCardToDoctor = (
	card: DoctorPublicMarketplaceCardView,
	{ lang, ...context }: CardContext
) => buildDoctorCard(mapCardToFacts(card, context), lang);
const mapCardToResultCard = (
	card: DoctorPublicMarketplaceCardView,
	{ lang, ...context }: CardContext
) => buildSearchResultCard(mapCardToFacts(card, context), lang);

/**
 * The fixture is typed as the generated wire type (`DoctorPublicMarketplaceCardView`,
 * re-exported through `$shared/lib/api-client`). If the backend contract changes the
 * card shape, this test stops compiling, so the adapter stays contract-checked.
 */
function buildCard(
	overrides: Partial<DoctorPublicMarketplaceCardView> = {}
): DoctorPublicMarketplaceCardView {
	return {
		doctorId: 'doc-1',
		slug: 'ada-lovelace',
		fullName: 'Ada Lovelace',
		professional: { id: 'prof-1', name: 'Cardiologist', slug: 'cardiologist' },
		primaryOffice: {
			officeId: 'office-1',
			city: 'Athens',
			state: 'Attica',
			street: null,
			streetNumber: null,
			latitude: 37.98,
			longitude: 23.72,
			distanceKm: null
		},
		primaryImage: {
			id: 'img-1',
			smSizeUrl: 'https://cdn.example.com/sm.jpg',
			mediumSizeUrl: 'https://cdn.example.com/md.jpg',
			priority: 1
		},
		images: [],
		descriptionExcerpt: null,
		rating: { average: 4.5, count: 12 },
		availability: { nextAvailableAt: null, hasToday: true, hasNext3Days: true, hasNext7Days: true },
		priceRange: { min: 30, max: 50 },
		primaryServicePrice: 30,
		...overrides
	};
}

// The server's «now»: Saturday 24 October 2026, 12:00 in Athens (the application's fixture).
const NOW = Date.parse('2026-10-24T12:00:00+03:00');
const greek = { pricingVisible: false, lang: 'el', now: NOW };

/**
 * U-20 rewrites the pre-U-20 guards of this adapter, which pinned the old card's English words: «maps a full wire
 * card into a DoctorCard» (`city: 'Athens · Attica'`, `visitFeeLabel: 'EUR 30-50'`, `availabilityLabel: 'Today'`),
 * the placeholder file for a missing photo, the «EUR» range and its formatter, the 0 rating and «Next 3 days».
 * The home's card is the application's now: every line in the page's language, the fee and rating rules of
 * `search-doctors/lib/doctor-card`, the silhouette (`null`) for no photo.
 */
describe('mapCardToDoctor', () => {
	afterEach(() => resetServerClock());

	it('U-20: maps a wire card to the home’s card, every line in Greek — «Ειδικότητα · Περιοχή», the day and time, the guest’s fee, the rating', () => {
		const doctor = mapCardToDoctor(
			buildCard({
				availability: {
					nextAvailableAt: '2026-10-24T17:30:00+03:00',
					hasToday: true,
					hasNext3Days: true,
					hasNext7Days: true
				}
			}),
			greek
		);

		expect(doctor).toEqual({
			id: 'doc-1',
			doctorSlug: 'ada-lovelace',
			name: 'Ada Lovelace',
			specialty: 'Cardiologist',
			area: 'Athens',
			imageUrl: 'https://cdn.example.com/md.jpg',
			availabilityLabel: 'Σήμερα · 17:30',
			fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' },
			ratingLabel: '4,5'
		});
	});

	it('U-20: the fee is the application’s — «Από 30 €» with pricing, «Επικοινωνία για κόστος» without a visit price', () => {
		const fee = mapCardToDoctor(buildCard(), { ...greek, pricingVisible: true }).fee;
		expect(fee.kind).toBe('amount');
		expect(fee.label).toMatch(/^Από 30\s€$/u);
		expect(
			mapCardToDoctor(buildCard({ primaryServicePrice: null }), { ...greek, pricingVisible: true })
				.fee
		).toEqual({ kind: 'on-request', label: 'Επικοινωνία για κόστος' });
	});

	it('U-20 (app = web): a price that is not a finite number is no price («Επικοινωνία για κόστος»), never «60,00 €»', () => {
		const odd = buildCard({
			primaryServicePrice: '60' as unknown as number
		});
		expect(mapCardToDoctor(odd, { ...greek, pricingVisible: true }).fee).toEqual({
			kind: 'on-request',
			label: 'Επικοινωνία για κόστος'
		});
		expect(
			mapCardToDoctor(buildCard({ primaryServicePrice: Number.NaN }), {
				...greek,
				pricingVisible: true
			}).fee.kind
		).toBe('on-request');
	});

	it('U-20 (S-31.1): a doctor without reviews is «Νέο», never «0,0»', () => {
		const doctor = mapCardToDoctor(buildCard({ rating: { average: null, count: 0 } }), greek);
		expect(doctor.ratingLabel).toBe('Νέο');
	});

	it('S-32.8: no photo, or a blank one, is the silhouette (`null`); the medium size first, then the small', () => {
		expect(mapCardToDoctor(buildCard({ primaryImage: null }), greek).imageUrl).toBeNull();
		expect(
			mapCardToDoctor(
				buildCard({
					primaryImage: { id: 'i', smSizeUrl: ' ', mediumSizeUrl: '  ', priority: null }
				}),
				greek
			).imageUrl
		).toBeNull();
		expect(
			mapCardToDoctor(
				buildCard({
					primaryImage: {
						id: 'i',
						smSizeUrl: 'https://cdn.example.com/sm.jpg',
						mediumSizeUrl: ' ',
						priority: null
					}
				}),
				greek
			).imageUrl
		).toBe('https://cdn.example.com/sm.jpg');
	});

	// MINOR-5 (r2): the category rows map cards in the browser; r0 read «now» from the device (`Date.now()`), so a
	// device a day ahead wrote «Σήμερα» for tomorrow's slot. The adapter reads the server's «now» (D-118).
	it('D-118: without a «now» of its own the card reads the server’s clock — a device a day ahead still writes «Αύριο»', () => {
		const deviceNow = Date.parse('2026-11-11T12:00:00+02:00');
		vi.useFakeTimers({ now: deviceNow, toFake: ['Date'] });
		try {
			recordServerNow(Date.parse('2026-11-10T12:00:00+02:00'), deviceNow);
			const doctor = mapCardToDoctor(
				buildCard({
					availability: {
						nextAvailableAt: '2026-11-11T13:00:00+02:00',
						hasToday: false,
						hasNext3Days: true,
						hasNext7Days: true
					}
				}),
				{ pricingVisible: false, lang: 'el' }
			);
			expect(doctor.availabilityLabel).toBe('Αύριο · 13:00');
			expect(doctor.availabilityLabel).not.toBe('Σήμερα · 13:00');
		} finally {
			vi.useRealTimers();
		}
	});

	it('resolves a relative image path against the API origin', () => {
		const doctor = mapCardToDoctor(
			buildCard({
				primaryImage: {
					id: 'img-1',
					smSizeUrl: '/media/sm.jpg',
					mediumSizeUrl: '/media/md.jpg',
					priority: 1
				}
			}),
			greek
		);

		expect(doctor.imageUrl).toBe('http://localhost:8080/media/md.jpg');
	});

	it('U-20: empty specialty and area when the data lacks them (the card then draws only what it has)', () => {
		const doctor = mapCardToDoctor(buildCard({ professional: null, primaryOffice: null }), greek);
		expect(doctor.specialty).toBe('');
		expect(doctor.area).toBe('');
	});

	it('U-20: without a next slot, the flags speak — «Σήμερα», «Επόμενες 3 ημέρες», else nothing; English on /en', () => {
		const flags = (hasToday: boolean, hasNext3Days: boolean) =>
			buildCard({
				availability: { nextAvailableAt: null, hasToday, hasNext3Days, hasNext7Days: true }
			});
		expect(mapCardToDoctor(flags(true, true), greek).availabilityLabel).toBe('Σήμερα');
		expect(mapCardToDoctor(flags(false, true), greek).availabilityLabel).toBe('Επόμενες 3 ημέρες');
		expect(mapCardToDoctor(flags(false, false), greek).availabilityLabel).toBe('');
		expect(mapCardToDoctor(flags(false, true), { ...greek, lang: 'en' }).availabilityLabel).toBe(
			'Next 3 days'
		);
	});
});

/**
 * The results card (U-24.1) and the map's facts from the same card (§7.1, D-103), from the application's
 * `card-adapter` cases («maps the description excerpt to a description fact, dropping it when null», «S-31.3: keeps
 * the office distance the server sends, and drops a missing or unusable one»).
 */
describe('mapCardToResultCard', () => {
	const office = {
		officeId: 'office-1',
		city: 'Αμπελόκηποι',
		state: 'Αττική',
		street: 'Λεωφόρος Αλεξάνδρας',
		streetNumber: '112',
		latitude: 37.989,
		longitude: 23.7605,
		distanceKm: null
	};

	it('U-24.1: the home’s card and the list’s facts — description, full address, the number of reviews', () => {
		const card = mapCardToResultCard(
			buildCard({ primaryOffice: office, descriptionExcerpt: 'Καρδιολόγος με 15 χρόνια.' }),
			greek
		);
		expect(card).toMatchObject({
			name: 'Ada Lovelace',
			area: 'Αμπελόκηποι',
			description: 'Καρδιολόγος με 15 χρόνια.',
			address: 'Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι',
			reviewCountLabel: '12',
			ratingLabel: '4,5'
		});
		expect(
			mapCardToResultCard(buildCard({ descriptionExcerpt: null }), greek).description
		).toBeNull();
		expect(
			mapCardToResultCard(buildCard({ descriptionExcerpt: '  ' }), greek).description
		).toBeNull();
		expect(
			mapCardToResultCard(buildCard({ rating: { average: null, count: 0 } }), greek)
		).toMatchObject({ ratingLabel: 'Νέο', reviewCountLabel: null });
	});

	it('S-31.3: keeps the office distance the server sends, and drops a missing or unusable one', () => {
		const near = (distanceKm: number | null) =>
			mapCardToResultCard(buildCard({ primaryOffice: { ...office, distanceKm } }), greek).address;
		expect(near(0.6)).toBe('Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι · 0,6 χλμ');
		expect(near(null)).toBe('Λεωφόρος Αλεξάνδρας 112, Αμπελόκηποι');
		expect(near(Number.NaN)).not.toContain('χλμ');
		expect(near(-1)).not.toContain('χλμ');
	});

	it('U-24.4 (§7.1): the pin’s point is the office’s; without both coordinates there is none', () => {
		expect(mapCardToResultCard(buildCard({ primaryOffice: office }), greek).point).toEqual({
			latitude: 37.989,
			longitude: 23.7605
		});
		expect(
			mapCardToResultCard(buildCard({ primaryOffice: { ...office, latitude: null } }), greek).point
		).toBeNull();
		expect(
			mapCardToResultCard(buildCard({ primaryOffice: { ...office, longitude: Number.NaN } }), greek)
				.point
		).toBeNull();
		expect(mapCardToResultCard(buildCard({ primaryOffice: null }), greek).point).toBeNull();
	});

	it('U-24.4 (§7.1): the pin reads the price «60 €» while it shows, the dot (`null`) while it needs sign-in', () => {
		const price = (pricingVisible: boolean, primaryServicePrice: number | null) =>
			mapCardToResultCard(buildCard({ primaryServicePrice }), { ...greek, pricingVisible })
				.pinLabel;
		expect(price(true, 60)).toBe('60 €');
		expect(price(false, 60)).toBeNull();
		expect(price(true, null)).toBeNull();
		expect(
			mapCardToResultCard(buildCard({ primaryServicePrice: 60 }), {
				...greek,
				lang: 'en',
				pricingVisible: true
			}).pinLabel
		).toBe('€60');
	});
});

describe('mapCardToFacts (U-32.1: the api answers facts, the application’s model)', () => {
	afterEach(() => resetServerClock());

	it('U-32.1: a wire card as facts — the office, the availability, the rating and the price as sent, the photo resolved, the «now» it was read at', () => {
		const facts = mapCardToFacts(
			buildCard({
				descriptionExcerpt: '  Καρδιολόγος.  ',
				availability: {
					nextAvailableAt: '2026-10-24T17:30:00+03:00',
					hasToday: true,
					hasNext3Days: true,
					hasNext7Days: true
				}
			}),
			{ pricingVisible: true, now: NOW }
		);
		expect(facts).toEqual({
			id: 'doc-1',
			doctorSlug: 'ada-lovelace',
			name: 'Ada Lovelace',
			professionalName: 'Cardiologist',
			imageUrl: 'https://cdn.example.com/md.jpg',
			office: { city: 'Athens', street: null, streetNumber: null, distanceKm: null },
			point: { latitude: 37.98, longitude: 23.72 },
			description: '  Καρδιολόγος.  ',
			availability: {
				nextAvailableAt: '2026-10-24T17:30:00+03:00',
				hasToday: true,
				hasNext3Days: true
			},
			rating: 4.5,
			reviewCount: 12,
			pricingVisible: true,
			primaryServicePrice: 30,
			readAt: NOW
		});
	});

	it('U-32.1 (negative): the facts carry no words and no display format — no «Σήμερα», no fee words, no «Νέο», no €, no decimal comma', () => {
		const words = /Σήμερα|Today|Συνδεθείτε|Sign in|Επικοινωνία|Νέο|New|€|\d,\d/u;
		// Every text the facts hold (their numbers and flags write nothing).
		const texts = (value: unknown): string[] =>
			typeof value === 'string'
				? [value]
				: value && typeof value === 'object'
					? Object.values(value).flatMap(texts)
					: [];
		for (const pricingVisible of [true, false]) {
			const facts = mapCardToFacts(buildCard({ rating: { average: null, count: 0 } }), {
				pricingVisible,
				now: NOW
			});
			expect(texts(facts).length).toBeGreaterThan(4);
			expect(texts(facts).filter((text) => words.test(text))).toEqual([]);
			expect(facts.rating).toBe(0);
		}
		// The words are the lib's, from the same facts.
		expect(
			buildDoctorCard(
				mapCardToFacts(buildCard({ rating: { average: null, count: 0 } }), {
					pricingVisible: false,
					now: NOW
				}),
				'el'
			)
		).toMatchObject({ ratingLabel: 'Νέο', fee: { kind: 'login', label: 'Συνδεθείτε για κόστος' } });
	});
});

describe('mapCardToFacts — U-45.2 «Επιλογή ασθενών»', () => {
	afterEach(() => resetServerClock());

	const marked = (isPatientsChoice: unknown) =>
		({ ...buildCard(), isPatientsChoice }) as unknown as DoctorPublicMarketplaceCardView;

	it('U-45.2 (app = web): a card the backend marks (`items[].isPatientsChoice: true`) carries the badge — «Επιλογή ασθενών» on the home’s and the results’ cards', () => {
		expect(mapCardToFacts(marked(true), greek).badgeId).toBe('patient-favorite');
		expect(mapCardToDoctor(marked(true), greek).badgeLabel).toBe('Επιλογή ασθενών');
		expect(mapCardToResultCard(marked(true), greek).badgeLabel).toBe('Επιλογή ασθενών');
	});

	it('U-45.2 (negative): `false`, a missing field or anything but `true` is no badge — whatever the rating', () => {
		for (const card of [
			marked(false),
			marked('true'),
			marked(1),
			buildCard({ rating: { average: 4.9, count: 184 } })
		]) {
			expect(mapCardToFacts(card, greek)).not.toHaveProperty('badgeId');
			expect(mapCardToDoctor(card, greek)).not.toHaveProperty('badgeLabel');
		}
	});
});

describe('mapCardToFacts — U-49 the 5 stars', () => {
	afterEach(() => resetServerClock());

	it('U-49 (app = web): a card’s average on the 5 stars passes as it comes («4,9»)', () => {
		const card = buildCard({ rating: { average: 4.91, count: 12 } });
		expect(mapCardToFacts(card, greek).rating).toBe(4.91);
		expect(mapCardToDoctor(card, greek).ratingLabel).toBe('4,9');
	});

	it('U-49 (negative): an average above 5 (the old 1–10 scale) is no score on the card — never «9,2», never clamped to 5', () => {
		const card = buildCard({ rating: { average: 9.2, count: 12 } });
		expect(mapCardToFacts(card, greek).rating).toBe(0);
		expect(mapCardToDoctor(card, greek).ratingLabel).not.toMatch(/9|5,0/u);
	});
});
