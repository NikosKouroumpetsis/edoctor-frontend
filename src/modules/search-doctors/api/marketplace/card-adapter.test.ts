import { describe, expect, it } from 'vitest';

import { mapCardToDoctor } from './card-adapter';
import type { DoctorPublicMarketplaceCardView } from './types';

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

describe('mapCardToDoctor', () => {
	it('maps a full wire card into a DoctorCard', () => {
		const doctor = mapCardToDoctor(buildCard(), { pricingVisible: true });

		expect(doctor).toEqual({
			id: 'doc-1',
			doctorSlug: 'ada-lovelace',
			name: 'Ada Lovelace',
			specialty: 'Cardiologist',
			city: 'Athens · Attica',
			imageUrl: 'https://cdn.example.com/md.jpg',
			availabilityLabel: 'Today',
			visitFeeLabel: 'EUR 30-50',
			rating: 4.5,
			reviewCount: 12
		});
	});

	it('prefers the medium image url', () => {
		const doctor = mapCardToDoctor(
			buildCard({
				primaryImage: {
					id: 'img-1',
					smSizeUrl: 'https://cdn.example.com/sm.jpg',
					mediumSizeUrl: 'https://cdn.example.com/md.jpg',
					priority: null
				}
			}),
			{ pricingVisible: true }
		);

		expect(doctor.imageUrl).toBe('https://cdn.example.com/md.jpg');
	});

	it('falls back to the placeholder when the medium url is blank', () => {
		// The contract types both image urls as non-null strings, so the adapter's
		// `medium ?? small` only skips a nullish medium, never an empty one; a blank
		// medium url flows through `resolveMediaUrl('')` to the placeholder.
		const doctor = mapCardToDoctor(
			buildCard({
				primaryImage: {
					id: 'img-1',
					smSizeUrl: 'https://cdn.example.com/sm.jpg',
					mediumSizeUrl: '',
					priority: null
				}
			}),
			{ pricingVisible: true }
		);

		expect(doctor.imageUrl).toBe('/doctor-placeholder.svg');
	});

	it('uses the placeholder when there is no image', () => {
		const doctor = mapCardToDoctor(buildCard({ primaryImage: null }), { pricingVisible: true });

		expect(doctor.imageUrl).toBe('/doctor-placeholder.svg');
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
			{ pricingVisible: true }
		);

		expect(doctor.imageUrl).toBe('http://localhost:8080/media/md.jpg');
	});

	it('hides the fee when pricing is not visible', () => {
		const doctor = mapCardToDoctor(buildCard(), { pricingVisible: false });

		expect(doctor.visitFeeLabel).toBe('');
	});

	it('hides the fee when the price range is absent', () => {
		const doctor = mapCardToDoctor(buildCard({ priceRange: null }), { pricingVisible: true });

		expect(doctor.visitFeeLabel).toBe('');
	});

	it('hides the fee when a price bound is open-ended (nullable per contract)', () => {
		const doctor = mapCardToDoctor(buildCard({ priceRange: { min: 30, max: null } }), {
			pricingVisible: true
		});

		expect(doctor.visitFeeLabel).toBe('');
	});

	it('renders a single value when min and max match', () => {
		const doctor = mapCardToDoctor(buildCard({ priceRange: { min: 40, max: 40 } }), {
			pricingVisible: true
		});

		expect(doctor.visitFeeLabel).toBe('EUR 40');
	});

	it('honors a custom fee formatter', () => {
		const doctor = mapCardToDoctor(buildCard(), {
			pricingVisible: true,
			formatFee: (min, max) => `${min}€ - ${max}€`
		});

		expect(doctor.visitFeeLabel).toBe('30€ - 50€');
	});

	it('falls back to 0 rating and empty specialty/city when data is missing', () => {
		const doctor = mapCardToDoctor(
			buildCard({
				professional: null,
				primaryOffice: null,
				rating: { average: null, count: 0 }
			}),
			{ pricingVisible: true }
		);

		expect(doctor.specialty).toBe('');
		expect(doctor.city).toBe('');
		expect(doctor.rating).toBe(0);
		expect(doctor.reviewCount).toBe(0);
	});

	it('labels near-term availability from the boolean flags', () => {
		expect(
			mapCardToDoctor(
				buildCard({
					availability: {
						nextAvailableAt: null,
						hasToday: false,
						hasNext3Days: true,
						hasNext7Days: true
					}
				}),
				{ pricingVisible: true }
			).availabilityLabel
		).toBe('Next 3 days');

		expect(
			mapCardToDoctor(
				buildCard({
					availability: {
						nextAvailableAt: null,
						hasToday: false,
						hasNext3Days: false,
						hasNext7Days: false
					}
				}),
				{ pricingVisible: true }
			).availabilityLabel
		).toBe('');
	});
});
