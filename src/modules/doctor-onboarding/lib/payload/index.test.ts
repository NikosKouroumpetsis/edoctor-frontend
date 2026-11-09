import { describe, expect, it } from 'vitest';
import type { DoctorOnboardingOfficeFacts } from '$modules/doctor-onboarding/api/progress';
import {
	addressEditsOfDetails,
	addressEditsOfDevice,
	addressEditsOfManual,
	toDoctorActivationIntentInput,
	toDoctorAmenitiesEdits,
	toDoctorAmenitiesInput,
	toDoctorBasicInfoInput,
	toDoctorCompleteInput,
	toDoctorLiabilityInput,
	toDoctorLicenseInput,
	toDoctorOfficeAddressInput,
	toDoctorOfficeDetailsInput,
	toDoctorPaymentOptionsInput,
	toDoctorServicePricingInput,
	toggleDoctorParkingKind
} from '.';

const PROOF = `v1.${'a'.repeat(20)}.${'f'.repeat(64)}`;
const address = {
	streetLine: ' Καραΐσκου 74 ',
	postalCode: '185 32',
	city: ' Πειραιάς ',
	latitude: 37.94,
	longitude: 23.64,
	placeId: 'ChIJ2d0hA0e9oRQRs',
	pointProof: PROOF,
	pinMoved: false,
	source: 'google' as const
};

describe('doctor-onboarding · lib/payload (contract §5)', () => {
	it('basic-info: the names trimmed, the day at UTC midnight; nothing before the screen is complete', () => {
		expect(
			toDoctorBasicInfoInput({
				firstName: ' Μαρία ',
				lastName: 'Τριανταφύλλου',
				dateOfBirth: '1985-04-12',
				gender: 'FEMALE'
			})
		).toEqual({
			firstName: 'Μαρία',
			lastName: 'Τριανταφύλλου',
			gender: 'FEMALE',
			dateOfBirth: '1985-04-12T00:00:00.000Z'
		});
		expect(
			toDoctorBasicInfoInput({
				firstName: 'Μ',
				lastName: 'Τ',
				dateOfBirth: '1985-04-12',
				gender: null
			})
		).toBeNull();
	});

	it('license: a blank number or date goes as `null` (how the server clears it)', () => {
		expect(
			toDoctorLicenseInput({ professionalId: 'p', licenseNumber: '  ', licenseObtainedDate: '' })
		).toEqual({ licenseNumber: null, licenseObtainedDate: null });
		expect(
			toDoctorLicenseInput({
				professionalId: 'p',
				licenseNumber: ' 12/2001 ',
				licenseObtainedDate: '2001-06-15'
			})
		).toEqual({ licenseNumber: '12/2001', licenseObtainedDate: '2001-06-15T00:00:00.000Z' });
	});

	it('🔴 D-W3-33: the address group carries Google’s place with the server’s proof as it came — the server judges the point', () => {
		expect(toDoctorOfficeAddressInput(address)).toEqual({
			streetLine: 'Καραΐσκου 74',
			postalCode: '185 32',
			city: 'Πειραιάς',
			latitude: 37.94,
			longitude: 23.64,
			externalPlace: {
				provider: 'GOOGLE_MAPS',
				placeId: 'ChIJ2d0hA0e9oRQRs',
				pinMoved: false,
				pointProof: PROOF
			}
		});
		// After a reload the proof is gone (memory only): the place travels without it, and the server keeps its own point.
		expect(
			toDoctorOfficeAddressInput({ ...address, pointProof: null, pinMoved: true })?.externalPlace
		).toEqual({ provider: 'GOOGLE_MAPS', placeId: 'ChIJ2d0hA0e9oRQRs', pinMoved: true });
	});

	it('(negative) a typed address or the device’s point has no place; no point yet, no write', () => {
		expect(
			toDoctorOfficeAddressInput({ ...address, placeId: null, pointProof: null, source: 'manual' })
				?.externalPlace
		).toBeNull();
		expect(toDoctorOfficeAddressInput({ ...address, latitude: null })).toBeNull();
	});

	it('the edits a choice leaves: Google’s address (postal code as people write it), the device’s point alone (D-W3-12), or nothing typed yet', () => {
		expect(
			addressEditsOfDetails({
				placeId: 'ChIJ2d0hA0e9oRQRs',
				streetLine: 'Καραΐσκου 74',
				postalCode: '18532',
				city: null,
				latitude: 37.9,
				longitude: 23.6,
				pointProof: PROOF
			})
		).toEqual({
			streetLine: 'Καραΐσκου 74',
			postalCode: '185 32',
			city: '',
			latitude: 37.9,
			longitude: 23.6,
			placeId: 'ChIJ2d0hA0e9oRQRs',
			pointProof: PROOF,
			pinMoved: false,
			source: 'google'
		});
		expect(addressEditsOfDevice({ latitude: 38, longitude: 23 })).toMatchObject({
			streetLine: '',
			city: '',
			latitude: 38,
			longitude: 23,
			placeId: null,
			source: 'device'
		});
		expect(addressEditsOfManual()).toMatchObject({
			latitude: null,
			placeId: null,
			source: 'manual'
		});
	});
	const savedOffice: DoctorOnboardingOfficeFacts = {
		streetLine: 'Καραΐσκου 74',
		postalCode: '18532',
		city: 'Πειραιάς',
		latitude: 37.94,
		longitude: 23.64,
		placeId: null,
		pinMoved: false,
		phone: '2104123456',
		floor: 3,
		gettingThere: null,
		parking: true,
		parkingKinds: ['PRIVATE'],
		disabilityAccess: true,
		accessibleToilet: true,
		accessibleParking: false,
		elevator: true,
		nearPublicTransport: false,
		paymentOptions: ['CASH']
	};
	const amenities = {
		parking: true,
		parkingKinds: ['STREET' as const],
		disabilityAccess: true,
		accessibleToilet: true,
		accessibleParking: true,
		elevator: true,
		nearPublicTransport: true
	};

	it('38 · `details` (§5.2): the phone and the directions trimmed, blank ⇒ `null`, the directions cut at 1000, the floor as shown', () => {
		expect(
			toDoctorOfficeDetailsInput(
				{ phone: ' 210 412 3456 ', floor: 3, gettingThere: '  Κουδούνι «Ιατρείο».  ' },
				savedOffice
			)
		).toEqual({
			details: { phone: '210 412 3456', floor: 3, gettingThere: 'Κουδούνι «Ιατρείο».' }
		});
		expect(
			toDoctorOfficeDetailsInput({ phone: '2104123456', floor: -1, gettingThere: '   ' }, null)
		).toEqual({ details: { phone: '2104123456', floor: -1, gettingThere: null } });
		const long = toDoctorOfficeDetailsInput(
			{ phone: '2104123456', floor: 1, gettingThere: 'α'.repeat(1001) },
			null
		);
		expect(long.details?.gettingThere).toHaveLength(1000);
	});

	it('🔴 card w3-w5 · 38: down to the ground floor with an elevator on the server ⇒ the SAME write carries `amenities` with the elevator off, the rest as saved', () => {
		expect(
			toDoctorOfficeDetailsInput({ phone: '2104123456', floor: 0, gettingThere: '' }, savedOffice)
		).toEqual({
			details: { phone: '2104123456', floor: 0, gettingThere: null },
			amenities: {
				parking: true,
				parkingKinds: ['PRIVATE'],
				disabilityAccess: true,
				accessibleToilet: true,
				accessibleParking: false,
				elevator: false,
				nearPublicTransport: false
			}
		});
		// (negative) the ground floor without a saved elevator, or a floor off the ground: `details` alone.
		expect(
			toDoctorOfficeDetailsInput(
				{ phone: '2104123456', floor: 0, gettingThere: '' },
				{ ...savedOffice, elevator: false }
			)
		).not.toHaveProperty('amenities');
		expect(
			toDoctorOfficeDetailsInput({ phone: '2104123456', floor: 2, gettingThere: '' }, savedOffice)
		).not.toHaveProperty('amenities');
	});

	it('38 · Ε6 (negative): a detail never goes without its parent — no kind without Parking, no toilet or space without the access, no elevator on the ground floor', () => {
		expect(toDoctorAmenitiesInput(amenities, 2)).toEqual(amenities);
		expect(
			toDoctorAmenitiesInput({ ...amenities, parking: false, disabilityAccess: false }, 0)
		).toEqual({
			parking: false,
			parkingKinds: [],
			disabilityAccess: false,
			accessibleToilet: false,
			accessibleParking: false,
			elevator: false,
			nearPublicTransport: true
		});
	});

	it('38 · `doctor.js:291`: a card let go takes its details; a kind ticked or let go keeps the server’s order', () => {
		const edits = toDoctorAmenitiesEdits(amenities, ['disabilityAccess', 'elevator'], 3);
		expect(edits).toMatchObject({
			parking: false,
			parkingKinds: [],
			disabilityAccess: true,
			accessibleToilet: true,
			elevator: true,
			nearPublicTransport: false
		});
		expect(toggleDoctorParkingKind(['STREET'], 'PRIVATE')).toEqual(['PRIVATE', 'STREET']);
		expect(toggleDoctorParkingKind(['PRIVATE', 'STREET'], 'PRIVATE')).toEqual(['STREET']);
	});

	it('🔴 U-111.2 · 38: the ways to pay — only the five, in their order; an online one or a made-up one never leaves', () => {
		expect(toDoctorPaymentOptionsInput(['IRIS', 'CASH'])).toEqual(['CASH', 'IRIS']);
		expect(
			toDoctorPaymentOptionsInput(['ONLINE_DOCTOR_PAY', 'ONLINE_OFFICE_PAY', 'CARD', '<x>'])
		).toEqual(['CARD']);
	});

	it('39 · `service-pricing`: whole euros and the length; (negative) a price that is none writes nothing', () => {
		expect(toDoctorServicePricingInput({ price: '60', customDurationInMinutes: 45 })).toEqual({
			price: 60,
			customDurationInMinutes: 45
		});
		for (const price of ['', '0', '10000', '12a', '-3']) {
			expect(toDoctorServicePricingInput({ price, customDurationInMinutes: 30 }), price).toBeNull();
		}
	});

	it('🔴 Ε2 (D-W3-01) · 41: `liability` carries the doctors’ terms ONLY, at the version read; the details only with «Ναι»', () => {
		expect(
			toDoctorLiabilityInput(
				{
					liabilityInsurance: true,
					liabilityCompany: '  Ασφαλιστική Α.Ε. ',
					liabilityInsuranceExpiresAt: '2027-03-31',
					termsAccepted: true
				},
				'2026-11'
			)
		).toEqual({
			liabilityInsurance: true,
			liabilityCompany: 'Ασφαλιστική Α.Ε.',
			liabilityInsuranceExpiresAt: '2027-03-31T00:00:00.000Z',
			legalAcceptance: {
				context: 'DOCTOR',
				acceptances: [
					{ documentCode: 'DOCTOR_MARKETPLACE_TERMS', version: '2026-11', accepted: true }
				]
			}
		});
		expect(
			toDoctorLiabilityInput(
				{
					liabilityInsurance: false,
					liabilityCompany: 'κρατημένη',
					liabilityInsuranceExpiresAt: '2027-03-31',
					termsAccepted: true
				},
				'1.0'
			)
		).toMatchObject({
			liabilityInsurance: false,
			liabilityCompany: null,
			liabilityInsuranceExpiresAt: null
		});
	});

	it('🔴 Ε2 (negative): no answer, terms not ticked or no version known ⇒ no body at all', () => {
		const values = {
			liabilityInsurance: true,
			liabilityCompany: '',
			liabilityInsuranceExpiresAt: '',
			termsAccepted: true
		};
		expect(toDoctorLiabilityInput({ ...values, liabilityInsurance: null }, '1.0')).toBeNull();
		expect(toDoctorLiabilityInput({ ...values, termsAccepted: false }, '1.0')).toBeNull();
		expect(toDoctorLiabilityInput(values, null)).toBeNull();
	});

	it('42 · `activation-intent` and `complete`: the mobile only while the call is asked for; no terms in `complete` (Ε2)', () => {
		const access = {
			wantsMarketplace: true,
			wantsAppointments: false,
			wantsPayments: true,
			salesContactRequested: true,
			salesContactPhone: ' 6912345678 '
		};
		expect(toDoctorActivationIntentInput(access)).toEqual({
			wantsMarketplace: true,
			wantsAppointments: false,
			wantsPayments: true
		});
		expect(toDoctorCompleteInput(access)).toEqual({
			salesContactRequested: true,
			salesContactPhone: '6912345678'
		});
		expect(toDoctorCompleteInput({ ...access, salesContactRequested: false })).toEqual({
			salesContactRequested: false,
			salesContactPhone: null
		});
		expect(Object.keys(toDoctorCompleteInput(access))).not.toContain('legalAcceptance');
	});
});
