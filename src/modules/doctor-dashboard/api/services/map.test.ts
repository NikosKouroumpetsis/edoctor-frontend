import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	createDoctorService,
	deleteDoctorService,
	getDoctorAllowedServices,
	getDoctorServices,
	reorderDoctorServices,
	updateDoctorService
} from './endpoints';
import { readDoctorServicesFailure } from './failure';
import {
	mapDoctorAllowedServices,
	mapDoctorServices,
	toDoctorServiceCreateBody,
	toDoctorServiceUpdateBody
} from './map';
import {
	sampleCatalogueServiceId,
	sampleDoctorServiceId,
	sampleServicesServer,
	sampleServicesView
} from './services.sample';
import type { DoctorServiceDraft } from './types';

/*
 * Wave 5.2 · screen 83 (U-212, U-214, D-W52-71 … 82): the client of the doctor's services — the wire read field by
 * field, the doctor's OWN Greek texts only, the bodies of the writes (never `amount` / `catalogueId`), the calls, and
 * the refusals in the page's reasons.
 */

const DOCTOR = '0199a0d0-0000-7000-8000-0000000000d1';
const ID = sampleDoctorServiceId(1);
const good = (more: Record<string, unknown> = {}) => ({
	...sampleServicesView()[0],
	...more
});
const draft = (more: Partial<DoctorServiceDraft> = {}): DoctorServiceDraft => ({
	price: 60,
	durationInMinutes: 30,
	subtitle: null,
	description: null,
	years: null,
	...more
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('the map of the services (D-W52-73, U-214)', () => {
	it('🔴 D-W52-81: field by field, in the DOCTOR’s order — the title of the page’s language, the price, the length, the years and the doctor’s OWN Greek texts', () => {
		expect(mapDoctorServices(sampleServicesView())).toEqual([
			{
				id: sampleDoctorServiceId(1),
				serviceId: sampleCatalogueServiceId(1),
				title: 'Απλή επίσκεψη',
				price: 60,
				durationInMinutes: 30,
				subtitle: null,
				description: 'Λήψη ιστορικού και κλινική εξέταση.',
				years: 15
			},
			expect.objectContaining({ id: sampleDoctorServiceId(2), title: 'Επανεξέταση', price: 45 }),
			expect.objectContaining({ id: sampleDoctorServiceId(3), subtitle: null, description: null }),
			expect.objectContaining({ id: sampleDoctorServiceId(4), durationInMinutes: 90, years: 12 })
		]);
	});

	it('🔴 U-214.1 / U-207.3: only the doctor’s Greek texts — another language is never shown, an empty one is none, a text stays text', () => {
		const [service] =
			mapDoctorServices([
				good({
					translations: [
						{ language: 'en', subtitle: 'English', description: 'English' },
						{ language: 'el', subtitle: '   ', description: '<img src=x onerror=alert(1)>' }
					]
				})
			]) ?? [];
		expect(service.subtitle).toBeNull();
		expect(service.description).toBe('<img src=x onerror=alert(1)>');
		const [english] =
			mapDoctorServices([
				good({ translations: [{ language: 'en', subtitle: 'Only English', description: 'x' }] })
			]) ?? [];
		expect([english.subtitle, english.description]).toEqual([null, null]);
	});

	it('🔴 U-65.6 (negative): ONE broken row, an id met twice or no list makes the whole read fail — the order is written back whole', () => {
		for (const broken of [
			{ id: 'x' },
			{ serviceId: 'x' },
			{ title: '' },
			{ price: -1 },
			{ price: '60' },
			{ price: Number.NaN },
			{ customDurationInMinutes: 0 },
			{ customDurationInMinutes: 12.5 },
			{ customDurationInMinutes: 5000 }
		]) {
			expect(mapDoctorServices([good(broken)]), JSON.stringify(broken)).toBeNull();
		}
		expect(mapDoctorServices([good(), good()])).toBeNull();
		for (const answer of [null, undefined, {}, 'list', 42]) {
			expect(mapDoctorServices(answer), String(answer)).toBeNull();
		}
		// Stored of before the limits (D-W52-71): a price with cents and a length off the list still show.
		const [old] = mapDoctorServices([good({ price: 49.5, customDurationInMinutes: 25 })]) ?? [];
		expect([old.price, old.durationInMinutes]).toEqual([49.5, 25]);
		// Years that are no whole number are none.
		expect(mapDoctorServices([good({ yearsOfexperience: 2.5 })])?.[0].years).toBeNull();
	});

	it('🔴 D-W52-79 (U-214): the catalogue with eDoctor’s texts and `owned`; an entry out of the contract stays out', () => {
		const options = mapDoctorAllowedServices([
			{
				id: sampleCatalogueServiceId(1),
				title: 'Απλή επίσκεψη',
				suggestedSubtitle: 'Εξέταση',
				suggestedDescription: '  ',
				durationInMinutes: 30,
				owned: true
			},
			{ id: 'x', title: 'Χωρίς id', durationInMinutes: 30, owned: false },
			{ id: sampleCatalogueServiceId(2), title: '', durationInMinutes: 30, owned: false },
			{ id: sampleCatalogueServiceId(3), title: 'Χωρίς σημαία', durationInMinutes: 30 },
			{ id: sampleCatalogueServiceId(4), title: 'Μισή', durationInMinutes: 7.5, owned: false },
			{
				id: sampleCatalogueServiceId(1),
				title: 'Δεύτερη φορά',
				durationInMinutes: 30,
				owned: false
			}
		]);
		expect(options).toEqual([
			{
				serviceId: sampleCatalogueServiceId(1),
				title: 'Απλή επίσκεψη',
				suggestedSubtitle: 'Εξέταση',
				suggestedDescription: null,
				durationInMinutes: 30,
				owned: true
			}
		]);
		expect(mapDoctorAllowedServices({})).toBeNull();
	});
});

describe('the bodies of the writes (D-W52-72 / 78 / 82)', () => {
	it('🔴 D-W52-72 / 78: a new service names the doctor, the catalogue’s service, the price, the length and ONE Greek text — never `amount` or `catalogueId`', () => {
		expect(
			toDoctorServiceCreateBody(DOCTOR, sampleCatalogueServiceId(5), {
				...draft(),
				durationInMinutes: 20
			})
		).toEqual({
			doctorId: DOCTOR,
			serviceId: sampleCatalogueServiceId(5),
			price: 60,
			customDurationInMinutes: 20,
			translations: [{ language: 'el', subtitle: null, description: null }]
		});
		expect(
			toDoctorServiceCreateBody(DOCTOR, sampleCatalogueServiceId(5), {
				...draft({ years: 3, subtitle: 'Σύντομο' }),
				durationInMinutes: 120
			})
		).toMatchObject({ yearsOfexperience: 3, customDurationInMinutes: 120 });
	});

	it('🔴 D-W52-82: «Αποθήκευση» is ONE body — price, length, years (`null` clears them) and the Greek texts; a stored length of before the list is left out', () => {
		expect(toDoctorServiceUpdateBody(draft({ years: null, description: 'Δικό μου' }))).toEqual({
			price: 60,
			customDurationInMinutes: 30,
			yearsOfexperience: null,
			translations: [{ language: 'el', subtitle: null, description: 'Δικό μου' }]
		});
		const body = toDoctorServiceUpdateBody(draft({ durationInMinutes: null }));
		expect(body).not.toHaveProperty('customDurationInMinutes');
		for (const key of ['amount', 'catalogueId', 'doctorId', 'serviceId']) {
			expect(body, key).not.toHaveProperty(key);
		}
	});
});

describe('the calls (D-W52-73 / 79 / 80)', () => {
	it('🔴 U-65.6: the reads name NO doctor (the session does), with the cookies, never cached', async () => {
		const server = sampleServicesServer();
		const fetchSpy = vi.fn(server.fetch);
		vi.stubGlobal('fetch', fetchSpy);
		expect(await getDoctorServices()).toHaveLength(4);
		expect((await getDoctorAllowedServices())?.filter((option) => !option.owned)).toHaveLength(3);
		expect(server.calls.map((call) => [call.method, call.path, call.search])).toEqual([
			['GET', '/doctor-service/doctor-services', ''],
			['GET', '/doctor-service/allowed-services', '']
		]);
		for (const [, init] of fetchSpy.mock.calls) {
			expect((init as RequestInit).credentials).toBe('include');
			expect((init as RequestInit).cache).toBe('no-store');
		}
	});

	it('🔴 D-W52-72 … 74: create, change, delete and order — each ONE call of the contract, the answer read field by field', async () => {
		const server = sampleServicesServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		const made = await createDoctorService(DOCTOR, sampleCatalogueServiceId(5), {
			...draft({ price: 35 }),
			durationInMinutes: 20
		});
		expect(made).toMatchObject({ title: 'Holter ρυθμού 24ώρου', price: 35, durationInMinutes: 20 });
		expect(
			await updateDoctorService(ID, draft({ price: 70, durationInMinutes: 120 }))
		).toMatchObject({
			price: 70,
			durationInMinutes: 120
		});
		const ids = server.rows().map((row) => row.id);
		const reordered = await reorderDoctorServices([...ids].reverse());
		expect(reordered?.map((service) => service.id)).toEqual([...ids].reverse());
		await deleteDoctorService(sampleDoctorServiceId(3));
		expect(server.writes().map((call) => [call.method, call.path])).toEqual([
			['POST', '/doctor-service/doctor-services'],
			['PATCH', `/doctor-service/doctor-services/${ID}`],
			['PUT', '/doctor-service/doctor-services/order'],
			['DELETE', `/doctor-service/doctor-services/${sampleDoctorServiceId(3)}`]
		]);
		expect(server.writes()[2].body).toEqual({ ids: [...ids].reverse() });
		expect(server.writes()[3].body).toBeUndefined();
	});

	it('the cache keys: the list and the catalogue under the profile’s root, by language; the lists of 70 / 72 under `servicesAll()`', () => {
		const root = doctorDashboardQueryKeys.profile();
		expect(doctorDashboardQueryKeys.profileServices('el')).toEqual([...root, 'services', 'el']);
		expect(doctorDashboardQueryKeys.profileServiceOptions('en')).toEqual([
			...root,
			'service-options',
			'en'
		]);
		expect(doctorDashboardQueryKeys.services('el').slice(0, 2)).toEqual(
			doctorDashboardQueryKeys.servicesAll()
		);
	});
});

describe('the refusals (`w52-b7` §9)', () => {
	const api = (
		status: number,
		message: string,
		url = 'http://api/doctor-service/doctor-services/x'
	) => new ApiError(message, status, url);

	it('🔴 D-W52-74: 409 `DOCTOR_SERVICE_LAST_ONE` is the last service; any other 409 one already offered', () => {
		expect(readDoctorServicesFailure(api(409, 'Already exist: DOCTOR_SERVICE_LAST_ONE'))).toBe(
			'last'
		);
		expect(
			readDoctorServicesFailure(
				api(409, 'Already exist: doctor service already exists in catalogue.')
			)
		).toBe('owned');
	});

	it('🔴 D-W52-71 / 73: the 422 of the order, of the years and of any other field; 404 of the order; 403 of the licence or of a service; 401, 429, else unknown', () => {
		const cases: [ApiError | Error, string][] = [
			[api(422, 'Validation Error: DOCTOR_SERVICE_ORDER_MISMATCH'), 'mismatch'],
			[
				api(404, 'Resource not found', 'http://api/doctor-service/doctor-services/order'),
				'mismatch'
			],
			[
				api(
					422,
					'Validation Error: yearsOfexperience must not exceed the years since the doctor obtained the license.'
				),
				'years'
			],
			[api(422, 'Validation failed fields: must be <= 9999'), 'invalid'],
			[api(422, 'Validation Error: DOCTOR_WRITES_GREEK_ONLY'), 'invalid'],
			[api(403, 'Forbidden: Doctor licence is required before …'), 'forbidden'],
			[api(403, 'Forbidden: doctor service is not accessible to this account.'), 'gone'],
			[api(404, 'Resource not found'), 'gone'],
			[api(401, 'Unauthorized'), 'session'],
			[api(429, 'Too many requests'), 'rate-limited'],
			[api(500, 'Server error'), 'unknown'],
			[api(0, 'Network'), 'unknown'],
			[new Error('boom'), 'unknown']
		];
		for (const [error, reason] of cases) {
			expect(readDoctorServicesFailure(error), error.message).toBe(reason);
		}
	});
});
