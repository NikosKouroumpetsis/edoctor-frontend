import { describe, expect, it } from 'vitest';
import { doctorOnboardingProgressSample } from '$modules/doctor-onboarding/lib/onboarding.sample';
import type { DoctorOnboardingPaymentOption } from '$modules/doctor-onboarding/types';
import {
	formatDoctorAddress,
	readDoctorAccessValues,
	readDoctorAddressValues,
	readDoctorAmenitiesValues,
	readDoctorBasicValues,
	readDoctorCalendarCategory,
	readDoctorContactEmail,
	readDoctorLiabilityValues,
	readDoctorOfficeDetailsValues,
	readDoctorPaymentOptions,
	readDoctorProfessionalValues,
	readDoctorServicePricingValues
} from '.';

const office = {
	streetLine: 'Καραΐσκου 74',
	postalCode: '18532',
	city: 'Πειραιάς',
	latitude: 37.94265,
	longitude: 23.64655,
	placeId: 'ChIJ2d0hA0e9oRQRs',
	pinMoved: false,
	phone: null,
	floor: null,
	gettingThere: null,
	parking: false,
	parkingKinds: [],
	disabilityAccess: false,
	accessibleToilet: false,
	accessibleParking: false,
	elevator: false,
	nearPublicTransport: false,
	paymentOptions: []
};

describe('doctor-onboarding · lib/values (🔴 U-112.2: edits over the server’s progress)', () => {
	it('34: the account’s names prefill; the person’s edit wins — even an empty one', () => {
		const progress = doctorOnboardingProgressSample();
		expect(readDoctorBasicValues({}, progress)).toEqual({
			firstName: 'Μαρία',
			lastName: 'Τριανταφύλλου',
			dateOfBirth: '',
			gender: null
		});
		expect(
			readDoctorBasicValues({ basicInfo: { firstName: '', gender: 'FEMALE' } }, progress)
		).toMatchObject({ firstName: '', gender: 'FEMALE' });
		expect(readDoctorBasicValues({}, undefined).firstName).toBe('');
	});

	it('34 / 35: the email and the specialty with the license', () => {
		const progress = doctorOnboardingProgressSample({
			professional: {
				professionalId: 'p-1',
				licenseNumber: '123',
				licenseObtainedDate: '2001-06-15T00:00:00.000Z'
			}
		});
		expect(readDoctorContactEmail({}, progress)).toBe('dr@example.test');
		expect(readDoctorContactEmail({ contactEmail: { notificationEmail: 'x' } }, progress)).toBe(
			'x'
		);
		expect(readDoctorProfessionalValues({}, progress)).toEqual({
			professionalId: 'p-1',
			licenseNumber: '123',
			licenseObtainedDate: '2001-06-15'
		});
		expect(
			readDoctorProfessionalValues(
				{ professional: { professionalId: 'p-2', licenseObtainedDate: '' } },
				progress
			)
		).toMatchObject({ professionalId: 'p-2', licenseObtainedDate: '' });
	});

	it('37: the saved office, a chosen place over it field by field; a typed address has no point; the proof is memory only', () => {
		const progress = doctorOnboardingProgressSample({ office });
		expect(readDoctorAddressValues({}, progress)).toEqual({
			streetLine: 'Καραΐσκου 74',
			postalCode: '185 32',
			city: 'Πειραιάς',
			latitude: 37.94265,
			longitude: 23.64655,
			placeId: 'ChIJ2d0hA0e9oRQRs',
			pointProof: null,
			pinMoved: false,
			source: null
		});
		const manual = readDoctorAddressValues(
			{
				office: { streetLine: '', latitude: null, longitude: null, placeId: null, source: 'manual' }
			},
			progress
		);
		expect(manual).toMatchObject({
			streetLine: '',
			latitude: null,
			placeId: null,
			source: 'manual'
		});
		expect(manual.city).toBe('Πειραιάς');
		expect(
			formatDoctorAddress({ streetLine: 'Καραΐσκου 74', postalCode: '185 32', city: 'Πειραιάς' })
		).toBe('Καραΐσκου 74, 185 32 Πειραιάς');
	});
	it('🔴 D-W3-26 · 38: no floor on the server reads as the ground floor (0); the phone and the directions the saved ones; an edit wins, even an empty one', () => {
		const progress = doctorOnboardingProgressSample({ office });
		expect(readDoctorOfficeDetailsValues({}, progress)).toEqual({
			phone: '',
			floor: 0,
			gettingThere: ''
		});
		const saved = doctorOnboardingProgressSample({
			office: { ...office, phone: '2104123456', floor: 3, gettingThere: 'Κουδούνι' }
		});
		expect(readDoctorOfficeDetailsValues({}, saved)).toEqual({
			phone: '2104123456',
			floor: 3,
			gettingThere: 'Κουδούνι'
		});
		expect(
			readDoctorOfficeDetailsValues({ office: { phone: '', floor: -1 } }, saved)
		).toMatchObject({ phone: '', floor: -1 });
		expect(readDoctorOfficeDetailsValues({}, undefined).floor).toBe(0);
	});

	it('38 · record §6.8: the elevator exists only off the ground floor — on it the elevator reads «no», whatever was chosen', () => {
		const progress = doctorOnboardingProgressSample({
			office: { ...office, floor: 3, elevator: true, parking: true, parkingKinds: ['STREET'] }
		});
		expect(readDoctorAmenitiesValues({}, progress, 3)).toMatchObject({
			elevator: true,
			parking: true,
			parkingKinds: ['STREET']
		});
		expect(readDoctorAmenitiesValues({}, progress, 0).elevator).toBe(false);
		expect(readDoctorAmenitiesValues({ office: { elevator: true } }, progress, 0).elevator).toBe(
			false
		);
		expect(
			readDoctorAmenitiesValues({ office: { parking: false, parkingKinds: [] } }, progress, 3)
		).toMatchObject({ parking: false, parkingKinds: [] });
	});

	it('🔴 U-111.2 · 38: the ways to pay are only the five offered, in their order — an online one never reads', () => {
		const progress = doctorOnboardingProgressSample({
			office: { ...office, paymentOptions: ['IRIS', 'CASH'] }
		});
		expect(readDoctorPaymentOptions({}, progress)).toEqual(['CASH', 'IRIS']);
		const online = ['ONLINE_DOCTOR_PAY', 'CARD'] as unknown as DoctorOnboardingPaymentOption[];
		expect(readDoctorPaymentOptions({ office: { paymentOptions: online } }, progress)).toEqual([
			'CARD'
		]);
		expect(readDoctorPaymentOptions({ office: { paymentOptions: [] } }, progress)).toEqual([]);
	});

	it('39: the price as typed (the saved one as digits) and the length, 30 until another — a length the server would refuse reads 30', () => {
		expect(readDoctorServicePricingValues({}, doctorOnboardingProgressSample())).toEqual({
			price: '',
			customDurationInMinutes: 30
		});
		const saved = doctorOnboardingProgressSample({
			servicePricing: { price: 60, customDurationInMinutes: 45 }
		});
		expect(readDoctorServicePricingValues({}, saved)).toEqual({
			price: '60',
			customDurationInMinutes: 45
		});
		expect(readDoctorServicePricingValues({ servicePricing: { price: '' } }, saved).price).toBe('');
		expect(
			readDoctorServicePricingValues(
				{},
				doctorOnboardingProgressSample({
					servicePricing: { price: 50, customDurationInMinutes: 25 }
				})
			).customDurationInMinutes
		).toBe(30);
	});

	it('40 / 41: the calendar; the insurance answer with its details (the day only); the doctors’ terms as the server keeps them, or as ticked here', () => {
		const progress = doctorOnboardingProgressSample({
			calendar: { category: 'MICROSOFT' },
			liability: {
				liabilityInsurance: true,
				liabilityCompany: 'Ασφαλιστική',
				liabilityInsuranceExpiresAt: '2027-03-31T00:00:00.000Z'
			},
			terms: { accepted: true, version: '1.0' }
		});
		expect(readDoctorCalendarCategory({}, progress)).toBe('MICROSOFT');
		expect(readDoctorCalendarCategory({ calendar: { category: 'NONE' } }, progress)).toBe('NONE');
		expect(readDoctorCalendarCategory({}, doctorOnboardingProgressSample())).toBeNull();
		expect(readDoctorLiabilityValues({}, progress)).toEqual({
			liabilityInsurance: true,
			liabilityCompany: 'Ασφαλιστική',
			liabilityInsuranceExpiresAt: '2027-03-31',
			termsAccepted: true
		});
		expect(
			readDoctorLiabilityValues(
				{ liability: { liabilityInsurance: false }, terms: { accepted: false } },
				progress
			)
		).toMatchObject({ liabilityInsurance: false, termsAccepted: false });
		expect(readDoctorLiabilityValues({}, doctorOnboardingProgressSample())).toMatchObject({
			liabilityInsurance: null,
			termsAccepted: false
		});
	});

	it('42: the prototype’s start — profile and booking on, the till off, the call asked for with no number; the saved answers and the edits over them', () => {
		expect(readDoctorAccessValues({}, doctorOnboardingProgressSample())).toEqual({
			wantsMarketplace: true,
			wantsAppointments: true,
			wantsPayments: false,
			salesContactRequested: true,
			salesContactPhone: ''
		});
		const saved = doctorOnboardingProgressSample({
			activationIntent: { wantsMarketplace: false, wantsAppointments: true, wantsPayments: true },
			salesContact: { salesContactRequested: false, salesContactPhone: null }
		});
		expect(readDoctorAccessValues({}, saved)).toMatchObject({
			wantsMarketplace: false,
			wantsPayments: true,
			salesContactRequested: false
		});
		expect(
			readDoctorAccessValues({ salesContact: { salesContactRequested: true } }, saved)
				.salesContactRequested
		).toBe(true);
	});
});
