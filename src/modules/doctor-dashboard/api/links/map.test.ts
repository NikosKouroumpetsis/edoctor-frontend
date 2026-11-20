import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { sampleLanguagesServer } from '$modules/doctor-dashboard/api/languages/languages.sample';
import { getDoctorLinks, updateDoctorLinks } from './endpoints';
import { readDoctorLinksFailure } from './failure';
import { DOCTOR_LINK_FIELDS, mapDoctorLinks, toDoctorLinksBody } from './map';

/*
 * Wave 5.2 · screen 82 (U-211, D-W52-67, D-W52-70): the client of the doctor's four links — the base profile read field
 * by field (only the four links leave `api/`), the two calls, and the server's refusals, field by field.
 */

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('mapDoctorLinks (D-W52-70, U-65.6)', () => {
	it('🔴 U-211.2 · D-W52-70: the four links one to one — website, Facebook, Instagram, LinkedIn, in that order, each text or `null` — and NOTHING else of the base profile (no email, no licence, no policy of the bookings)', () => {
		expect(DOCTOR_LINK_FIELDS).toEqual(['website', 'facebook', 'instagram', 'linkedin']);
		const links = mapDoctorLinks({
			doctorId: '5f0c1c1e-1111-4111-8111-111111111111',
			notificationEmailMasked: 'd•••@seed.edoctor.test',
			licenseNumber: '48213',
			appointmentConfirmationMode: 'MANUAL',
			website: ' https://www.example.gr ',
			facebook: null,
			instagram: '',
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(links).toEqual({
			website: 'https://www.example.gr',
			facebook: null,
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(Object.keys(links ?? {})).toEqual(['website', 'facebook', 'instagram', 'linkedin']);
		// A base profile that names none of them holds none.
		expect(mapDoctorLinks({})).toEqual({
			website: null,
			facebook: null,
			instagram: null,
			linkedin: null
		});
	});

	it('🔴 U-65.6 (negative): a save sends ALL four, so a broken answer is a FAILED read, never a link dropped in silence — no record, a link that is no text, one longer than the server keeps, one of two lines; markup stays text', () => {
		for (const broken of [undefined, null, 'x', 7, [], [{}]]) {
			expect(mapDoctorLinks(broken), String(broken)).toBeUndefined();
		}
		for (const value of [7, true, {}, ['https://www.example.gr'], `https://${'a'.repeat(2000)}`]) {
			for (const field of DOCTOR_LINK_FIELDS) {
				expect(mapDoctorLinks({ [field]: value }), `${field} ${String(value)}`).toBeUndefined();
			}
		}
		expect(mapDoctorLinks({ website: 'https://www.example.gr\nhttps://evil.example' })).toBe(
			undefined
		);
		expect(mapDoctorLinks({ facebook: 'https://facebook.com/a\u2028b' })).toBeUndefined();
		expect(mapDoctorLinks({ website: '<img src=x onerror=alert(1)>' })?.website).toBe(
			'<img src=x onerror=alert(1)>'
		);
		// The bound itself is an answer.
		const longest = `https://${'a'.repeat(1992)}`;
		expect(longest).toHaveLength(2000);
		expect(mapDoctorLinks({ website: longest })?.website).toBe(longest);
	});
});

describe('toDoctorLinksBody and the calls (D-W52-70)', () => {
	it('🔴 D-W52-70: the body is the four fields and NOTHING else — each a link or `null`, never `tenantUserId`, a licence or a policy of the bookings', () => {
		const body = toDoctorLinksBody({
			website: 'https://www.example.gr',
			facebook: '',
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example',
			...({ tenantUserId: 'x', licenseNumber: '1', appointmentsEnabled: false } as object)
		});
		expect(body).toEqual({
			website: 'https://www.example.gr',
			facebook: null,
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(Object.keys(body)).toEqual(['website', 'facebook', 'instagram', 'linkedin']);
	});

	it('🔴 D-W52-70 · U-65.6: one read and ONE write of the existing `PATCH /doctor/profile/base`, with the cookies, never cached, naming NO doctor; the answer is the links as the server now keeps them', async () => {
		const server = sampleLanguagesServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		expect(await getDoctorLinks()).toEqual({
			website: 'https://www.example.gr',
			facebook: null,
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		const saved = await updateDoctorLinks({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(saved).toEqual({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual([
			['GET', '/doctor/profile/base', ''],
			['PATCH', '/doctor/profile/base', '']
		]);
		expect(server.calls[1].body).toEqual({
			website: null,
			facebook: 'https://www.facebook.com/eleni.pappa.example',
			instagram: null,
			linkedin: 'https://www.linkedin.com/in/eleni-pappa-example'
		});
		for (const call of server.calls) {
			expect(call.credentials).toBe('include');
			expect(call.cache).toBe('no-store');
		}
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId|doctorId/u);
	});
});

describe('readDoctorLinksFailure (D-W52-67, `w52-b6` §4)', () => {
	const failure = (status: number, message = 'Refused') =>
		readDoctorLinksFailure(new ApiError(message, status, '/doctor/profile/base'));

	it('🔴 D-W52-67: the server’s codes `DOCTOR_<FIELD>_LINK_<REASON>` go to THEIR field — every field, every reason, two fields of one answer', () => {
		const reasons = [
			'TOO_LONG',
			'NOT_A_LINK',
			'NOT_HTTPS',
			'HAS_CREDENTIALS',
			'NOT_OF_NETWORK',
			'NOT_A_PUBLIC_HOST'
		];
		for (const field of DOCTOR_LINK_FIELDS) {
			for (const reason of reasons) {
				expect(
					failure(422, `Validation error: DOCTOR_${field.toUpperCase()}_LINK_${reason}`),
					`${field} ${reason}`
				).toEqual({ reason: 'invalid', fields: { [field]: reason } });
			}
		}
		expect(
			failure(
				422,
				'Validation error: DOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK, DOCTOR_INSTAGRAM_LINK_NOT_HTTPS'
			)
		).toEqual({
			reason: 'invalid',
			fields: { facebook: 'NOT_OF_NETWORK', instagram: 'NOT_HTTPS' }
		});
		// The first word on a field counts.
		expect(
			failure(422, 'DOCTOR_WEBSITE_LINK_NOT_HTTPS, DOCTOR_WEBSITE_LINK_NOT_A_LINK').fields
		).toEqual({ website: 'NOT_HTTPS' });
	});

	it('🔴 D-W52-70: a 422 that names no field, 429, 409, 401, 403 — and anything else nobody decided', () => {
		expect(failure(422, '"website" length must be less than or equal to 2000')).toEqual({
			reason: 'invalid',
			fields: {}
		});
		expect(failure(429).reason).toBe('rate-limited');
		expect(failure(409).reason).toBe('conflict');
		expect(failure(401).reason).toBe('session');
		expect(failure(403).reason).toBe('forbidden');
		expect(failure(500).reason).toBe('unknown');
		expect(failure(0).reason).toBe('unknown');
		expect(readDoctorLinksFailure(new Error('offline'))).toEqual({ reason: 'unknown', fields: {} });
		expect(readDoctorLinksFailure(undefined)).toEqual({ reason: 'unknown', fields: {} });
	});

	it('🔴 U-65.6 (negative): a code counts only as a whole word, only of the four fields and the six reasons, and only with its status', () => {
		for (const message of [
			'XDOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK',
			'DOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK_X',
			'doctor_facebook_link_not_of_network',
			'DOCTOR_YOUTUBE_LINK_NOT_OF_NETWORK',
			'DOCTOR_FACEBOOK_LINK_SOMETHING_ELSE',
			'DOCTOR_FACEBOOK_NOT_OF_NETWORK'
		]) {
			expect(failure(422, message), message).toEqual({ reason: 'invalid', fields: {} });
		}
		for (const status of [409, 429, 500]) {
			expect(failure(status, 'DOCTOR_FACEBOOK_LINK_NOT_OF_NETWORK').fields).toEqual({});
		}
	});
});
