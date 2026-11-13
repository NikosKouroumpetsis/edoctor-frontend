import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import type { AppointmentDetailResponseView } from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import {
	appointmentDetailQuery,
	appointmentListQuery,
	cancelAppointment,
	changeAppointment,
	createAppointment,
	listAppointments,
	mapAppointment,
	mapAppointmentDetail,
	mapAppointmentPage,
	readAppointmentChangeFailure,
	readAppointmentFailure,
	storeAppointmentDetail,
	storeAppointmentRated,
	upcomingScanQuery
} from '.';
import { appointmentDetailSample } from './appointment.sample';

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
			endTime: null,
			durationInMinutes: null,
			expiresAt: '2026-11-06T17:00:00.000Z',
			officePhone: '2101234567',
			patientNote: null,
			firstVisit: null,
			relativeId: null,
			serviceIds: ['s-1'],
			snapshot: { visitor: { kind: 'self', name: null }, service: null, totalAmount: null },
			serviceLines: [
				{
					doctorServiceId: 's-1',
					title: '',
					durationInMinutes: null,
					amount: null,
					isActive: true
				},
				{
					doctorServiceId: 's-2',
					title: '',
					durationInMinutes: null,
					amount: null,
					isActive: false
				}
			],
			office: null,
			relative: null,
			patientHasEmail: false,
			confirmedAt: null,
			canceledAt: null,
			canceledBy: null,
			cancelReasonCode: null,
			cancelReasonText: null,
			rejectedAt: null,
			rejectedBy: null,
			rejectReasonText: null,
			updatedAt: null,
			auditTrail: [],
			ratingInvitation: null,
			ratingId: null
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
		expect(await createAppointment(request)).toEqual(mapAppointmentDetail(view));
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

/** P-B4 §13.2's kept visit, as the server answers it (made-up people and offices). */
const patientView = {
	id: '0193a1b2-0000-7000-8000-0000000000a1',
	doctorId: 'doc-maria',
	officeId: 'off-ermou',
	patientId: 'pat-1',
	officeTimeZone: 'Europe/Athens',
	status: 'canceled',
	bookedForType: 'RELATIVE',
	relativeId: 'rel-1',
	startTime: '2026-11-12T10:30:00.000Z',
	endTime: '2026-11-12T11:00:00.000Z',
	effectiveDurationInMinutes: 30,
	confirmationModeSnapshot: 'AUTO',
	confirmedAt: '2026-11-01T09:00:00.000Z',
	canceledAt: '2026-11-10T19:05:00.000Z',
	canceledBy: 'PATIENT',
	canceledLate: true,
	cancelReasonCode: 'SCHEDULE_CONFLICT',
	cancelReasonText: ' Δεν προλαβαίνω. ',
	rejectedAt: null,
	rejectedBy: null,
	rejectReasonText: null,
	expiresAt: null,
	patientNote: null,
	firstVisit: false,
	finalTotalAmount: 180,
	quotedTotalAmount: 140,
	updatedAt: '2026-11-10T19:05:00.000Z',
	officePhone: '+302103210101',
	patientSnapshot: {
		id: 'pat-1',
		firstName: 'Ελένη',
		lastName: 'Παππά',
		email: 'patient@example.test',
		amka: '00000000002'
	},
	relativeSnapshot: {
		id: 'rel-1',
		firstName: 'Γιώργος',
		lastName: 'Παππάς',
		relationship: 'CHILD',
		gender: 'MALE',
		phone: '6900000000',
		email: 'relative@example.test',
		amka: '00000000001'
	},
	officeSnapshot: {
		id: 'off-ermou',
		postalCode: '10555',
		phone: '+302103210101',
		city: 'Αθήνα',
		street: 'Ερμού',
		streetNumber: '101',
		state: 'Αττική',
		floor: 0,
		description: null,
		translations: [
			{
				language: 'en',
				city: 'Athens',
				street: 'Ermou',
				streetNumber: '101',
				state: 'Attica',
				floor: 0
			},
			{ language: 7 }
		]
	},
	serviceLines: [
		{
			doctorServiceId: 'svc-simple',
			serviceTitleSnapshot: 'Απλή επίσκεψη',
			durationInMinutesSnapshot: 30,
			lineGrossAmount: 140,
			isActive: true
		},
		{
			doctorServiceId: 'svc-scope',
			serviceTitleSnapshot: 'Δερματοσκόπηση',
			durationInMinutesSnapshot: 15,
			lineGrossAmount: 40,
			isActive: true
		}
	],
	auditLogs: [
		{
			action: 'UPDATED',
			actorRole: 'DOCTOR',
			createdAt: '2026-11-05T08:00:00.000Z',
			beforeSnapshot: { startTime: '2026-11-12T09:00:00.000Z' },
			afterSnapshot: { startTime: '2026-11-12T10:30:00.000Z' }
		},
		{ action: 'CANCELED', actorRole: 'constructor', createdAt: '2026-11-10T19:05:00.000Z' },
		{ action: 'X' }
	],
	actions: {
		canCancel: false,
		canReschedule: false,
		canConfirm: false,
		canReject: false,
		outcomes: [],
		correction: null,
		cancellationCutoffHours: null,
		isPastCancellationCutoff: false
	}
} as unknown as AppointmentDetailResponseView;

const answering = (data: unknown, status = 200) =>
	vi.fn(async () => new Response(JSON.stringify({ status: 'success', data }), { status }));

describe('wave 4.0 · one appointment as the patient reads it (P-W4 §4.7)', () => {
	it('maps what the screens 50–53 read: the hours, the office with its languages, the relative’s relationship and gender, the lines, how it ended, the trail', () => {
		const facts = mapAppointment(patientView);
		expect(facts).toMatchObject({
			status: 'canceled',
			endTime: '2026-11-12T11:00:00.000Z',
			durationInMinutes: 30,
			firstVisit: false,
			confirmedAt: '2026-11-01T09:00:00.000Z',
			canceledAt: '2026-11-10T19:05:00.000Z',
			canceledBy: 'PATIENT',
			cancelReasonCode: 'SCHEDULE_CONFLICT',
			cancelReasonText: 'Δεν προλαβαίνω.',
			updatedAt: '2026-11-10T19:05:00.000Z',
			patientHasEmail: true,
			snapshot: { visitor: { kind: 'relative', name: 'Γιώργος Παππάς' }, totalAmount: 180 }
		});
		expect(facts?.relative).toEqual({
			relativeId: 'rel-1',
			firstName: 'Γιώργος',
			lastName: 'Παππάς',
			relationship: 'CHILD',
			gender: 'MALE'
		});
		expect(facts?.office).toEqual({
			officeId: 'off-ermou',
			street: 'Ερμού',
			streetNumber: '101',
			city: 'Αθήνα',
			postalCode: '10555',
			state: 'Αττική',
			floor: 0,
			phone: '+302103210101',
			translations: [
				{
					language: 'en',
					street: 'Ermou',
					streetNumber: '101',
					city: 'Athens',
					state: 'Attica',
					floor: 0
				}
			]
		});
		expect(
			facts?.serviceLines.map((line) => [line.title, line.durationInMinutes, line.amount])
		).toEqual([
			['Απλή επίσκεψη', 30, 140],
			['Δερματοσκόπηση', 15, 40]
		]);
		expect(facts?.auditTrail).toEqual([
			{
				action: 'UPDATED',
				actorKind: 'DOCTOR',
				at: '2026-11-05T08:00:00.000Z',
				previousStartTime: '2026-11-12T09:00:00.000Z',
				nextStartTime: '2026-11-12T10:30:00.000Z'
			},
			{
				action: 'CANCELED',
				actorKind: null,
				at: '2026-11-10T19:05:00.000Z',
				previousStartTime: null,
				nextStartTime: null
			}
		]);
	});

	it('🔴 U-137.5: `canceledLate` never leaves `api/`; 🔴 U-65.6: neither the email, the ΑΜΚΑ nor the relative’s phone (the email is a flag)', () => {
		const facts = mapAppointment(patientView);
		const written = JSON.stringify(facts);
		expect(facts).not.toHaveProperty('canceledLate');
		for (const secret of [
			'patient@example.test',
			'relative@example.test',
			'00000000001',
			'00000000002',
			'6900000000'
		]) {
			expect(written).not.toContain(secret);
		}
	});

	it('D-W4-01 · P-B4 §13.1 (card w4-w6, W4-9): the open invitation, the review’s id and the three new `actions` as the server sends them (§13.2’s examples)', () => {
		const withFields = {
			...patientView,
			status: 'booked',
			ratingInvitation: { invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00.000Z' },
			ratingId: 'rat-1',
			actions: {
				...patientView.actions,
				canCancel: true,
				canReschedule: true,
				cancellationCutoffHours: 24,
				cancellationDeadline: '2026-11-11T10:30:00.000Z',
				rescheduleDenial: null,
				reschedulesLeft: 2
			}
		} as unknown as AppointmentDetailResponseView;
		const facts = mapAppointmentDetail(withFields);
		expect(facts).toMatchObject({
			ratingInvitation: { invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00.000Z' },
			ratingId: 'rat-1'
		});
		expect(facts?.actions).toEqual({
			canCancel: true,
			canReschedule: true,
			cancellationCutoffHours: 24,
			isPastCancellationCutoff: false,
			cancellationDeadline: '2026-11-11T10:30:00.000Z',
			rescheduleDenial: null,
			reschedulesLeft: 2
		});
		// §13.2 after the second move, and past the deadline: the denial's word, the moves spent, no instant.
		const spent = mapAppointmentDetail({
			...withFields,
			actions: { canCancel: true, rescheduleDenial: 'LIMIT_REACHED', reschedulesLeft: 0 }
		} as unknown as AppointmentDetailResponseView);
		expect(spent?.actions).toMatchObject({ rescheduleDenial: 'LIMIT_REACHED', reschedulesLeft: 0 });
		const past = mapAppointmentDetail({
			...withFields,
			actions: {
				isPastCancellationCutoff: true,
				cancellationDeadline: null,
				rescheduleDenial: 'AFTER_CUTOFF',
				reschedulesLeft: 2
			}
		} as unknown as AppointmentDetailResponseView);
		expect(past?.actions).toMatchObject({
			canCancel: false,
			cancellationDeadline: null,
			rescheduleDenial: 'AFTER_CUTOFF'
		});
		// The list's rows carry the invitation and the review too (D-W4-02), never the three of `actions`.
		const page = mapAppointmentPage({
			items: [{ ...withFields, actions: undefined }],
			nextCursor: null,
			total: 1
		} as never);
		expect(page.items[0]).toMatchObject({
			ratingInvitation: { invitationId: 'inv-1' },
			ratingId: 'rat-1'
		});
		expect(page.items[0]).not.toHaveProperty('actions');
	});

	it('D-118 · W-4 (negative): a broken invitation, review id or `actions` field reads as none — never a guessed value, never a throw', () => {
		const broken = (patch: Record<string, unknown>, actions: Record<string, unknown> = {}) =>
			mapAppointmentDetail({
				...patientView,
				...patch,
				actions: { ...patientView.actions, ...actions }
			} as unknown as AppointmentDetailResponseView);
		for (const ratingInvitation of [
			{ invitationId: 'inv-1' },
			{ invitationId: 'inv-1', expiresAt: 'soon' },
			// Review w4-w6 R1 MINOR-1: a day alone, a local hour, the engine's own reading of a date, an RFC date.
			{ invitationId: 'inv-1', expiresAt: '2026-12-21' },
			{ invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00' },
			{ invitationId: 'inv-1', expiresAt: '12/21/2026' },
			{ invitationId: 'inv-1', expiresAt: 'Mon, 21 Dec 2026 08:00:00 GMT' },
			{ invitationId: 7, expiresAt: '2026-12-21T08:00:00.000Z' },
			{ invitationId: '  ', expiresAt: '2026-12-21T08:00:00.000Z' },
			['inv-1'],
			'inv-1',
			null
		]) {
			expect(
				broken({ ratingInvitation })?.ratingInvitation,
				JSON.stringify(ratingInvitation)
			).toBeNull();
		}
		expect(broken({ ratingId: 42 })?.ratingId).toBeNull();
		expect(broken({ ratingId: ' ' })?.ratingId).toBeNull();
		// A doctor's answer (D-W4-02, Σ-6): the four are absent or `null`.
		expect(broken({ ratingInvitation: undefined, ratingId: undefined })).toMatchObject({
			ratingInvitation: null,
			ratingId: null
		});
		for (const [field, value] of [
			['cancellationDeadline', 'tomorrow'],
			['cancellationDeadline', '2026-11-11'],
			['cancellationDeadline', '2026-11-11T10:30:00'],
			['cancellationDeadline', '11/11/2026'],
			['cancellationDeadline', 'Wed, 11 Nov 2026 10:30:00 GMT'],
			['cancellationDeadline', 1731320000000],
			['rescheduleDenial', 'LIMIT'],
			['rescheduleDenial', 'limit_reached'],
			['rescheduleDenial', 'constructor'],
			['reschedulesLeft', -1],
			['reschedulesLeft', 1.5],
			['reschedulesLeft', '2'],
			['reschedulesLeft', Number.NaN]
		] as const) {
			expect(
				broken({}, { [field]: value })?.actions[field],
				`${field}: ${String(value)}`
			).toBeNull();
		}
	});

	it('W-4 (negative): a state the contract does not have or an hour that is no instant is no appointment; never a throw', () => {
		const broken = (patch: Record<string, unknown>) =>
			({ ...patientView, ...patch }) as unknown as AppointmentDetailResponseView;
		expect(mapAppointment(broken({ status: 'archived' }))).toBeNull();
		expect(mapAppointment(broken({ status: 7 }))).toBeNull();
		expect(mapAppointment(broken({ startTime: 'tomorrow' }))).toBeNull();
		expect(mapAppointment(broken({ startTime: 1_700_000_000 }))).toBeNull();
		expect(mapAppointment(null as never)).toBeNull();
	});

	it('W-4 (negative): what is not of its shape reads as none — the office, its languages, the relative, the trail, the actor, the flags', () => {
		const facts = mapAppointmentDetail({
			...patientView,
			officeSnapshot: { id: 7, city: 'Αθήνα' },
			relativeSnapshot: 'Γιώργος',
			auditLogs: { action: 'UPDATED' },
			canceledBy: 'SOMEONE',
			endTime: 'later',
			patientSnapshot: { email: 7 },
			actions: {
				canCancel: 'yes',
				canReschedule: 1,
				cancellationCutoffHours: '24',
				isPastCancellationCutoff: 'no'
			}
		} as unknown as AppointmentDetailResponseView);
		expect(facts).toMatchObject({
			office: null,
			relative: null,
			auditTrail: [],
			canceledBy: null,
			endTime: null,
			patientHasEmail: false,
			actions: {
				canCancel: false,
				canReschedule: false,
				cancellationCutoffHours: null,
				isPastCancellationCutoff: false
			}
		});
		expect(
			mapAppointmentDetail({
				...patientView,
				actions: undefined
			} as unknown as AppointmentDetailResponseView)?.actions.canCancel
		).toBe(false);
		expect(
			mapAppointment({
				...patientView,
				relativeSnapshot: { id: 'rel-1', firstName: 'Γιώργος', lastName: 'Παππάς' }
			} as unknown as AppointmentDetailResponseView)?.relative
		).toMatchObject({ relationship: '', gender: '' });
	});

	it('review w4-w3 R1 MINOR-4 (W-4, negative): a confirmation mode the contract does not name is none — never «Ο γιατρός επιβεβαιώνει το αίτημα» for it', () => {
		const mode = (value: unknown) =>
			mapAppointment({
				...patientView,
				confirmationModeSnapshot: value
			} as unknown as AppointmentDetailResponseView)?.confirmationMode;
		expect(mode('AUTO')).toBe('AUTO');
		expect(mode('MANUAL')).toBe('MANUAL');
		expect(mode('SEMI')).toBeNull();
		expect(mode('auto')).toBeNull();
		expect(mode(7)).toBeNull();
		expect(mode('constructor')).toBeNull();
		expect(mode(undefined)).toBeNull();
	});

	it('a page of the list: the rows it can name (a broken one left out), its cursor, its count — never negative', () => {
		expect(
			mapAppointmentPage({
				items: [patientView, { id: 7 }, null, 'x'],
				nextCursor: ' c-2 ',
				total: 12
			} as never)
		).toMatchObject({ items: [{ id: patientView.id }], nextCursor: 'c-2', total: 12 });
		for (const page of [null, {}, { items: 'x', total: -3, nextCursor: 4 }, []]) {
			expect(mapAppointmentPage(page as never)).toEqual({ items: [], nextCursor: null, total: 0 });
		}
	});
});

describe('wave 4.0 · the reads and writes of screens 50–53', () => {
	it('🔴 D-92: a tab is the PATIENT side, bounded by the server’s clock; «Επερχόμενα» oldest first, «Ιστορικό» newest first; the cursor travels', async () => {
		const spy = answering({ items: [], nextCursor: null, total: 0 });
		vi.stubGlobal('fetch', spy);
		await listAppointments({ scope: 'upcoming', limit: 10 });
		await listAppointments({ scope: 'history', limit: 10, cursor: 'c-2' });
		const [first, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		const second = (spy.mock.calls[1] as unknown as [string])[0];
		expect(init).toMatchObject({ method: 'GET', credentials: 'include' });
		expect(Object.fromEntries(new URL(first).searchParams)).toEqual({
			as: 'patient',
			scope: 'upcoming',
			sortDir: 'asc',
			limit: '10'
		});
		expect(Object.fromEntries(new URL(second).searchParams)).toEqual({
			as: 'patient',
			scope: 'history',
			sortDir: 'desc',
			limit: '10',
			cursor: 'c-2'
		});
	});

	it('🔴 U-65.6: the list is personal, ten a page, the next by `nextCursor`; the scan of the upcoming is ONE read of 100 (D-W4-21), fresh each time', async () => {
		const list = appointmentListQuery('history');
		expect(list.queryKey).toEqual(['appointments', 'list', 'history']);
		expect(list.meta).toEqual({ personal: true });
		expect(
			list.getNextPageParam({ items: [], nextCursor: 'c-2', total: 3 }, [], undefined, [])
		).toBe('c-2');
		expect(
			list.getNextPageParam({ items: [], nextCursor: null, total: 3 }, [], undefined, [])
		).toBeUndefined();
		const scan = upcomingScanQuery();
		expect(scan.queryKey).toEqual(['appointments', 'list', 'upcoming-scan']);
		expect(scan.meta).toEqual({ personal: true });
		expect(scan.staleTime).toBe(0);
		const spy = answering({ items: [], nextCursor: null, total: 0 });
		vi.stubGlobal('fetch', spy);
		await (scan.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
			signal: new AbortController().signal
		});
		const url = new URL((spy.mock.calls[0] as unknown as [string])[0]);
		expect(url.searchParams.get('limit')).toBe('100');
		expect(url.searchParams.get('scope')).toBe('upcoming');
	});

	it('🔴 D-W4-59.2: the scan reads every page to the end (the next by its `nextCursor`) and says it is whole; (negative) past ten pages it stops and says it is NOT whole — never a part told as all', async () => {
		const row = (id: string) => ({ ...patientView, id });
		const run = (queryFn: unknown) =>
			(queryFn as (context: { signal: AbortSignal }) => Promise<unknown>)({
				signal: new AbortController().signal
			});
		const cursorsOf = (spy: ReturnType<typeof vi.fn>) =>
			spy.mock.calls.map((call) => new URL((call as [string])[0]).searchParams.get('cursor'));
		const pages: Record<string, unknown> = {
			first: { items: [row('a-1'), row('a-2')], nextCursor: 'c2', total: 3 },
			c2: { items: [row('a-3')], nextCursor: null, total: 3 }
		};
		const paged = vi.fn(async (input: string) => {
			const cursor = new URL(input).searchParams.get('cursor') ?? 'first';
			return new Response(JSON.stringify({ status: 'success', message: '', data: pages[cursor] }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			});
		});
		vi.stubGlobal('fetch', paged);
		const whole = (await run(upcomingScanQuery().queryFn)) as {
			items: { id: string }[];
			complete: boolean;
		};
		expect(whole.items.map((item) => item.id)).toEqual(['a-1', 'a-2', 'a-3']);
		expect(whole.complete).toBe(true);
		expect(cursorsOf(paged)).toEqual([null, 'c2']);

		let asked = 0;
		const endless = vi.fn(async () => {
			asked += 1;
			return new Response(
				JSON.stringify({
					status: 'success',
					message: '',
					data: { items: [row(`e-${asked}`)], nextCursor: `c${asked + 1}`, total: 5000 }
				}),
				{ status: 200, headers: { 'Content-Type': 'application/json' } }
			);
		});
		vi.stubGlobal('fetch', endless);
		const part = (await run(upcomingScanQuery().queryFn)) as {
			items: unknown[];
			complete: boolean;
		};
		expect(endless).toHaveBeenCalledTimes(10);
		expect(part.items).toHaveLength(10);
		expect(part.complete).toBe(false);
	});

	it('the change is a `PATCH` of the body alone, the id encoded; the answer is the appointment with its actions', async () => {
		const spy = answering(patientView);
		vi.stubGlobal('fetch', spy);
		const answer = await changeAppointment('a/1', {
			startTime: '2026-11-13T08:00:00.000Z',
			acknowledgeInsideCancellationCutoff: true
		});
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/appointment/appointments/a%2F1');
		expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
		expect(JSON.parse(String(init.body))).toEqual({
			startTime: '2026-11-13T08:00:00.000Z',
			acknowledgeInsideCancellationCutoff: true
		});
		expect(answer).toEqual(mapAppointmentDetail(patientView));
	});

	it('the cancellation is a `POST …/cancel` with the reason and the words; W-4 (negative): an answer of none is `null`, never a throw', async () => {
		const spy = answering(patientView);
		vi.stubGlobal('fetch', spy);
		await cancelAppointment('a-1', { reasonCode: 'PERSONAL', reasonText: 'Δεν προλαβαίνω.' });
		const [url, init] = spy.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toContain('/appointment/appointments/a-1/cancel');
		expect(init).toMatchObject({ method: 'POST' });
		expect(JSON.parse(String(init.body))).toEqual({
			reasonCode: 'PERSONAL',
			reasonText: 'Δεν προλαβαίνω.'
		});
		for (const data of [null, { id: 7 }, 'x']) {
			vi.stubGlobal('fetch', answering(data));
			await expect(cancelAppointment('a-1', { reasonCode: 'OTHER' })).resolves.toBeNull();
		}
	});

	it('🔴 review w3-w2 R1 MAJOR-1: the answer becomes the page at once under the sign-out’s mark, and every list is read again', async () => {
		const client = new QueryClient();
		const invalidate = vi.spyOn(client, 'invalidateQueries');
		await storeAppointmentDetail(client, appointmentDetailSample);
		expect(client.getQueryData(['appointments', 'detail', appointmentDetailSample.id])).toEqual(
			appointmentDetailSample
		);
		expect(client.getQueryDefaults(['appointments', 'detail', 'x']).meta).toEqual({
			personal: true
		});
		expect(invalidate).toHaveBeenCalledWith({ queryKey: ['appointments', 'list'] });
	});
});

describe('🔴 review w4-w6 R1 MAJOR-1 · a visit just rated, written where every screen reads it', () => {
	const ID = appointmentDetailSample.id;
	const invited = {
		...appointmentDetailSample,
		status: 'completed' as const,
		ratingInvitation: { invitationId: 'inv-1', expiresAt: '2026-12-21T08:00:00.000Z' },
		ratingId: null
	};
	const other = { ...invited, id: 'other', ratingInvitation: { ...invited.ratingInvitation } };
	const seeded = () => {
		const client = new QueryClient();
		client.setQueryData(['appointments', 'detail', ID], invited);
		client.setQueryData(['appointments', 'detail', 'other'], other);
		client.setQueryData(['appointments', 'list', 'history'], {
			pages: [
				{ items: [other, invited], nextCursor: 'c2', total: 3 },
				{ items: [{ ...other, id: 'third' }], nextCursor: null, total: 3 }
			],
			pageParams: [undefined, 'c2']
		});
		client.setQueryData(['appointments', 'list', 'upcoming-scan'], {
			items: [invited],
			nextCursor: null,
			total: 1
		});
		return client;
	};
	type Row = { id: string; ratingInvitation: unknown; ratingId: string | null };
	type Pages = { pages: { items: Row[]; nextCursor: string | null }[]; pageParams: unknown[] };

	it('the appointment loses its invitation and names its review — on its own page, in every list’s row (a list of pages, the scan’s one page) — the others untouched', () => {
		const client = seeded();
		storeAppointmentRated(client, ID, 'rat-1');
		expect(client.getQueryData<Row>(['appointments', 'detail', ID])).toMatchObject({
			id: ID,
			ratingInvitation: null,
			ratingId: 'rat-1'
		});
		expect(client.getQueryData<Row>(['appointments', 'detail', 'other'])).toEqual(other);
		const history = client.getQueryData<Pages>(['appointments', 'list', 'history']);
		expect(history?.pages[0].items[1]).toMatchObject({
			id: ID,
			ratingInvitation: null,
			ratingId: 'rat-1'
		});
		expect(history?.pages[0].items[0]).toEqual(other);
		expect(history?.pages[0].nextCursor).toBe('c2');
		expect(history?.pages[1].items[0].ratingInvitation).toEqual(invited.ratingInvitation);
		expect(history?.pageParams).toEqual([undefined, 'c2']);
		const scan = client.getQueryData<{ items: Row[] }>(['appointments', 'list', 'upcoming-scan']);
		expect(scan?.items[0]).toMatchObject({ ratingInvitation: null, ratingId: 'rat-1' });
		expect(client.getQueryDefaults(['appointments', 'detail', 'x']).meta).toEqual({
			personal: true
		});
	});

	it('(negative) a review the answer did not name: the invitation still goes (never «Γράψτε κριτική» again), the id stays as it was; nothing read is made up — an appointment not in the cache stays absent', () => {
		const client = seeded();
		storeAppointmentRated(client, ID, null);
		expect(client.getQueryData<Row>(['appointments', 'detail', ID])).toMatchObject({
			ratingInvitation: null,
			ratingId: null
		});
		const empty = new QueryClient();
		storeAppointmentRated(empty, ID, 'rat-1');
		expect(empty.getQueryData(['appointments', 'detail', ID])).toBeUndefined();
		expect(empty.getQueriesData({ queryKey: ['appointments', 'list'] })).toEqual([]);
	});
});

describe('wave 4.0 · why a change or a cancellation was refused (P-W4 §4.3, §4.4)', () => {
	const refusal = (message: string, status: number) =>
		new ApiError(message, status, '/appointment/appointments/a-1');

	it('the blockers wherever they came: the deadline (403), the hour inside the cutoff (422), the moves spent (422)', () => {
		expect(
			readAppointmentChangeFailure(refusal('Forbidden: CANCEL_AFTER_CANCELLATION_CUTOFF', 403))
		).toEqual({
			kind: 'blocked',
			status: 403,
			blockers: ['CANCEL_AFTER_CANCELLATION_CUTOFF']
		});
		expect(
			readAppointmentChangeFailure(refusal('Invalid: RESCHEDULE_INSIDE_CANCELLATION_CUTOFF', 422))
				.blockers
		).toEqual(['RESCHEDULE_INSIDE_CANCELLATION_CUTOFF']);
		expect(
			readAppointmentChangeFailure(refusal('Invalid: PATIENT_RESCHEDULE_LIMIT_REACHED', 422)).kind
		).toBe('blocked');
	});

	it('🔴 the two `409`s: «changed concurrently» asks for a reload, a busy hour is the hour taken; the slot’s marker too', () => {
		expect(
			readAppointmentChangeFailure(
				refusal('appointment status changed concurrently; reload the appointment and retry.', 409)
			).kind
		).toBe('changed');
		expect(
			readAppointmentChangeFailure(
				refusal('appointment overlaps with an existing blocking appointment.', 409)
			).kind
		).toBe('slot-unavailable');
		expect(readAppointmentChangeFailure(refusal('APPOINTMENT_SLOT_NOT_AVAILABLE', 422)).kind).toBe(
			'slot-unavailable'
		);
	});

	it('a `403` / `404` that names nothing is closed; a field is invalid; the session, the rate, the rest', () => {
		expect(
			readAppointmentChangeFailure(
				refusal('patient note edit is not allowed in current status.', 403)
			).kind
		).toBe('closed');
		expect(readAppointmentChangeFailure(refusal('Not found', 404)).kind).toBe('closed');
		expect(readAppointmentChangeFailure(refusal('patientNote too long', 422)).kind).toBe('invalid');
		expect(readAppointmentChangeFailure(refusal('no', 401)).kind).toBe('session');
		expect(readAppointmentChangeFailure(refusal('slow down', 429)).kind).toBe('rate-limited');
	});

	it('(negative) nobody decided: a lost request, an outage, a stranger’s error; a code that only starts the same is no code', () => {
		expect(readAppointmentChangeFailure(new Error('x')).kind).toBe('unknown');
		expect(readAppointmentChangeFailure(refusal('offline', 0)).kind).toBe('unknown');
		expect(readAppointmentChangeFailure(refusal('down', 503)).kind).toBe('unknown');
		expect(readAppointmentChangeFailure(refusal('CANCEL_AFTER_CANCELLATION_CUTOFFS', 403))).toEqual(
			{ kind: 'closed', status: 403, blockers: [] }
		);
	});
});
