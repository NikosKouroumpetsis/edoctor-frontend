import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DoctorOnboardingProgressView } from '$shared/lib/api-client';
import { ApiError } from '$shared/lib/http';
import {
	isDoctorOnboardingPhoneRefusal,
	mapDoctorOnboardingProgress,
	readDoctorOnboardingFailure,
	saveDoctorOnboardingStep,
	sendDoctorOnboardingEmailCode,
	type DoctorOnboardingWrite
} from '.';

// The contract's answer, with what a newer or broken server may put in it (unknown members): typed as it is not.
const wire = {
	state: 'IN_PROGRESS',
	startedAt: '2026-11-07T08:00:00.000Z',
	deleteAfter: '2027-02-07T08:00:00.000Z',
	completedAt: null,
	missing: ['OFFICE_ADDRESS', 'SOMETHING_NEW', 'TERMS'],
	basicInfo: { firstName: 'Μαρία', lastName: 'Τ.', dateOfBirth: '1985-04-12', gender: 'FEMALE' },
	contactEmail: { notificationEmail: 'dr@example.test', verified: true },
	professional: { professionalId: 'p-1', licenseNumber: null, licenseObtainedDate: null },
	office: {
		streetLine: 'Καραΐσκου 74',
		postalCode: '18532',
		city: 'Πειραιάς',
		latitude: 37.9,
		longitude: 23.6,
		placeId: null,
		pinMoved: false,
		phone: '2104123456',
		floor: 3,
		gettingThere: '<img src=x onerror=alert(1)>',
		parking: true,
		parkingKinds: ['PRIVATE', 'BOAT'],
		disabilityAccess: false,
		accessibleToilet: false,
		accessibleParking: false,
		elevator: true,
		nearPublicTransport: false,
		paymentOptions: ['CASH', 'ONLINE_DOCTOR_PAY', 'CARD']
	},
	servicePricing: { price: 50, customDurationInMinutes: 30 },
	calendar: { category: 'GOOGLE' },
	liability: {
		liabilityInsurance: null,
		liabilityCompany: null,
		liabilityInsuranceExpiresAt: null
	},
	terms: { accepted: false, version: '1.0' },
	activationIntent: null,
	salesContact: null
} as unknown as DoctorOnboardingProgressView;
const broken = (patch: Record<string, unknown>) =>
	({ ...wire, ...patch }) as unknown as DoctorOnboardingProgressView;

afterEach(() => vi.unstubAllGlobals());

describe('doctor-onboarding · api/progress (contract §5.1, §5.2)', () => {
	it('§5.1: the progress as facts — unknown sections, kinds and the online payments (U-111.2) are left out; texts stay text', () => {
		const progress = mapDoctorOnboardingProgress(wire);
		expect(progress?.missing).toEqual(['OFFICE_ADDRESS', 'TERMS']);
		expect(progress?.office?.parkingKinds).toEqual(['PRIVATE']);
		expect(progress?.office?.paymentOptions).toEqual(['CASH', 'CARD']);
		expect(progress?.office?.gettingThere).toBe('<img src=x onerror=alert(1)>');
		expect(progress?.basicInfo).toEqual({
			firstName: 'Μαρία',
			lastName: 'Τ.',
			dateOfBirth: '1985-04-12',
			gender: 'FEMALE'
		});
		expect(progress?.calendar.category).toBe('GOOGLE');
	});

	it('(negative) an answer that is no progress is none; an office without a point is none', () => {
		expect(mapDoctorOnboardingProgress(null)).toBeNull();
		expect(mapDoctorOnboardingProgress(broken({ state: 'ADMIN' }))).toBeNull();
		expect(mapDoctorOnboardingProgress([] as unknown as DoctorOnboardingProgressView)).toBeNull();
		expect(
			mapDoctorOnboardingProgress(broken({ office: { ...wire.office, latitude: 'x' } }))?.office
		).toBeNull();
		expect(
			mapDoctorOnboardingProgress(broken({ basicInfo: { gender: 'OTHER', dateOfBirth: 'soon' } }))
				?.basicInfo
		).toEqual({ firstName: null, lastName: null, dateOfBirth: null, gender: null });
	});

	it('W-4 (negative): every part of a broken answer reads as absent, never a guess and never a throw', () => {
		const progress = mapDoctorOnboardingProgress(
			broken({
				missing: 'TERMS',
				basicInfo: 'Μαρία',
				contactEmail: [],
				professional: null,
				office: 'Καραΐσκου 74',
				servicePricing: { price: '50', customDurationInMinutes: Number.NaN },
				calendar: { category: 'OUTLOOK' },
				liability: { liabilityInsurance: 'yes', liabilityCompany: 7 },
				terms: { accepted: 'true', version: 1 },
				activationIntent: ['wantsMarketplace'],
				salesContact: 'call me'
			})
		);
		expect(progress).toEqual({
			state: 'IN_PROGRESS',
			startedAt: '2026-11-07T08:00:00.000Z',
			deleteAfter: '2027-02-07T08:00:00.000Z',
			completedAt: null,
			missing: [],
			basicInfo: { firstName: null, lastName: null, dateOfBirth: null, gender: null },
			contactEmail: { notificationEmail: null, verified: false },
			professional: { professionalId: null, licenseNumber: null, licenseObtainedDate: null },
			office: null,
			servicePricing: { price: null, customDurationInMinutes: null },
			calendar: { category: null },
			liability: {
				liabilityInsurance: null,
				liabilityCompany: null,
				liabilityInsuranceExpiresAt: null
			},
			terms: { accepted: false, version: null },
			activationIntent: null,
			salesContact: null
		});
	});

	it('each write goes to its route with the cookies, its body the server’s one to one (D-W3-01: `start` asks for nothing more)', async () => {
		const calls: { url: string; init: RequestInit }[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init: RequestInit) => {
				calls.push({ url, init });
				return new Response(JSON.stringify({ status: 'success', data: wire }), { status: 200 });
			})
		);
		const writes: DoctorOnboardingWrite[] = [
			{ kind: 'start' },
			{ kind: 'notification-email', notificationEmail: 'dr@example.test' },
			{ kind: 'verify-email', input: { notificationEmail: 'dr@example.test', code: '123456' } },
			{ kind: 'professional', professionalId: 'p-1' },
			{ kind: 'calendar', category: 'NONE' },
			{ kind: 'office', input: { paymentOptions: ['CASH'] } }
		];
		const answers: unknown[] = [];
		for (const write of writes) answers.push(await saveDoctorOnboardingStep(write));
		// Review w3-w6 R1 MINOR-1: a write answers the facts, as a read does — never the contract's view.
		expect(answers).toEqual(writes.map(() => mapDoctorOnboardingProgress(wire)));
		expect(
			(answers[0] as { office: { paymentOptions: string[] } }).office.paymentOptions
		).not.toContain('ONLINE_DOCTOR_PAY');
		expect(
			calls.map(
				({ url, init }) =>
					`${init.method} ${new URL(url).pathname.replace(/^.*\/doctor/u, '/doctor')}`
			)
		).toEqual([
			'POST /doctor/onboarding/start',
			'PUT /doctor/onboarding/notification-email',
			'POST /doctor/onboarding/notification-email/verify',
			'POST /doctor/onboarding/professional',
			'POST /doctor/onboarding/calendar',
			'POST /doctor/onboarding/office'
		]);
		expect(calls.every(({ init }) => init.credentials === 'include')).toBe(true);
		expect(calls.map(({ init }) => JSON.parse(String(init.body)))).toEqual([
			{},
			{ notificationEmail: 'dr@example.test' },
			{ notificationEmail: 'dr@example.test', code: '123456' },
			{ professionalId: 'p-1' },
			{ calendarCategory: 'NONE' },
			{ paymentOptions: ['CASH'] }
		]);
	});

	it('W-4 (negative, MINOR-1): a write whose answer is no progress is none, never the view and never a throw', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(JSON.stringify({ status: 'success', data: { state: 42 } })))
		);
		await expect(saveDoctorOnboardingStep({ kind: 'start' })).resolves.toBeNull();
	});

	it('the email’s code answers its own result, never the progress; 🔴 D-W3-39: `?lang=` the page’s, so the email is in it', async () => {
		const urls: URL[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				urls.push(new URL(url));
				return new Response(JSON.stringify({ status: 'success', data: { success: true } }));
			})
		);
		expect(await sendDoctorOnboardingEmailCode('en')).toBe(true);
		expect(await sendDoctorOnboardingEmailCode('el')).toBe(true);
		expect(urls.map((url) => url.pathname.replace(/^.*\/doctor/u, '/doctor'))).toEqual([
			'/doctor/onboarding/notification-email/verification-code',
			'/doctor/onboarding/notification-email/verification-code'
		]);
		expect(urls.map((url) => url.searchParams.get('lang'))).toEqual(['en', 'el']);
	});

	it('m3 / B-9: a refusal by its mark — the age, not started, incomplete, outside Greece, the email’s delivery — the session, the lock, the rate', () => {
		const refusal = (status: number, message: string, code = 'EC000') =>
			new ApiError(message, status, '/doctor/onboarding', code);
		expect(readDoctorOnboardingFailure(refusal(422, 'DOCTOR_UNDER_MINIMUM_AGE'))).toBe('under-age');
		expect(readDoctorOnboardingFailure(refusal(422, 'DOCTOR_ONBOARDING_NOT_STARTED'))).toBe(
			'not-started'
		);
		expect(
			readDoctorOnboardingFailure(
				refusal(422, 'DOCTOR_ONBOARDING_INCOMPLETE: DOCTOR_UNDER_MINIMUM_AGE')
			)
		).toBe('under-age');
		expect(readDoctorOnboardingFailure(refusal(422, 'OFFICE_POINT_OUTSIDE_GREECE'))).toBe(
			'outside-greece'
		);
		expect(readDoctorOnboardingFailure(refusal(500, 'DOCTOR_NOTIFICATION_EMAIL_SEND_FAILED'))).toBe(
			'email-send-failed'
		);
		expect(readDoctorOnboardingFailure(refusal(401, 'x'))).toBe('session');
		expect(readDoctorOnboardingFailure(refusal(423, 'x', 'USER_LOCKED'))).toBe('locked');
		expect(readDoctorOnboardingFailure(refusal(429, 'x'))).toBe('rate-limited');
		expect(readDoctorOnboardingFailure(refusal(422, 'firstName must be shorter'))).toBe('invalid');
		expect(readDoctorOnboardingFailure(new Error('lost'))).toBe('unknown');
	});

	it('W-4 (w3-b3 codes, parity w3-a5 §1.2): the doctors’ terms alone say so (41); inside a refused `complete` it is «incomplete» (read again, B-9); the office’s `409` is a field', () => {
		const refusal = (status: number, message: string, code: string) =>
			new ApiError(message, status, '/doctor/onboarding', code);
		expect(
			readDoctorOnboardingFailure(
				refusal(
					422,
					'Validation Error: DOCTOR_TERMS_NOT_ACCEPTED: legalAcceptance is required',
					'EC422'
				)
			)
		).toBe('terms-not-accepted');
		expect(
			readDoctorOnboardingFailure(
				refusal(
					422,
					'Validation Error: DOCTOR_ONBOARDING_INCOMPLETE: DOCTOR_TERMS_NOT_ACCEPTED',
					'EC422'
				)
			)
		).toBe('incomplete');
		expect(
			readDoctorOnboardingFailure(
				refusal(
					422,
					'Validation Error: DOCTOR_ONBOARDING_INCOMPLETE: DOCTOR_UNDER_MINIMUM_AGE',
					'EC422'
				)
			)
		).toBe('under-age');
		expect(
			readDoctorOnboardingFailure(
				refusal(409, 'Already exist: DOCTOR_ONBOARDING_OFFICE_ADDRESS_REQUIRED', 'EC415')
			)
		).toBe('invalid');
		expect(
			readDoctorOnboardingFailure(
				refusal(422, 'Validation Error: OFFICE_AMENITY_PARENT_MISSING: elevator', 'EC422')
			)
		).toBe('invalid');
		expect(readDoctorOnboardingFailure(refusal(429, 'Too many requests', 'EC429'))).toBe(
			'rate-limited'
		);
	});

	it('W8-Σ1: the office phone’s refusal by the server’s own words — its phone rule («…τηλέφωνο…», no field named) or a `phone` named; never a mark, another field, the rate or a lost request', () => {
		const refusal = (status: number, message: string, code = 'EC422') =>
			new ApiError(message, status, '/doctor/onboarding/office', code);
		for (const message of [
			'Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.',
			'Validation Error: Ευρωπαϊκό τηλέφωνο με 2-ψήφιο κωδικό πρέπει να έχει 12 ψηφία.',
			'Validation Error: Το τηλέφωνο πρέπει να περιέχει μόνο αριθμούς.',
			'Validation Error: Αμερικανικό τηλέφωνο πρέπει να έχει 11 ψηφία.'
		]) {
			expect(isDoctorOnboardingPhoneRefusal(refusal(422, message))).toBe(true);
		}
		// W8 Delta 2 (NIT-2): the schema's own `422` names no field — it stays the frame's.
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation failed fields: must NOT have more than 32 characters')
			)
		).toBe(false);
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation Error: OFFICE_AMENITY_PARENT_MISSING')
			)
		).toBe(false);
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation Error: DOCTOR_ONBOARDING_INCOMPLETE: OFFICE_PHONE')
			)
		).toBe(false);
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(
					422,
					'Validation Error: "gettingThere" length must be less than or equal to 1000 characters long'
				)
			)
		).toBe(false);
		expect(isDoctorOnboardingPhoneRefusal(refusal(429, 'phone', 'EC429'))).toBe(false);
		expect(isDoctorOnboardingPhoneRefusal(refusal(500, 'phone', 'EC500'))).toBe(false);
		expect(isDoctorOnboardingPhoneRefusal(new Error('τηλέφωνο'))).toBe(false);
		expect(isDoctorOnboardingPhoneRefusal(refusal(422, 'Validation Error: smartphone'))).toBe(
			false
		);
	});

	it('W8 Delta 1: the account’s lock (`USER_LOCKED`, a `403`), the sign-up’s lock (a `403` with the server’s words), a `403` without them; the contact’s mobile refused by name or by the phone rule', () => {
		const refusal = (status: number, message: string, code: string) =>
			new ApiError(message, status, '/doctor/onboarding/office', code);
		expect(
			readDoctorOnboardingFailure(
				refusal(403, 'Your account is temporarily locked. Please try again later.', 'USER_LOCKED')
			)
		).toBe('locked');
		expect(
			readDoctorOnboardingFailure(
				refusal(
					403,
					'Forbidden: Doctor registration is locked after repeated incomplete onboarding. Contact support.',
					'EC403'
				)
			)
		).toBe('registration-locked');
		expect(readDoctorOnboardingFailure(refusal(403, 'Forbidden', 'EC403'))).toBe('refused');
		expect(readDoctorOnboardingFailure(refusal(422, 'registration is locked', 'EC422'))).toBe(
			'invalid'
		);
		// 42's `complete` answers the same phone rule (`Command.ts:667-675`); its schema's `422` names no field (NIT-2).
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation Error: Μη έγκυρος κωδικός χώρας για το τηλέφωνο.', 'EC422')
			)
		).toBe(true);
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation failed fields: must NOT have fewer than 6 characters', 'EC422')
			)
		).toBe(false);
		expect(
			isDoctorOnboardingPhoneRefusal(
				refusal(422, 'Validation Error: DOCTOR_ONBOARDING_INCOMPLETE: CONTACT_EMAIL', 'EC422')
			)
		).toBe(false);
		expect(
			isDoctorOnboardingPhoneRefusal(refusal(422, 'Validation Error: salesContactPhones', 'EC422'))
		).toBe(false);
	});

	it('W8 Delta 2: any other `4xx` the server answered is `refused` (a `403` without the lock’s words, `404`, `413`); only no answer or a `5xx` is `unknown`', () => {
		const refusal = (status: number, message: string, code: string) =>
			new ApiError(message, status, '/doctor/onboarding/office', code);
		expect(
			readDoctorOnboardingFailure(refusal(403, 'Forbidden: Origin is not allowed.', 'EC403'))
		).toBe('refused');
		expect(readDoctorOnboardingFailure(refusal(404, 'Not found', 'EC404'))).toBe('refused');
		expect(
			readDoctorOnboardingFailure(refusal(413, 'Request body is too large', 'PAYLOAD_TOO_LARGE'))
		).toBe('refused');
		expect(readDoctorOnboardingFailure(refusal(500, 'Something went wrong', 'EC500'))).toBe(
			'unknown'
		);
		expect(readDoctorOnboardingFailure(refusal(503, 'Unavailable', 'EC503'))).toBe('unknown');
		expect(readDoctorOnboardingFailure(refusal(0, 'Failed to fetch', 'EC000'))).toBe('unknown');
		expect(readDoctorOnboardingFailure(new TypeError('Failed to fetch'))).toBe('unknown');
	});
});
