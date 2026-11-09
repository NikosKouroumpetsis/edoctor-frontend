import { describe, expect, it } from 'vitest';
import {
	bookingAvailabilitySample,
	bookingDoctorSample,
	bookingPatientSample,
	bookingReadinessSample,
	bookingSlotSample
} from '../booking.sample';
import { buildBookingCard, bookingOfficeLine, bookingSlotLabel } from '.';

const base = {
	doctor: bookingDoctorSample,
	slot: bookingSlotSample,
	slotState: 'offered' as const,
	serviceId: 'svc-simple',
	visitor: { kind: 'self' as const },
	signedIn: true,
	patient: bookingPatientSample,
	readiness: bookingReadinessSample,
	locale: 'el' as const
};
const ids = (card: ReturnType<typeof buildBookingCard>) => card.rows.map((row) => row.id);
const row = (card: ReturnType<typeof buildBookingCard>, id: string) =>
	card.rows.find((entry) => entry.id === id);

describe('the card of screen 30 (record §3.2)', () => {
	it('a member: the doctor, the hour, the office, the reason, the visitor, the mobile, the cost, the policy', () => {
		const card = buildBookingCard(base);
		expect(card.head).toEqual({
			photo: { src: 'https://cdn.test/p.jpg', alt: '' },
			specialty: 'Δερματολόγος',
			name: 'Μαρία Τριανταφύλλου',
			rating: { score: '4,9', reviews: '22 κριτικές', label: 'Βαθμολογία 4,9 από 5' }
		});
		expect(ids(card)).toEqual([
			'date-time',
			'office',
			'reason',
			'visitor',
			'phone',
			'price',
			'policy'
		]);
		expect(row(card, 'date-time')?.value).toBe('Κυριακή 8 Νοεμβρίου · 09:30');
		expect(row(card, 'office')?.value).toBe('Ερμού 101, Αθήνα, Αττική');
		expect(row(card, 'reason')?.value).toBe('Απλή επίσκεψη · 30 λεπτά');
		expect(row(card, 'visitor')?.value).toBe('Για μένα · Ελένη Παππά');
		expect(row(card, 'phone')?.value).toBe('+30 69•• ••• 412');
		expect(row(card, 'price')).toMatchObject({ value: '140\u00a0€', valueStyle: 'money' });
		expect(row(card, 'date-time')?.action).toEqual({
			kind: 'change',
			step: 'time',
			emphasis: false,
			label: 'Αλλαγή',
			ariaLabel: 'Αλλαγή: Ημέρα και ώρα'
		});
	});

	it('U-102: every «Αλλαγή» names the screen it opens', () => {
		const card = buildBookingCard(base);
		expect(
			card.rows.flatMap((entry) => (entry.action ? [[entry.id, entry.action.step]] : []))
		).toEqual([
			['date-time', 'time'],
			['office', 'time'],
			['reason', 'service'],
			['visitor', 'for-whom'],
			['phone', 'details/phone']
		]);
	});

	it('one office: no office row', () => {
		const card = buildBookingCard({
			...base,
			doctor: { ...bookingDoctorSample, offices: bookingDoctorSample.offices?.slice(0, 1) }
		});
		expect(ids(card)).not.toContain('office');
	});

	it('Ε1 = Α: a guest sees no amount («Συνδεθείτε για κόστος»), changes no visitor, has no mobile row', () => {
		const card = buildBookingCard({
			...base,
			signedIn: false,
			patient: undefined,
			readiness: undefined,
			doctor: { ...bookingDoctorSample, pricingVisible: false }
		});
		expect(row(card, 'price')).toMatchObject({ value: null, signIn: 'Συνδεθείτε για κόστος' });
		expect(row(card, 'visitor')).toMatchObject({ value: 'Για μένα', action: null });
		expect(ids(card)).not.toContain('phone');
	});

	it('a missing name and mobile: red lines and a dark «Προσθήκη»; a missing date of birth: an optional «Προσθήκη»', () => {
		const card = buildBookingCard({
			...base,
			patient: { ...bookingPatientSample, lastName: null, phoneVerified: false, phoneMasked: null },
			readiness: {
				...bookingReadinessSample,
				phoneVerified: false,
				nameComplete: false,
				dateOfBirthPresent: false
			}
		});
		expect(row(card, 'name')).toMatchObject({
			lines: [{ text: 'Χρειαζόμαστε το ονοματεπώνυμό σας για την κράτηση.', tone: 'danger' }],
			action: { kind: 'add', step: 'details/name', emphasis: true, label: 'Προσθήκη' }
		});
		expect(row(card, 'phone')).toMatchObject({
			value: null,
			action: { kind: 'add', step: 'details/phone', emphasis: true }
		});
		expect(row(card, 'birth-date')).toMatchObject({
			lines: [{ text: 'Προαιρετικό. Βοηθά τον γιατρό να σας αναγνωρίσει.', tone: 'muted' }],
			action: { kind: 'add', step: 'details/birth-date', emphasis: false }
		});
		expect(row(card, 'visitor')?.value).toBe('Για μένα · Ελένη');
	});

	it('record §3.3: an hour that another service’s length no longer fits — red under the hour, «Αλλαγή» dark', () => {
		const card = buildBookingCard({ ...base, slotState: 'gone-duration' });
		expect(row(card, 'date-time')).toMatchObject({
			lines: [
				{
					text: 'Η υπηρεσία που επιλέξατε έχει διαφορετική διάρκεια, οπότε αυτή η ώρα δεν προσφέρεται πλέον. Επιλέξτε νέα ώρα.',
					tone: 'danger'
				}
			],
			action: { emphasis: true }
		});
		expect(buildBookingCard({ ...base, slotState: 'gone' }).rows[0].lines[0].text).toBe(
			'Αυτή η ώρα δεν είναι πλέον διαθέσιμη.'
		);
		expect(buildBookingCard({ ...base, slotState: 'waiting' }).rows[0].lines).toEqual([]);
	});

	it('a relative is named; (negative) one the list cannot name keeps its row EMPTY with its «Αλλαγή» — never «Για μένα» (R1 MINOR-4 β, the application’s)', () => {
		expect(
			row(
				buildBookingCard({ ...base, visitor: { kind: 'relative', relativeId: 'rel-1' } }),
				'visitor'
			)?.value
		).toBe('Πέτρος Μάρκου');
		const gone = row(
			buildBookingCard({ ...base, visitor: { kind: 'relative', relativeId: 'gone' } }),
			'visitor'
		);
		expect(gone?.value).toBeNull();
		expect(gone?.action).toMatchObject({ kind: 'change', step: 'for-whom' });
	});

	it('R1 MINOR-4 γ: a mobile the server verified but shows no mask for (a number outside its mask) has no row — never «Χρειαζόμαστε…»', () => {
		const card = buildBookingCard({
			...base,
			patient: { ...bookingPatientSample, phoneVerified: true, phoneMasked: null }
		});
		expect(ids(card)).not.toContain('phone');
		expect(JSON.stringify(card)).not.toContain('Χρειαζόμαστε επιβεβαιωμένο κινητό');
	});

	it('a range and a service without a price; the person’s rows wait for their facts', () => {
		expect(row(buildBookingCard({ ...base, serviceId: 'svc-full' }), 'price')?.value).toBe(
			'40\u00a0€ – 60\u00a0€'
		);
		expect(row(buildBookingCard({ ...base, serviceId: 'svc-free' }), 'price')).toMatchObject({
			value: 'Επικοινωνία για κόστος',
			lines: []
		});
		expect(row(buildBookingCard({ ...base, serviceId: 'svc-free' }), 'reason')?.value).toBe(
			'Επανεξέταση'
		);
		expect(ids(buildBookingCard({ ...base, patient: undefined }))).not.toContain('phone');
	});

	it('screen 31 (readOnly): its state first, the note, and no button at all', () => {
		const card = buildBookingCard({ ...base, readOnly: { confirmed: false, note: 'Πόνος <b>' } });
		expect(ids(card)).toEqual([
			'status',
			'date-time',
			'office',
			'reason',
			'visitor',
			'note',
			'phone',
			'price',
			'policy'
		]);
		expect(row(card, 'status')).toMatchObject({
			value: 'Σε αναμονή',
			valueStyle: 'status-pending'
		});
		expect(row(card, 'note')?.value).toBe('Πόνος <b>');
		expect(card.rows.every((entry) => entry.action === null)).toBe(true);
	});

	it('en: the words of the English page', () => {
		const card = buildBookingCard({ ...base, locale: 'en' });
		expect(row(card, 'date-time')?.value).toBe('Sunday, November 8 · 09:30');
		expect(row(card, 'reason')?.value).toBe('Απλή επίσκεψη · 30 minutes');
		expect(card.head.rating?.reviews).toBe('22 reviews');
	});

	it('the helpers: an office with missing parts, a day the calendar lacks', () => {
		expect(bookingOfficeLine({ officeId: 'x', city: 'Πάτρα' })).toBe('Πάτρα');
		expect(bookingSlotLabel({ officeId: 'x', date: '2026-02-31', startMinute: 0 }, 'el')).toBe(
			'2026-02-31 · 00:00'
		);
		expect(bookingAvailabilitySample.days).toHaveLength(2);
	});
});
