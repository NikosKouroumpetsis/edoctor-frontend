import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import { getDoctorLanguageOptions, getDoctorLanguages, replaceDoctorLanguages } from './endpoints';
import { readDoctorLanguagesFailure } from './failure';
import {
	sampleLanguageOptionsView,
	sampleLanguagesServer,
	sampleLanguagesView
} from './languages.sample';
import { mapDoctorLanguageOptions, mapDoctorLanguages } from './map';

/*
 * Wave 5.2 · screen 82 (U-211, D-W52-64, D-W52-66, D-W52-69): the client of the doctor's languages — the wire read field
 * by field, the three calls, and the server's refusals. Lines of the server's own catalogue only.
 */

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('mapDoctorLanguageOptions (D-W52-64 / 69, U-65.6)', () => {
	it('🔴 D-W52-69: the catalogue one to one, in the server’s order — `code`, `name`, `normalized`, and nothing else (no `iso`, no `slug`)', () => {
		const options = mapDoctorLanguageOptions(sampleLanguageOptionsView());
		expect(options?.slice(0, 3)).toEqual([
			{ code: 'SL001', name: 'Ελληνικά', normalized: 'ελληνικα' },
			{ code: 'SL002', name: 'Αγγλικά', normalized: 'αγγλικα' },
			{ code: 'SL003', name: 'Γερμανικά', normalized: 'γερμανικα' }
		]);
		expect(options).toHaveLength(15);
		expect(options?.find((line) => line.code === 'SL050')).toEqual({
			code: 'SL050',
			name: 'Ελληνική Νοηματική Γλώσσα',
			normalized: 'ελληνικη νοηματικη γλωσσα'
		});
		expect(mapDoctorLanguageOptions(sampleLanguageOptionsView('en'))?.[6]).toEqual({
			code: 'SL044',
			name: 'French',
			normalized: 'french'
		});
	});

	it('🔴 D-W52-69: an answer that is no list is a failed read; `[]` is an empty catalogue', () => {
		expect(mapDoctorLanguageOptions([])).toEqual([]);
		for (const broken of [undefined, null, {}, 'x', 3, { 0: {} }]) {
			expect(mapDoctorLanguageOptions(broken), String(broken)).toBeNull();
		}
	});

	it('🔴 U-65.6 (negative): a line that is no line of the catalogue cannot be picked — a code out of shape (the old `PR003` too), no name, a name too long, no `normalized`, one twice, no object; markup stays text; the list is cut at its bound', () => {
		expect(
			mapDoctorLanguageOptions([
				{ code: 'SL044', name: '<img src=x onerror=alert(1)>', normalized: 'γαλλικα' },
				{ code: 'PR003', name: 'Γερμανικά', normalized: 'γερμανικα' },
				{ code: 'sl002', name: 'πεζά', normalized: 'πεζα' },
				{ code: 'SL02', name: 'κοντός', normalized: 'κοντος' },
				{ code: 'SL0020', name: 'μακρύς', normalized: 'μακρυς' },
				{ code: 'SL002 ', name: 'κενό', normalized: 'κενο' },
				{ code: '../SL002', name: 'διαδρομή', normalized: 'διαδρομη' },
				{ code: 'SL010', name: '', normalized: 'αραβικα' },
				{ code: 'SL017', name: 'Α'.repeat(81), normalized: 'βουλγαρικα' },
				{ code: 'SL036', name: 'Ισπανικά' },
				{ code: 'SL054', name: 'Εβραϊκά', normalized: 7 },
				{ code: 'SL044', name: 'Δεύτερη φορά', normalized: 'δευτερη φορα' },
				{ code: 7, name: 'αριθμός', normalized: 'αριθμος' },
				null,
				'SL001',
				['SL001']
			])
		).toEqual([{ code: 'SL044', name: '<img src=x onerror=alert(1)>', normalized: 'γαλλικα' }]);
		const many = Array.from({ length: 450 }, (_, index) => ({
			code: `SL${String(index % 1000).padStart(3, '0')}`,
			name: `Γλώσσα ${index}`,
			normalized: `γλωσσα ${index}`
		}));
		expect(mapDoctorLanguageOptions(many)).toHaveLength(400);
	});
});

describe('mapDoctorLanguages (D-W52-66 / 69, U-65.6)', () => {
	it('🔴 D-W52-69: the doctor’s languages one to one, in the server’s order — `code` and `name`, nothing else of the row (no id of the row or of the doctor)', () => {
		expect(mapDoctorLanguages(sampleLanguagesView(['SL002', 'SL001', 'SL044']))).toEqual([
			{ code: 'SL001', name: 'Ελληνικά' },
			{ code: 'SL002', name: 'Αγγλικά' },
			{ code: 'SL044', name: 'Γαλλικά' }
		]);
		expect(mapDoctorLanguages([])).toEqual([]);
		expect(JSON.stringify(mapDoctorLanguages(sampleLanguagesView()))).not.toMatch(
			/doctorId|createdAt|slug|"id"/u
		);
	});

	it('🔴 U-65.6 (negative): a save sends the WHOLE set, so a broken answer is a FAILED read, never a shorter list — no list, a line that is no language, one twice, more than the ten the server keeps', () => {
		const good = { code: 'SL001', name: 'Ελληνικά' };
		const broken: unknown[] = [
			undefined,
			null,
			{},
			'SL001',
			[good, null],
			[good, { code: 'PR003', name: 'Γερμανικά' }],
			[good, { code: 'SL002' }],
			[good, { code: 'SL002', name: '   ' }],
			[good, { code: 'SL002', name: 7 }],
			[good, { code: 'sl002', name: 'Αγγλικά' }],
			[good, good],
			Array.from({ length: 11 }, (_, index) => ({
				code: `SL0${String(index + 10)}`,
				name: `Γλώσσα ${index}`
			}))
		];
		for (const view of broken) {
			expect(mapDoctorLanguages(view), JSON.stringify(view)).toBeNull();
		}
		// Ten is the server's own bound: an answer.
		expect(
			mapDoctorLanguages(
				Array.from({ length: 10 }, (_, index) => ({
					code: `SL0${String(index + 10)}`,
					name: `Γλώσσα ${index}`
				}))
			)
		).toHaveLength(10);
	});
});

describe('the calls of the doctor’s languages (D-W52-64 / 66)', () => {
	it('🔴 D-W52-66 · U-65.6: the catalogue is a public read without the cookies; the doctor’s languages and the save carry them and are never cached; each in the page’s language; `PUT` sends `{ codes }` ALONE and names NO doctor', async () => {
		const server = sampleLanguagesServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		expect(await getDoctorLanguageOptions('el')).toHaveLength(15);
		expect((await getDoctorLanguages('en'))?.map((language) => language.name)).toEqual([
			'Greek',
			'English'
		]);
		const saved = await replaceDoctorLanguages(['SL044', 'SL001'], 'el');
		// The server answers Greek first and then by name, whatever the order of the presses.
		expect(saved).toEqual([
			{ code: 'SL001', name: 'Ελληνικά' },
			{ code: 'SL044', name: 'Γαλλικά' }
		]);
		expect(server.calls.map((call) => [call.method, call.path, call.search, call.body])).toEqual([
			['GET', '/doctor/public/speak-languages/options', '?lang=el', undefined],
			['GET', '/doctor/profile/speak-languages', '?lang=en', undefined],
			['PUT', '/doctor/profile/speak-languages', '?lang=el', { codes: ['SL044', 'SL001'] }]
		]);
		expect(server.calls.map((call) => call.credentials)).toEqual(['omit', 'include', 'include']);
		expect(server.calls.slice(1).map((call) => call.cache)).toEqual(['no-store', 'no-store']);
		expect(JSON.stringify(server.calls)).not.toMatch(/tenantUserId|doctorId/u);
		// `[]` takes them all away.
		expect(await replaceDoctorLanguages([], 'el')).toEqual([]);
		expect(server.calls.at(-1)?.body).toEqual({ codes: [] });
	});

	it('🔴 D-W52-69: the reads live under the profile’s root, each by the page’s language — a save reads them again with «Το προφίλ μου»', () => {
		const root = doctorDashboardQueryKeys.profile();
		for (const key of [
			doctorDashboardQueryKeys.profileLanguageOptions('el'),
			doctorDashboardQueryKeys.profileLanguages('el'),
			doctorDashboardQueryKeys.profileLinks()
		]) {
			expect(key.slice(0, root.length)).toEqual([...root]);
		}
		expect(doctorDashboardQueryKeys.profileLanguages('el')).not.toEqual(
			doctorDashboardQueryKeys.profileLanguages('en')
		);
		expect(doctorDashboardQueryKeys.profileLanguageOptions('el')).not.toEqual(
			doctorDashboardQueryKeys.profileLanguages('el')
		);
	});
});

describe('readDoctorLanguagesFailure (D-W52-66, `w52-b6` §5)', () => {
	const failure = (status: number, message = 'Refused') =>
		readDoctorLanguagesFailure(new ApiError(message, status, '/doctor/profile/speak-languages'));

	it('🔴 D-W52-69: 422 past ten / out of shape, 422 «not in the catalogue» by the server’s marker, 429, 409, 401, 403 — and anything else nobody decided', () => {
		expect(failure(422, 'Validation error: codes must hold at most 10 languages.')).toBe('invalid');
		expect(failure(422, 'Validation error: DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE')).toBe(
			'not-in-catalogue'
		);
		expect(failure(429)).toBe('rate-limited');
		expect(failure(409)).toBe('conflict');
		expect(failure(401)).toBe('session');
		expect(failure(403)).toBe('forbidden');
		expect(failure(500)).toBe('unknown');
		expect(failure(0)).toBe('unknown');
		expect(readDoctorLanguagesFailure(new Error('offline'))).toBe('unknown');
		expect(readDoctorLanguagesFailure(undefined)).toBe('unknown');
	});

	it('🔴 U-65.6 (negative): the marker counts only as a whole word and only with its status', () => {
		expect(failure(422, 'XDOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE')).toBe('invalid');
		expect(failure(422, 'DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE_X')).toBe('invalid');
		expect(failure(422, 'doctor_speak_language_not_in_catalogue')).toBe('invalid');
		expect(failure(409, 'DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE')).toBe('conflict');
		expect(failure(500, 'DOCTOR_SPEAK_LANGUAGE_NOT_IN_CATALOGUE')).toBe('unknown');
	});
});
