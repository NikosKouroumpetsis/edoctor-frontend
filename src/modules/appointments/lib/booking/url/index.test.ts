import { describe, expect, it } from 'vitest';
import {
	bookingPath,
	bookingSuccessPath,
	hintsKey,
	hintsOf,
	minuteOfTime,
	readAppointmentId,
	readBookingHints,
	readBookingStep,
	slotOfHints,
	timeOfMinute,
	withBookingHints
} from '.';

const params = (query: string) => new URLSearchParams(query);

describe('the booking’s address (P-W3 §3.2.5)', () => {
	it('reads the office, the day, the time and the service when each is valid', () => {
		expect(readBookingHints(params('office=o-1&date=2026-11-08&time=09:30&service=s_2'))).toEqual({
			office: 'o-1',
			date: '2026-11-08',
			time: '09:30',
			service: 's_2'
		});
	});

	it('🔴 U-65.6 (negative): a bad hint is absent — 25:00, 9:3, a day the calendar lacks, markup, a long id', () => {
		expect(
			readBookingHints(
				params(
					`office=${encodeURIComponent('<script>')}&date=2026-02-31&time=25:00&service=${'x'.repeat(81)}`
				)
			)
		).toEqual({});
		expect(readBookingHints(params('time=9:3&date=08-11-2026'))).toEqual({});
		expect(readBookingHints(params('time=23:59&date=2028-02-29'))).toEqual({
			time: '23:59',
			date: '2028-02-29'
		});
	});

	it('turns a time into the office-local minute and back', () => {
		expect(minuteOfTime('09:30')).toBe(570);
		expect(minuteOfTime('00:00')).toBe(0);
		expect(minuteOfTime('9:30')).toBeNull();
		expect(minuteOfTime(undefined)).toBeNull();
		expect(timeOfMinute(570)).toBe('09:30');
		expect(timeOfMinute(1439)).toBe('23:59');
	});

	it('a slot needs the office, the day and the time together', () => {
		expect(slotOfHints({ office: 'o', date: '2026-11-08', time: '10:00' })).toEqual({
			officeId: 'o',
			date: '2026-11-08',
			startMinute: 600
		});
		expect(slotOfHints({ office: 'o', time: '10:00' })).toBeNull();
	});

	it('builds the page’s and a step’s address with the same hints, in a fixed order', () => {
		const hints = hintsOf({ officeId: 'o-1', date: '2026-11-08', startMinute: 570 }, 's-1');
		expect(bookingPath('maria', null, hints)).toBe(
			'/doctors/maria/booking?office=o-1&date=2026-11-08&time=09%3A30&service=s-1'
		);
		expect(bookingPath('maria', 'details/phone', { service: 's-1' })).toBe(
			'/doctors/maria/booking/details/phone?service=s-1'
		);
		expect(bookingPath('μαρία', 'time')).toBe(
			`/doctors/${encodeURIComponent('μαρία')}/booking/time`
		);
		expect(hintsKey(hints)).toBe('office=o-1&date=2026-11-08&time=09:30&service=s-1');
	});

	it('record §3.2: the doctor’s page with the hour, so «×» keeps it', () => {
		expect(
			withBookingHints('/doctors/maria', {
				office: 'o-1',
				date: '2026-11-08',
				time: '09:30',
				service: 's'
			})
		).toBe('/doctors/maria?office=o-1&date=2026-11-08&time=09%3A30&service=s');
		expect(withBookingHints('/doctors/maria', {})).toBe('/doctors/maria');
	});

	it('(negative) a step’s address never carries a hint that would not read back', () => {
		expect(bookingPath('m', 'time', { office: 'a b', time: '9:30' })).toBe(
			'/doctors/m/booking/time'
		);
	});

	it('P-W3 Σ-1: the route’s step — none is screen 30, the closed list of the application’s names, else a 404', () => {
		expect(readBookingStep('')).toBeNull();
		expect(readBookingStep(undefined)).toBeNull();
		expect(readBookingStep('time')).toBe('time');
		expect(readBookingStep('details/phone')).toBe('details/phone');
		expect(readBookingStep('details/birth-date/')).toBe('details/birth-date');
		for (const bad of ['details', 'phone', 'time/x', '../time', 'TIME', 'success/1']) {
			expect(readBookingStep(bad), bad).toBeUndefined();
		}
	});

	it('the last page’s address carries the appointment’s id only when it is a plain id', () => {
		expect(bookingSuccessPath('maria', 'a-1')).toBe(
			'/doctors/maria/booking/success?appointment=a-1'
		);
		expect(bookingSuccessPath('maria', '../x')).toBe('/doctors/maria/booking/success');
	});

	it('the last page’s appointment id: a plain id, else nothing', () => {
		expect(readAppointmentId(params('appointment=a-1'))).toBe('a-1');
		expect(readAppointmentId(params('appointment=../x'))).toBeNull();
		expect(readAppointmentId(params(''))).toBeNull();
	});
});
