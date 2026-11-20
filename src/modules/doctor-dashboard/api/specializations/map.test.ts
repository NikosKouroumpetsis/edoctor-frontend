import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	getDoctorSpecializationOptions,
	getDoctorSpecializations,
	replaceDoctorSpecializations
} from './endpoints';
import { readDoctorSpecializationsFailure } from './failure';
import { mapDoctorSpecializationOptions, mapDoctorSpecializations } from './map';
import {
	sampleSpecializationOptionsView,
	sampleSpecializationsView,
	sampleSpecialtyServer,
	sampleTitleOptionsView
} from './specializations.sample';

/*
 * Wave 5.2 · screen 80 (D-W52-54, D-W52-56α, D-W52-59): the client of the doctor's specializations — the wire read field
 * by field, the three calls, and the server's refusals. Lines of the server's own catalogue only (U-122).
 */

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('mapDoctorSpecializationOptions (D-W52-54, U-65.6)', () => {
	it('🔴 D-W52-54 · U-225: the list of the specialty one to one, in the server’s order — `code`, `name`, `kind`, and nothing else', () => {
		expect(mapDoctorSpecializationOptions(sampleSpecializationOptionsView())).toEqual([
			{ code: 'PR011-04', name: 'Αρτηριακή υπέρταση', kind: 'SOCIETY_AREA' },
			{ code: 'PR011-05', name: 'Βαλβιδοπάθειες', kind: 'SOCIETY_AREA' },
			{ code: 'PR011-14', name: 'Αιμοδυναμική και επεμβατική καρδιολογία', kind: 'SOCIETY_AREA' },
			{ code: 'PR011-15', name: 'Ηλεκτροφυσιολογία και βηματοδότηση', kind: 'SOCIETY_AREA' },
			{ code: 'PR011-16', name: 'Ηχωκαρδιολογία', kind: 'SOCIETY_AREA' },
			{ code: 'PR011-17', name: 'Καρδιακή ανεπάρκεια', kind: 'SOCIETY_AREA' }
		]);
		expect(
			mapDoctorSpecializationOptions(sampleTitleOptionsView())?.map((line) => line.kind)
		).toEqual(['FEK_TITLE', 'FEK_TITLE', 'FEK_TITLE']);
		const extra = mapDoctorSpecializationOptions([
			{ code: 'PR011-04', name: ' Αρτηριακή υπέρταση ', kind: 'SOCIETY_AREA', source: 'x', id: 7 }
		]);
		expect(extra).toEqual([{ code: 'PR011-04', name: 'Αρτηριακή υπέρταση', kind: 'SOCIETY_AREA' }]);
	});

	it('🔴 D-W52-59: `[]` is an answer — the specialty has no list; an answer that is no list is a failed read', () => {
		expect(mapDoctorSpecializationOptions([])).toEqual([]);
		for (const broken of [undefined, null, {}, 'x', 3, { 0: {} }]) {
			expect(mapDoctorSpecializationOptions(broken), String(broken)).toBeNull();
		}
	});

	it('🔴 U-65.6 (negative): a line that is no line of the catalogue cannot be picked — a code out of shape, a kind the contract does not know (never guessed), no name, a name too long, one twice, no object; markup stays text; the list is cut at its bound', () => {
		expect(
			mapDoctorSpecializationOptions([
				{ code: 'PR011-04', name: '<img src=x onerror=alert(1)>', kind: 'SOCIETY_AREA' },
				{ code: 'pr011-05', name: 'πεζά', kind: 'SOCIETY_AREA' },
				{ code: 'PR011-5', name: 'κοντός', kind: 'SOCIETY_AREA' },
				{ code: 'PR011-05 ', name: 'κενό', kind: 'SOCIETY_AREA' },
				{ code: '../PR011-05', name: 'διαδρομή', kind: 'SOCIETY_AREA' },
				{ code: 'PR011-06', name: 'άγνωστο είδος', kind: 'OTHER' },
				{ code: 'PR011-07', name: 'πεζό είδος', kind: 'fek_title' },
				{ code: 'PR011-08', name: 'χωρίς είδος' },
				{ code: 'PR011-09', name: '   ', kind: 'SOCIETY_AREA' },
				{ code: 'PR011-10', name: 'x'.repeat(161), kind: 'SOCIETY_AREA' },
				{ code: 'PR011-11', name: 7, kind: 'SOCIETY_AREA' },
				{ code: 'PR011-04', name: 'δεύτερη φορά', kind: 'FEK_TITLE' },
				null,
				'PR011-12',
				['PR011-13']
			])
		).toEqual([{ code: 'PR011-04', name: '<img src=x onerror=alert(1)>', kind: 'SOCIETY_AREA' }]);
		const many = Array.from({ length: 150 }, (_, index) => ({
			code: `PR${String(100 + Math.floor(index / 100)).padStart(3, '0')}-${String(index % 100).padStart(2, '0')}`,
			name: `Γραμμή ${index}`,
			kind: 'SOCIETY_AREA'
		}));
		expect(mapDoctorSpecializationOptions(many)).toHaveLength(100);
	});
});

describe('mapDoctorSpecializations (D-W52-54, D-W52-56α, U-65.6)', () => {
	it('🔴 U-225 · D-W52-56α: the picks one to one, each with its `kind` and its `status` — `APPROVED`, `PENDING`, `REJECTED`', () => {
		expect(mapDoctorSpecializations(sampleSpecializationsView())).toEqual([
			{
				code: 'PR011-15',
				name: 'Ηλεκτροφυσιολογία και βηματοδότηση',
				kind: 'SOCIETY_AREA',
				status: 'APPROVED'
			},
			{ code: 'PR011-17', name: 'Καρδιακή ανεπάρκεια', kind: 'SOCIETY_AREA', status: 'APPROVED' }
		]);
		expect(
			mapDoctorSpecializations([
				{ code: 'PR021-01', name: 'Επείγουσα ιατρική', kind: 'FEK_TITLE', status: 'APPROVED' },
				{ code: 'PR021-03', name: 'Εντατική θεραπεία', kind: 'FEK_TITLE', status: 'PENDING' },
				{ code: 'PR021-04', name: 'Σακχαρώδης διαβήτης', kind: 'FEK_TITLE', status: 'REJECTED' }
			])?.map((pick) => [pick.kind, pick.status])
		).toEqual([
			['FEK_TITLE', 'APPROVED'],
			['FEK_TITLE', 'PENDING'],
			['FEK_TITLE', 'REJECTED']
		]);
		expect(mapDoctorSpecializations([])).toEqual([]);
	});

	it('🔴 U-65.6 (negative): a save sends the WHOLE set, so a pick is never dropped in silence — a line that is no pick, a status or a kind the contract does not know, one twice, more than three, or no list at all is a failed read', () => {
		const good = {
			code: 'PR021-03',
			name: 'Εντατική θεραπεία',
			kind: 'FEK_TITLE',
			status: 'PENDING'
		};
		const refused: unknown[] = [
			undefined,
			null,
			{},
			'x',
			[{ ...good, status: 'DONE' }],
			[{ ...good, status: 'pending' }],
			[{ code: good.code, name: good.name, kind: good.kind }],
			[{ ...good, kind: 'OTHER' }],
			[{ ...good, code: 'PR021-3' }],
			[{ ...good, name: '' }],
			[good, null],
			[good, good],
			[
				good,
				{ ...good, code: 'PR021-04' },
				{ ...good, code: 'PR021-05' },
				{ ...good, code: 'PR021-06' }
			]
		];
		for (const answer of refused) {
			expect(mapDoctorSpecializations(answer), JSON.stringify(answer)).toBeNull();
		}
		// Markup in a name is a name: text, as it is.
		expect(
			mapDoctorSpecializations([{ ...good, name: '<b>Εντατική θεραπεία</b>' }])?.[0].name
		).toBe('<b>Εντατική θεραπεία</b>');
	});
});

describe('the three calls (D-W52-54)', () => {
	it('🔴 D-W52-54 · U-65.6: the two reads name the page’s language and NO doctor (never `tenantUserId`), with the cookies, never cached; `PUT` sends `{ codes }` alone — the whole set, in ONE call', async () => {
		const server = sampleSpecialtyServer();
		const fetchSpy = vi.fn(server.fetch);
		vi.stubGlobal('fetch', fetchSpy);
		expect(await getDoctorSpecializationOptions('el')).toHaveLength(6);
		expect(await getDoctorSpecializations('en')).toHaveLength(2);
		const saved = await replaceDoctorSpecializations(['PR011-17', 'PR011-04'], 'el');
		// The server answers in the list's order, whatever the order of the presses.
		expect(saved?.map((pick) => pick.code)).toEqual(['PR011-04', 'PR011-17']);
		expect(server.calls.map((call) => [call.method, call.path, call.search, call.body])).toEqual([
			['GET', '/doctor/profile/specializations/options', '?lang=el', undefined],
			['GET', '/doctor/profile/specializations', '?lang=en', undefined],
			['PUT', '/doctor/profile/specializations', '?lang=el', { codes: ['PR011-17', 'PR011-04'] }]
		]);
		for (const [, init] of fetchSpy.mock.calls) {
			expect((init as RequestInit).credentials).toBe('include');
			expect((init as RequestInit).cache).toBe('no-store');
		}
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId|doctorId/u);
		// `[]` takes them all away.
		expect(await replaceDoctorSpecializations([], 'el')).toEqual([]);
		expect(server.calls.at(-1)?.body).toEqual({ codes: [] });
	});

	it('🔴 D-W52-54: the reads live under the profile’s root, each by the page’s language — a save reads them again with «Το προφίλ μου»', () => {
		const root = doctorDashboardQueryKeys.profile();
		for (const key of [
			doctorDashboardQueryKeys.profileSpecializationOptions('el'),
			doctorDashboardQueryKeys.profileSpecializations('el'),
			doctorDashboardQueryKeys.profileLicence()
		]) {
			expect(key.slice(0, root.length)).toEqual([...root]);
		}
		expect(doctorDashboardQueryKeys.profileSpecializations('el')).not.toEqual(
			doctorDashboardQueryKeys.profileSpecializations('en')
		);
		expect(doctorDashboardQueryKeys.profileSpecializationOptions('el')).not.toEqual(
			doctorDashboardQueryKeys.profileSpecializations('el')
		);
	});
});

describe('readDoctorSpecializationsFailure (D-W52-54, `w52-b4` §9)', () => {
	const failure = (status: number, message = 'Refused') =>
		readDoctorSpecializationsFailure(
			new ApiError(message, status, '/doctor/profile/specializations')
		);

	it('🔴 D-W52-59: 422 past three / out of shape, 422 «not of the specialty» by the server’s marker, 429, 409, 401, 403 — and anything else nobody decided', () => {
		expect(failure(422, 'Validation error: codes must hold at most 3 specializations.')).toBe(
			'invalid'
		);
		expect(failure(422, 'Validation error: DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY')).toBe(
			'not-of-specialty'
		);
		expect(failure(429)).toBe('rate-limited');
		expect(failure(409)).toBe('conflict');
		expect(failure(401)).toBe('session');
		expect(failure(403)).toBe('forbidden');
		expect(failure(500)).toBe('unknown');
		expect(failure(0)).toBe('unknown');
		expect(readDoctorSpecializationsFailure(new Error('offline'))).toBe('unknown');
		expect(readDoctorSpecializationsFailure(undefined)).toBe('unknown');
	});

	it('🔴 U-65.6 (negative): the marker counts only as a whole word and only with its status', () => {
		expect(failure(422, 'XDOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY')).toBe('invalid');
		expect(failure(422, 'DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY_X')).toBe('invalid');
		expect(failure(422, 'doctor_specialization_not_of_specialty')).toBe('invalid');
		expect(failure(409, 'DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY')).toBe('conflict');
		expect(failure(500, 'DOCTOR_SPECIALIZATION_NOT_OF_SPECIALTY')).toBe('unknown');
	});
});
