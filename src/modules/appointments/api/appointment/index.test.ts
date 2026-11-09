import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AppointmentDetailResponseView } from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import {
	appointmentDetailQuery,
	createAppointment,
	mapAppointment,
	readAppointmentFailure
} from '.';

afterEach(() => vi.unstubAllGlobals());

const view = {
	id: 'a-1',
	doctorId: 'd-1',
	officeId: 'o-1',
	officeTimeZone: 'Europe/Athens',
	status: 'pending',
	confirmationModeSnapshot: 'MANUAL',
	startTime: '2026-11-09T07:30:00.000Z',
	expiresAt: '2026-11-06T17:00:00.000Z',
	officePhone: '2101234567',
	patientNote: '  ',
	relativeId: null,
	serviceLines: [
		{ doctorServiceId: 's-1', isActive: true },
		{ doctorServiceId: 's-2', isActive: false }
	]
} as unknown as AppointmentDetailResponseView;

describe('the booking’s one write and its answer', () => {
	it('maps the appointment: its state, deadline, phone and the active service; a blank note is none', () => {
		expect(mapAppointment(view)).toEqual({
			id: 'a-1',
			doctorId: 'd-1',
			officeId: 'o-1',
			officeTimeZone: 'Europe/Athens',
			status: 'pending',
			confirmationMode: 'MANUAL',
			startTime: '2026-11-09T07:30:00.000Z',
			expiresAt: '2026-11-06T17:00:00.000Z',
			officePhone: '2101234567',
			patientNote: null,
			relativeId: null,
			serviceIds: ['s-1'],
			snapshot: { visitor: { kind: 'self', name: null }, service: null, totalAmount: null }
		});
		expect(mapAppointment({ ...view, id: '' })).toBeNull();
	});

	it('review w3-w3 R1 MINOR-2 (D-06): what the appointment froze — the relative’s names, the active line’s title and length, the final cost', () => {
		const booked = mapAppointment({
			...view,
			bookedForType: 'RELATIVE',
			relativeId: 'r-1',
			relativeSnapshot: { firstName: ' Πέτρος ', lastName: 'Μάρκου' },
			finalTotalAmount: 95,
			serviceLines: [
				{ doctorServiceId: 's-0', isActive: false, serviceTitleSnapshot: 'Αφαιρέθηκε' },
				{
					doctorServiceId: 's-1',
					isActive: true,
					serviceTitleSnapshot: 'Απλή επίσκεψη',
					durationInMinutesSnapshot: 30
				}
			]
		} as unknown as AppointmentDetailResponseView);
		expect(booked?.snapshot).toEqual({
			visitor: { kind: 'relative', name: 'Πέτρος Μάρκου' },
			service: { title: 'Απλή επίσκεψη', durationInMinutes: 30 },
			totalAmount: 95
		});
		const self = mapAppointment({
			...view,
			bookedForType: 'SELF',
			patientSnapshot: { firstName: 'Ελένη', lastName: '' },
			finalTotalAmount: Number.NaN,
			quotedTotalAmount: 70
		} as unknown as AppointmentDetailResponseView);
		expect(self?.snapshot.visitor).toEqual({ kind: 'self', name: 'Ελένη' });
		expect(self?.snapshot.totalAmount).toBe(70);
	});

	it('sends the body as assembled, with the cookies', async () => {
		const spy = vi.fn(
			async () => new Response(JSON.stringify({ status: 'ok', data: view }), { status: 201 })
		);
		vi.stubGlobal('fetch', spy);
		const request = {
			doctorId: 'd-1',
			officeId: 'o-1',
			patientId: 'p-1',
			bookedForType: 'SELF' as const,
			relativeId: null,
			startTime: '2026-11-09T07:30:00.000Z',
			patientNote: null,
			services: [{ doctorServiceId: 's-1', quantity: 1 }]
		};
		// Review w3-w6 R1 MINOR-1: the write answers the facts a read gives, never the contract's view.
		expect(await createAppointment(request)).toEqual(mapAppointment(view));
		const init = (spy.mock.calls[0] as unknown as [string, RequestInit])[1];
		expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual(request);
	});

	it('W-4 (negative, review w3-w6 R2 NIT-1): lines that are no list or hold a `null` are none; an id, a doctor or an office that is no text is no appointment — never a throw', () => {
		const broken = (patch: Record<string, unknown>) =>
			({ ...view, ...patch }) as unknown as AppointmentDetailResponseView;
		for (const serviceLines of [{}, 'x', 7, null]) {
			expect(mapAppointment(broken({ serviceLines }))).toMatchObject({
				id: 'a-1',
				serviceIds: [],
				snapshot: { service: null }
			});
		}
		expect(
			mapAppointment(
				broken({
					serviceLines: [
						null,
						'x',
						{ doctorServiceId: ' s-1 ', isActive: true, serviceTitleSnapshot: 'Επίσκεψη' },
						{ doctorServiceId: 9, isActive: true },
						{ doctorServiceId: 's-3', isActive: 'yes' }
					]
				})
			)
		).toMatchObject({ serviceIds: ['s-1'], snapshot: { service: { title: 'Επίσκεψη' } } });
		expect(mapAppointment(broken({ doctorId: 7 }))).toBeNull();
		expect(mapAppointment(broken({ officeId: { id: 'o-1' } }))).toBeNull();
		expect(mapAppointment(broken({ doctorId: ' d-1 ' }))).toMatchObject({ doctorId: 'd-1' });
	});

	it('W-4 (negative, MINOR-1): an answer that names no appointment is none, never a throw', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () => new Response(JSON.stringify({ status: 'ok', data: { id: 7 } }), { status: 201 })
			)
		);
		await expect(
			createAppointment({
				doctorId: 'd-1',
				officeId: 'o-1',
				patientId: 'p-1',
				bookedForType: 'SELF',
				relativeId: null,
				startTime: '2026-11-09T07:30:00.000Z',
				patientNote: null,
				services: [{ doctorServiceId: 's-1', quantity: 1 }]
			})
		).resolves.toBeNull();
	});

	it('🔴 a refusal: the blockers first (403 and 422 alike), then the taken hour, then a field', () => {
		expect(
			readAppointmentFailure(
				new ApiError('Forbidden: PATIENT_PENDING_LIMIT_REACHED', 403, '/appointment/appointments')
			)
		).toMatchObject({ kind: 'blocked', blockers: ['PATIENT_PENDING_LIMIT_REACHED'] });
		expect(
			readAppointmentFailure(
				new ApiError('Invalid: BOOKING_NOTICE_TOO_SHORT', 422, '/appointment/appointments')
			)
		).toMatchObject({ kind: 'blocked', blockers: ['BOOKING_NOTICE_TOO_SHORT'] });
		expect(readAppointmentFailure(new ApiError('Conflict', 409, '/x'))).toMatchObject({
			kind: 'slot-unavailable'
		});
		expect(
			readAppointmentFailure(new ApiError('APPOINTMENT_SLOT_NOT_AVAILABLE', 422, '/x'))
		).toMatchObject({ kind: 'slot-unavailable' });
		expect(
			readAppointmentFailure(new ApiError('patientNote must be shorter; startTime', 422, '/x'))
		).toMatchObject({ kind: 'invalid', fields: ['patientNote', 'startTime'] });
	});

	it('(negative) nobody decided: a lost request, an outage, a stranger’s error; a 401 is the session', () => {
		expect(readAppointmentFailure(new Error('x')).kind).toBe('unknown');
		expect(readAppointmentFailure(new ApiError('offline', 0, '/x')).kind).toBe('unknown');
		expect(readAppointmentFailure(new ApiError('down', 503, '/x')).kind).toBe('unknown');
		expect(readAppointmentFailure(new ApiError('no', 401, '/x')).kind).toBe('session');
		expect(
			readAppointmentFailure(new ApiError('PATIENT_NAME_MISSINGX', 422, '/x')).blockers
		).toEqual([]);
	});

	it('🔴 U-65.6: one appointment is a personal read, keyed by its id', () => {
		const query = appointmentDetailQuery('a-1');
		expect(query.queryKey).toEqual(['appointments', 'detail', 'a-1']);
		expect(query.meta).toEqual({ personal: true });
	});
});
