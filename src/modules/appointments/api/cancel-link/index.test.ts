import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import {
	cancelAppointmentByLink,
	getAppointmentCancelLink,
	mapAppointmentCancelLink,
	readAppointmentCancelLinkFailure
} from '.';

/* Wave 5.1 · the cancel link's page (D-W51-72, U-198.1; card w51-w8). Made-up doctor and office. */

afterEach(() => vi.unstubAllGlobals());

const TOKEN = 'AbCdEfGh_-123456';
const VIEW = {
	status: 'booked',
	startTime: '2026-11-16T09:00:00.000Z',
	endTime: '2026-11-16T09:30:00.000Z',
	officeTimeZone: 'Europe/Athens',
	doctor: { fullName: 'Μαρία Τριανταφύλλου', specialty: 'Δερματολόγος' },
	office: {
		street: 'Ερμού',
		streetNumber: '101',
		city: 'Αθήνα',
		postalCode: '10563',
		floor: 2,
		phone: '2103210101'
	},
	cancellation: { cutoffHours: 8, deadline: '2026-11-16T01:00:00.000Z' },
	canCancel: true,
	late: false
};

describe('🔴 D-W51-72: καμία πληροφορία ασθενή — the link’s page as FACTS', () => {
	it('the doctor, the hour, the office and the terms; nothing else of the answer is kept (a patient’s field the server would add goes nowhere)', () => {
		const facts = mapAppointmentCancelLink({
			...VIEW,
			patient: { firstName: 'Χ', phone: '306900000000' },
			patientSnapshot: { email: 'x@seed.edoctor.test' }
		} as never);
		expect(facts).toEqual({
			status: 'booked',
			startTime: '2026-11-16T09:00:00.000Z',
			endTime: '2026-11-16T09:30:00.000Z',
			officeTimeZone: 'Europe/Athens',
			doctor: { name: 'Μαρία Τριανταφύλλου', specialty: 'Δερματολόγος' },
			office: VIEW.office,
			cancellation: { cutoffHours: 8, deadline: '2026-11-16T01:00:00.000Z' },
			canCancel: true,
			late: false
		});
		expect(JSON.stringify(facts)).not.toMatch(/306900000000|x@seed|Χ"/u);
	});

	it('U-65.6 (negative): no state or no instant is no page; the flags only when `true`; a zone that is no IANA name, a phone with letters — none', () => {
		expect(mapAppointmentCancelLink({ ...VIEW, status: 'done' } as never)).toBeNull();
		expect(mapAppointmentCancelLink({ ...VIEW, startTime: 'tomorrow' } as never)).toBeNull();
		expect(mapAppointmentCancelLink(null)).toBeNull();
		const odd = mapAppointmentCancelLink({
			...VIEW,
			canCancel: 'true',
			late: 1,
			officeTimeZone: '<script>',
			office: { ...VIEW.office, phone: 'call me' },
			cancellation: { cutoffHours: -1, deadline: null }
		} as never);
		expect(odd).toMatchObject({
			canCancel: false,
			late: false,
			officeTimeZone: 'Europe/Athens',
			office: { phone: null },
			cancellation: null
		});
	});
});

describe('🔴 U-198.1: ο σύνδεσμος ακυρώνει χωρίς σύνδεση — the two calls of the page', () => {
	it('the read and the cancel go with NO cookies, the secret only in the request’s address', async () => {
		const spy = vi.fn(
			async () =>
				new Response(JSON.stringify({ status: 'success', message: '', data: VIEW }), {
					status: 200
				})
		);
		vi.stubGlobal('fetch', spy);
		await getAppointmentCancelLink(TOKEN);
		await cancelAppointmentByLink(TOKEN, { reasonCode: 'PERSONAL' });
		const [readUrl, read] = spy.mock.calls[0] as unknown as [string, RequestInit];
		const [writeUrl, write] = spy.mock.calls[1] as unknown as [string, RequestInit];
		expect(readUrl).toMatch(new RegExp(`/appointment/public/cancel-links/${TOKEN}$`, 'u'));
		expect(writeUrl).toBe(readUrl);
		expect(read.credentials).toBe('omit');
		expect(write.credentials).toBe('omit');
		expect(write.method).toBe('POST');
		expect(JSON.parse(String(write.body))).toEqual({ reasonCode: 'PERSONAL' });
	});

	it('🔴 D-W51-72: a refusal never carries the secret — the route’s name in its place, its status and words kept', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(JSON.stringify({ errorMessage: 'Not found' }), { status: 404 })
			)
		);
		const read = (await getAppointmentCancelLink(TOKEN).catch((error) => error)) as ApiError;
		const write = (await cancelAppointmentByLink(TOKEN, { reasonCode: 'OTHER' }).catch(
			(error) => error
		)) as ApiError;
		for (const error of [read, write]) {
			expect(error).toBeInstanceOf(ApiError);
			expect(error.status).toBe(404);
			expect(error.url).toBe('/appointment/public/cancel-links/:cancelToken');
			expect(JSON.stringify({ ...error, message: error.message, stack: '' })).not.toContain(TOKEN);
		}
	});

	it('why a read or a cancel was refused: the link gone (404; a read refused by its shape, 422), the deadline (403 code), changed (409), a field (422 of the write), too many (429)', () => {
		const refused = (status: number, message = 'x') => new ApiError(message, status, '/p');
		expect(readAppointmentCancelLinkFailure(refused(404), 'read')).toBe('gone');
		expect(readAppointmentCancelLinkFailure(refused(422), 'read')).toBe('gone');
		expect(readAppointmentCancelLinkFailure(refused(422), 'write')).toBe('invalid');
		expect(readAppointmentCancelLinkFailure(refused(429), 'write')).toBe('rate-limited');
		expect(readAppointmentCancelLinkFailure(refused(409), 'write')).toBe('changed');
		expect(
			readAppointmentCancelLinkFailure(
				refused(403, 'Forbidden: CANCEL_AFTER_CANCELLATION_CUTOFF'),
				'write'
			)
		).toBe('deadline');
		expect(readAppointmentCancelLinkFailure(refused(403), 'write')).toBe('unknown');
		expect(readAppointmentCancelLinkFailure(refused(500), 'read')).toBe('unknown');
		expect(readAppointmentCancelLinkFailure(new TypeError('offline'), 'write')).toBe('unknown');
	});
});
