import { describe, expect, it } from 'vitest';
import { bookingDoctorSample } from '../booking.sample';
import { buildBookingServiceOptions } from '.';

describe('«Επιλέξτε υπηρεσία» (record §3.3, U-103.2, the application’s `buildBookingServiceOptions`)', () => {
	it('one card per service in the doctor’s order: its name, its length, the SAME fee as screen 30', () => {
		expect(buildBookingServiceOptions(bookingDoctorSample, 'el')).toEqual([
			{ id: 'svc-simple', title: 'Απλή επίσκεψη', duration: '30 λεπτά', fee: '140\u00a0€' },
			{
				id: 'svc-full',
				title: 'Πλήρης έλεγχος',
				duration: '60 λεπτά',
				fee: '40\u00a0€ – 60\u00a0€'
			},
			{ id: 'svc-free', title: 'Επανεξέταση', duration: null, fee: 'Επικοινωνία για κόστος' }
		]);
	});

	it('U-34.4 (negative): a guest’s cards name no amount at all', () => {
		const options = buildBookingServiceOptions(
			{ ...bookingDoctorSample, pricingVisible: false },
			'el'
		);
		expect(options.map((option) => option.fee)).toEqual([null, null, null]);
	});

	it('one minute is singular; a doctor with no services offers none', () => {
		const [single] = buildBookingServiceOptions(
			{
				...bookingDoctorSample,
				services: [{ id: 's', title: 'Σύντομη', priceRange: null, durationInMinutes: 1 }]
			},
			'en'
		);
		expect(single.duration).toBe('1 minute');
		expect(
			buildBookingServiceOptions({ ...bookingDoctorSample, services: undefined }, 'el')
		).toEqual([]);
	});
});
