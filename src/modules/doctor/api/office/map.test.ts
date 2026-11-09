import { describe, expect, it } from 'vitest';
import type {
	DoctorPublicMarketplaceOfficeDetailView,
	DoctorPublicMarketplaceOfficeResponseView
} from '$shared/lib/api-client';
import { mapDoctorOffice } from './map';

const office = (
	patch: Partial<Record<keyof DoctorPublicMarketplaceOfficeDetailView, unknown>> = {}
) =>
	({
		office: {
			officeId: 'off-1',
			city: 'Πειραιάς',
			state: 'Αττική',
			street: 'Καραΐσκου',
			streetNumber: '74',
			postalCode: '18532',
			floor: 3,
			description: null,
			phone: '2104123456',
			parking: true,
			disabilityAccess: true,
			paymentOptions: ['CASH'],
			latitude: 37.94,
			longitude: 23.64,
			distanceKm: null,
			images: [],
			weeklyHours: null,
			gettingThere: null,
			amenities: {
				parkingKinds: ['STREET', 'PRIVATE'],
				accessibleToilet: true,
				accessibleParking: true,
				elevator: true,
				nearPublicTransport: true
			},
			...patch
		},
		availability: null,
		bookingPolicy: null,
		language: 'el'
	}) as unknown as DoctorPublicMarketplaceOfficeResponseView;

describe('doctor · api/office: the office’s details (🔴 P-W3 §3.5, Σ-22, D-W3-19, Ε6)', () => {
	it('the details of the office’s own read, as the app’s ids, in the kit’s order', () => {
		expect(mapDoctorOffice(office(), 'off-1')?.amenities).toEqual({
			parkingKinds: ['private', 'street'],
			accessibleToilet: true,
			accessibleParking: true,
			elevator: true,
			nearPublicTransport: true
		});
	});

	it('(negative) Ε6: a detail without its parent is never shown — kinds without parking, the toilet and the space without step-free access, an elevator on the ground floor or on no floor', () => {
		expect(
			mapDoctorOffice(office({ parking: false, disabilityAccess: false, floor: 0 }), 'off-1')
				?.amenities
		).toEqual({
			parkingKinds: [],
			accessibleToilet: false,
			accessibleParking: false,
			elevator: false,
			nearPublicTransport: true
		});
		expect(mapDoctorOffice(office({ floor: null }), 'off-1')?.amenities?.elevator).toBe(false);
		expect(mapDoctorOffice(office({ floor: -1 }), 'off-1')?.amenities?.elevator).toBe(true);
	});

	it('(negative) W-4: an unknown kind, a broken group, an older server without one — left out, never a guess; no detail ⇒ none at all', () => {
		expect(
			mapDoctorOffice(
				office({
					amenities: {
						parkingKinds: ['BOAT', 'constructor', 'toString', 7, 'PUBLIC_NEARBY'],
						accessibleToilet: 'yes',
						accessibleParking: 1,
						elevator: 'true',
						nearPublicTransport: null
					}
				}),
				'off-1'
			)?.amenities
		).toEqual({
			parkingKinds: ['public-nearby'],
			accessibleToilet: false,
			accessibleParking: false,
			elevator: false,
			nearPublicTransport: false
		});
		for (const amenities of [undefined, null, 'all', [], { parkingKinds: 'PRIVATE' }]) {
			const facts = mapDoctorOffice(office({ amenities }), 'off-1');
			expect(facts, JSON.stringify(amenities)).not.toBeNull();
			expect(facts, JSON.stringify(amenities)).not.toHaveProperty('amenities');
		}
	});

	it('U-65.6 (negative): the details are flags and ids only — no text of the server reaches them', () => {
		const facts = mapDoctorOffice(
			office({
				amenities: {
					parkingKinds: ['<img src=x onerror=alert(1)>'],
					accessibleToilet: true,
					accessibleParking: false,
					elevator: false,
					nearPublicTransport: false
				}
			}),
			'off-1'
		);
		expect(JSON.stringify(facts?.amenities)).not.toContain('<img');
		expect(facts?.amenities?.parkingKinds).toEqual([]);
	});
});
