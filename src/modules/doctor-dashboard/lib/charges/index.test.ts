import { describe, expect, it } from 'vitest';
import { doctorAppointmentDetailFacts } from '$modules/doctor-dashboard/api/appointments/doctor-appointment.sample';
import type { DoctorServiceFacts } from '$modules/doctor-dashboard/api/appointments';
import {
	buildDoctorChargeRows,
	doctorAmountError,
	doctorChargesClashText,
	doctorChargesEntry,
	doctorChargesInitialAmount,
	doctorChargesInitialChoice,
	doctorChargesThenLines,
	doctorChargesTotals,
	doctorChargesTotalsRows,
	formatDoctorAmount,
	readDoctorAmount,
	toDoctorChargesRequest,
	toggleDoctorCharge
} from '.';

/* Wave 5.1 · screen 70 «Υπηρεσίες και κόστος» in words (D-W51-52; `sw.js:527` `SVCS`). Made-up services and prices. */

const VISIT = '0193d000-0000-7000-8000-0000000000b1';
const RECHECK = '0193d000-0000-7000-8000-0000000000a3';
const ECG = '0193d000-0000-7000-8000-0000000000b3';
const ECHO = '0193d000-0000-7000-8000-0000000000b4';

const SERVICES: DoctorServiceFacts[] = [
	{ id: VISIT, title: 'Επίσκεψη', durationInMinutes: 30, price: 60 },
	{ id: RECHECK, title: 'Επανέλεγχος', durationInMinutes: 20, price: 45 },
	{ id: ECG, title: 'Ηλεκτροκαρδιογράφημα', durationInMinutes: 20, price: 30 },
	{ id: ECHO, title: 'Υπέρηχος καρδιάς', durationInMinutes: 30, price: 80 }
];

/** The language's own space before the euro sign (Intl's no-break space). */
const EURO = '\u00a0€';

const choice = (...ids: string[]) =>
	ids.map((doctorServiceId) => ({ doctorServiceId, quantity: 1 }));

describe('screen 70 · «Υπηρεσίες και κόστος» (D-W51-52)', () => {
	it('🔴 U-112: υπηρεσίες σε γραμμές — one row a service, «{λεπτά} λεπτά · {τιμή}», in the server’s order', () => {
		expect(buildDoctorChargeRows(SERVICES, 'el')).toEqual([
			{ value: VISIT, label: 'Επίσκεψη', detail: `30 λεπτά · 60${EURO}` },
			{ value: RECHECK, label: 'Επανέλεγχος', detail: `20 λεπτά · 45${EURO}` },
			{ value: ECG, label: 'Ηλεκτροκαρδιογράφημα', detail: `20 λεπτά · 30${EURO}` },
			{ value: ECHO, label: 'Υπέρηχος καρδιάς', detail: `30 λεπτά · 80${EURO}` }
		]);
	});

	it('🔴 D-W51-52: διάρκεια = η μεγαλύτερη, όπως ο server — never the sum; the total is every price times its count', () => {
		expect(doctorChargesTotals(choice(RECHECK, ECG), SERVICES)).toEqual({ minutes: 20, sum: 75 });
		expect(doctorChargesTotals(choice(RECHECK, ECHO), SERVICES)).toEqual({ minutes: 30, sum: 125 });
		expect(
			doctorChargesTotals([{ doctorServiceId: ECG, quantity: 3 }], [{ ...SERVICES[2], price: 0.1 }])
		).toEqual({ minutes: 20, sum: 0.3 });
		expect(doctorChargesTotalsRows({ minutes: 40, sum: 75 }, 'el')).toEqual([
			{ id: 'minutes', label: 'Διάρκεια', value: '40 λεπτά' },
			{ id: 'sum', label: 'Σύνολο υπηρεσιών', value: `75${EURO}` }
		]);
	});

	it('τελευταία υπηρεσία: a chosen row goes unless it is the last one; another comes as one, up to ten', () => {
		expect(toggleDoctorCharge(choice(RECHECK, ECG), ECG)).toEqual(choice(RECHECK));
		expect(toggleDoctorCharge(choice(RECHECK), RECHECK)).toEqual(choice(RECHECK));
		expect(toggleDoctorCharge(choice(RECHECK), VISIT)).toEqual(choice(RECHECK, VISIT));
		const ten = Array.from({ length: 10 }, (_, index) => ({
			doctorServiceId: `0193d000-0000-7000-8000-0000000001${String(index).padStart(2, '0')}`,
			quantity: 1
		}));
		expect(toggleDoctorCharge(ten, VISIT)).toHaveLength(10);
	});

	it('what is chosen at first: the appointment’s active lines still among the services, with their counts; (negative) one gone from the list is not', () => {
		const appointment = doctorAppointmentDetailFacts({
			serviceLines: [
				{
					doctorServiceId: RECHECK,
					serviceTitleSnapshot: 'Επανέλεγχος',
					isActive: true,
					quantity: 2
				},
				{ doctorServiceId: ECG, serviceTitleSnapshot: 'ΗΚΓ', isActive: false },
				{
					doctorServiceId: '0193d000-0000-7000-8000-0000000000ff',
					serviceTitleSnapshot: 'Παλιά',
					isActive: true
				}
			]
		});
		expect(doctorChargesInitialChoice(appointment, SERVICES)).toEqual([
			{ doctorServiceId: RECHECK, quantity: 2 }
		]);
	});

	it('«Τελική τιμή» starts at the total, or at the doctor’s own price when one was set', () => {
		const totals = { minutes: 20, sum: 75 };
		expect(
			doctorChargesInitialAmount({ priceOverriddenAt: null, totalAmount: 45 }, totals, 'el')
		).toBe('75');
		expect(
			doctorChargesInitialAmount(
				{ priceOverriddenAt: '2026-11-14T10:00:00.000Z', totalAmount: 70.5 },
				totals,
				'el'
			)
		).toBe('70,50');
		expect(formatDoctorAmount(1234.5, 'en')).toBe('1234.50');
	});

	it('🔴 U-65.6 · D-W51-44: the amount read strictly — a comma or a dot, at most two decimals, 0 to 99.999.999; anything else is none (never rounded)', () => {
		expect(readDoctorAmount('75')).toBe(75);
		expect(readDoctorAmount(' 70,5 ')).toBe(70.5);
		expect(readDoctorAmount('70.05')).toBe(70.05);
		expect(readDoctorAmount('0')).toBe(0);
		expect(readDoctorAmount('99999999')).toBe(99_999_999);
		expect(readDoctorAmount('99999999,99')).toBeNull();
		for (const text of [
			'',
			'75,505',
			'-5',
			'1e3',
			'7,',
			',5',
			'75 €',
			'1.000,00',
			'<b>5</b>',
			'100000000'
		]) {
			expect(readDoctorAmount(text), text).toBeNull();
		}
		expect(doctorAmountError('75,505', 'el')).toBe(
			'Γράψτε ένα ποσό από 0 έως 99.999.999 €, με έως δύο δεκαδικά.'
		);
		expect(doctorAmountError('75', 'el')).toBeNull();
	});

	it('🔴 D-W51-52: the one write — the services with their counts, and the final price only when it differs from their total', () => {
		const totals = { minutes: 20, sum: 75 };
		expect(toDoctorChargesRequest({ choice: choice(RECHECK, ECG), amount: '75', totals })).toEqual({
			services: choice(RECHECK, ECG)
		});
		expect(
			toDoctorChargesRequest({ choice: choice(RECHECK, ECG), amount: '75,00', totals })
		).toEqual({
			services: choice(RECHECK, ECG)
		});
		expect(toDoctorChargesRequest({ choice: choice(RECHECK, ECG), amount: '70', totals })).toEqual({
			services: choice(RECHECK, ECG),
			finalTotalAmount: 70
		});
		// (negative) no amount, or nothing chosen, sends nothing.
		expect(toDoctorChargesRequest({ choice: choice(RECHECK), amount: '7,123', totals })).toBeNull();
		expect(toDoctorChargesRequest({ choice: [], amount: '75', totals })).toBeNull();
	});

	it('«Δεν χωράει»: the server’s facts in words, the hour on the office’s clock; plain words without them', () => {
		expect(
			doctorChargesClashText(
				{ durationMinutes: 40, nextStartTime: '2026-11-16T09:30:00.000Z' },
				'Europe/Athens',
				'el'
			)
		).toBe(
			'Δεν χωράει: η επίσκεψη θα κρατούσε 40 λεπτά και στις 11:30 έχετε άλλο ραντεβού. Αφαιρέστε μια υπηρεσία ή αλλάξτε πρώτα την ώρα.'
		);
		expect(doctorChargesClashText(null, 'Europe/Athens', 'el')).toMatch(/^Δεν χωράει: /u);
	});

	it('the form only with the server’s `canEditCharges`; «Τι θα γίνει» in two lines', () => {
		const appointment = doctorAppointmentDetailFacts({ actions: { canEditCharges: true } });
		expect(doctorChargesEntry(appointment)).toBe('form');
		expect(doctorChargesEntry(doctorAppointmentDetailFacts())).toBe('closed');
		expect(doctorChargesThenLines('el')).toEqual([
			'Ο ασθενής βλέπει τις υπηρεσίες και την τελική τιμή στο ραντεβού του.',
			'Μετά το «Ολοκληρώθηκε» η τελική τιμή δεν αλλάζει.'
		]);
	});
});
