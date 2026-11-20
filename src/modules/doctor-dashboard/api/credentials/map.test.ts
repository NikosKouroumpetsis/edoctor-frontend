import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$shared/lib/http';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	sampleCredentialGroup,
	sampleCredentialId,
	sampleCredentialsServer,
	sampleCredentialsView
} from './credentials.sample';
import { changeDoctorCredentialGroup, getDoctorCredentials } from './endpoints';
import { DoctorCredentialRefusal, readDoctorCredentialsFailure } from './failure';
import { mapDoctorCredentials, toDoctorCredentialsBody } from './map';
import type { DoctorCredentialItem } from './types';

/*
 * Wave 5.2 · screen 81 (U-210, D-W52-61, D-W52-63): the client of the doctor's biography — the wire read field by
 * field and in Greek alone, the body of a save, the one save made on the server's last answer, and its refusals.
 */

const PATH = '/doctor/profile/credentials';
const ID = sampleCredentialId(1);
const good = () => ({
	id: ID,
	kind: 'WORK',
	startYear: 2013,
	endYear: 2015,
	isCurrent: false,
	position: 0,
	translations: [{ language: 'el', title: 'Επιμελήτρια', organization: 'Νοσοκομείο' }]
});
const item = (title: string, more: Partial<DoctorCredentialItem> = {}): DoctorCredentialItem => ({
	title,
	organization: null,
	startYear: null,
	endYear: null,
	isCurrent: false,
	...more
});

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('mapDoctorCredentials (D-W52-61 / 63, U-65.6)', () => {
	it('🔴 U-210 · D-W52-63: the biography one to one in the SERVER’s order — the groups in turn, what the doctor does today first, then the newest — each row its id, its group, its GREEK title and organization, its years, «σήμερα» and where it was written; nothing is sorted here', () => {
		expect(mapDoctorCredentials(sampleCredentialsView())).toEqual([
			{
				id: sampleCredentialId(2),
				kind: 'STUDY',
				title: 'Ειδικότητα Καρδιολογίας',
				organization: 'Γενικό Νοσοκομείο Αθηνών',
				startYear: 2008,
				endYear: 2013,
				isCurrent: false,
				position: 1
			},
			{
				id: sampleCredentialId(1),
				kind: 'STUDY',
				title: 'Πτυχίο Ιατρικής',
				organization: 'Ιατρική Σχολή Αθηνών',
				startYear: 2001,
				endYear: 2007,
				isCurrent: false,
				position: 0
			},
			{
				id: sampleCredentialId(5),
				kind: 'WORK',
				title: 'Καρδιολόγος, ιδιωτικό ιατρείο',
				organization: 'Κηφισιά',
				startYear: 2015,
				endYear: null,
				isCurrent: true,
				position: 2
			},
			{
				id: sampleCredentialId(4),
				kind: 'WORK',
				title: 'Επιμελήτρια Καρδιολογικής Κλινικής',
				organization: 'Γενικό Νοσοκομείο Αθηνών',
				startYear: 2013,
				endYear: 2015,
				isCurrent: false,
				position: 1
			},
			{
				id: sampleCredentialId(3),
				kind: 'WORK',
				title: 'Ιατρός υπηρεσίας υπαίθρου',
				organization: 'Κέντρο Υγείας Καρύστου',
				startYear: 2007,
				endYear: 2008,
				isCurrent: false,
				position: 0
			},
			{
				id: sampleCredentialId(6),
				kind: 'CONFERENCE',
				title: 'Πανελλήνιο Καρδιολογικό Συνέδριο',
				organization: 'Ελληνική Καρδιολογική Εταιρεία',
				startYear: 2025,
				endYear: null,
				isCurrent: false,
				position: 0
			}
		]);
		// An order the server chose is kept, whatever it is.
		const turned = [...sampleCredentialsView()].reverse();
		expect(mapDoctorCredentials(turned)?.map((row) => row.id)).toEqual(turned.map((row) => row.id));
		expect(mapDoctorCredentials([])).toEqual([]);
	});

	it('🔴 U-207.3 · D-W52-61: Greek alone — the English text of a row is never read, an organization the server keeps empty is `null`, and a row WITHOUT a Greek text is left out (the doctor’s page has no words for it)', () => {
		const rows = mapDoctorCredentials([
			{
				...good(),
				translations: [
					{ language: 'en', title: 'Consultant', organization: 'Hospital' },
					{ language: 'el', title: '  Επιμελήτρια  ', organization: null }
				]
			},
			{
				...good(),
				id: sampleCredentialId(2),
				translations: [{ language: 'en', title: 'Only English', organization: null }]
			},
			{
				...good(),
				id: sampleCredentialId(3),
				translations: [{ language: 'el', title: 'Ιατρός', organization: '   ' }]
			}
		]);
		expect(rows?.map((row) => [row.id, row.title, row.organization])).toEqual([
			[ID, 'Επιμελήτρια', null],
			[sampleCredentialId(3), 'Ιατρός', null]
		]);
		expect(JSON.stringify(rows)).not.toMatch(/Consultant|Hospital|Only English|translations/u);
	});

	it('🔴 U-65.6 (negative): an answer that is no biography is a FAILED read, never a shorter one — a save sends a whole group back, so a row dropped here would be erased there', () => {
		const refused: unknown[] = [
			null,
			undefined,
			{},
			'[]',
			[null],
			[good(), 'x'],
			[{ ...good(), id: 'c1' }],
			[{ ...good(), id: undefined }],
			[{ ...good(), kind: 'OTHER' }],
			[{ ...good(), kind: 'work' }],
			[{ ...good(), startYear: '2013' }],
			[{ ...good(), endYear: 2015.5 }],
			[{ ...good(), startYear: undefined }],
			[{ ...good(), isCurrent: 'true' }],
			[{ ...good(), position: -1 }],
			[{ ...good(), position: '0' }],
			[{ ...good(), translations: null }],
			[{ ...good(), translations: ['el'] }],
			[{ ...good(), translations: [{ language: 'el', title: '', organization: null }] }],
			[{ ...good(), translations: [{ language: 'el', title: 7, organization: null }] }],
			[{ ...good(), translations: [{ language: 'el', title: 'x'.repeat(301) }] }],
			[{ ...good(), translations: [{ language: 'el', title: 'Τίτλος', organization: 7 }] }],
			[
				{
					...good(),
					translations: [{ language: 'el', title: 'Τίτλος', organization: 'x'.repeat(201) }]
				}
			],
			[good(), good()],
			sampleCredentialGroup('WORK', 61)
		];
		for (const answer of refused) {
			expect(mapDoctorCredentials(answer), JSON.stringify(answer)?.slice(0, 80)).toBeNull();
		}
		// The bounds themselves are answers: twenty a group, 300 and 200 characters.
		expect(mapDoctorCredentials(sampleCredentialGroup('WORK', 20))).toHaveLength(20);
		expect(
			mapDoctorCredentials([
				{
					...good(),
					translations: [{ language: 'el', title: 'x'.repeat(300), organization: 'y'.repeat(200) }]
				}
			])
		).toHaveLength(1);
		// Markup in a title is a title: text, as it is.
		expect(
			mapDoctorCredentials([
				{
					...good(),
					translations: [{ language: 'el', title: '<img src=x onerror=alert(1)>' }]
				}
			])?.[0].title
		).toBe('<img src=x onerror=alert(1)>');
	});
});

describe('toDoctorCredentialsBody (D-W52-61)', () => {
	it('🔴 U-207.3 · D-W52-61: the body of a save field by field — the group and its rows in the order given, each with ONE text, the Greek one; never an id, a place, a doctor or another language', () => {
		const body = toDoctorCredentialsBody('WORK', [
			item('Καρδιολόγος', { organization: 'Κηφισιά', startYear: 2015, isCurrent: true }),
			item('Επιμελήτρια', { startYear: 2013, endYear: 2015 })
		]);
		expect(body).toEqual({
			kind: 'WORK',
			items: [
				{
					startYear: 2015,
					endYear: null,
					isCurrent: true,
					translations: [{ language: 'el', title: 'Καρδιολόγος', organization: 'Κηφισιά' }]
				},
				{
					startYear: 2013,
					endYear: 2015,
					isCurrent: false,
					translations: [{ language: 'el', title: 'Επιμελήτρια', organization: null }]
				}
			]
		});
		expect(JSON.stringify(body)).not.toMatch(/"en"|tenantUserId|"id"|position/u);
		expect(toDoctorCredentialsBody('STUDY', [])).toEqual({ kind: 'STUDY', items: [] });
	});
});

describe('the calls (D-W52-61 / 63)', () => {
	it('🔴 D-W52-61 · U-65.6: the read names NO doctor and no language (never `tenantUserId`), with the cookies, never cached', async () => {
		const server = sampleCredentialsServer();
		const fetchSpy = vi.fn(server.fetch);
		vi.stubGlobal('fetch', fetchSpy);
		expect(await getDoctorCredentials()).toHaveLength(6);
		expect(server.calls.map((call) => [call.method, call.path, call.search, call.body])).toEqual([
			['GET', PATH, '', undefined]
		]);
		const init = fetchSpy.mock.calls[0][1] as RequestInit;
		expect(init.credentials).toBe('include');
		expect(init.cache).toBe('no-store');
	});

	it('🔴 U-210 · D-W52-63: a save reads the biography AGAIN and sends the WHOLE group from THAT answer — a row saved meanwhile elsewhere goes back with the rest — in the order it was WRITTEN, in Greek alone, in ONE write; the answer is the whole biography', async () => {
		const server = sampleCredentialsServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		// What a page read a while ago…
		const stale = await getDoctorCredentials();
		expect(stale?.filter((row) => row.kind === 'WORK')).toHaveLength(3);
		// …and what another tab wrote since: a fourth position.
		server.set([
			...server.rows(),
			{
				id: sampleCredentialId(7),
				kind: 'WORK',
				startYear: 2005,
				endYear: 2006,
				isCurrent: false,
				position: 3,
				translations: [{ language: 'el', title: 'Αγροτικός ιατρός', organization: null }]
			}
		]);
		const seen: string[][] = [];
		const answer = await changeDoctorCredentialGroup('WORK', (rows) => {
			seen.push(rows.map((row) => row.title));
			return {
				items: rows.map((row) => ({
					title: row.title,
					organization: row.organization,
					startYear: row.startYear,
					endYear: row.endYear,
					isCurrent: row.isCurrent
				}))
			};
		});
		// The change stands on the fresh rows, in the order they were written (`position`), never the page's order.
		expect(seen).toEqual([
			[
				'Ιατρός υπηρεσίας υπαίθρου',
				'Επιμελήτρια Καρδιολογικής Κλινικής',
				'Καρδιολόγος, ιδιωτικό ιατρείο',
				'Αγροτικός ιατρός'
			]
		]);
		expect(server.calls.slice(1).map((call) => [call.method, call.path])).toEqual([
			['GET', PATH],
			['PUT', PATH]
		]);
		const body = server.callsOf('PUT')[0].body as { kind: string; items: unknown[] };
		expect(Object.keys(body)).toEqual(['kind', 'items']);
		expect(body.kind).toBe('WORK');
		expect(body.items).toHaveLength(4);
		expect(JSON.stringify(body)).not.toMatch(/"en"|\(EN\)|tenantUserId|"id"|position/u);
		// The whole biography comes back: the other two groups untouched, the saved one in the page's order.
		expect(answer?.filter((row) => row.kind === 'STUDY')).toHaveLength(2);
		expect(answer?.filter((row) => row.kind === 'WORK').map((row) => row.title)).toEqual([
			'Καρδιολόγος, ιδιωτικό ιατρείο',
			'Επιμελήτρια Καρδιολογικής Κλινικής',
			'Ιατρός υπηρεσίας υπαίθρου',
			'Αγροτικός ιατρός'
		]);
	});

	it('🔴 D-W52-63 (negative): NOTHING is written when the change has nothing to stand on, or when the read before it fails', async () => {
		const server = sampleCredentialsServer();
		vi.stubGlobal('fetch', vi.fn(server.fetch));
		for (const refusal of ['gone', 'full'] as const) {
			const error = await changeDoctorCredentialGroup('WORK', () => ({ refusal })).catch(
				(thrown: unknown) => thrown
			);
			expect(error).toBeInstanceOf(DoctorCredentialRefusal);
			expect(readDoctorCredentialsFailure(error)).toBe(refusal);
		}
		const change = vi.fn(() => ({ items: [] }));
		server.refuse('GET', PATH, 500);
		await expect(changeDoctorCredentialGroup('WORK', change)).rejects.toBeInstanceOf(ApiError);
		// An answer that is no biography is no ground for a save either.
		server.plant('GET', PATH, { status: 200, data: [{ id: 'broken' }] });
		await expect(changeDoctorCredentialGroup('WORK', change)).rejects.toBeInstanceOf(ApiError);
		expect(change).not.toHaveBeenCalled();
		expect(server.callsOf('PUT')).toHaveLength(0);
		expect(server.titles('WORK')).toHaveLength(3);
	});

	it('🔴 D-W52-63: the read lives under the profile’s root, ONE key whatever the page’s language — a save reads it again with «Το προφίλ μου»', () => {
		const root = doctorDashboardQueryKeys.profile();
		const key = doctorDashboardQueryKeys.profileCredentials();
		expect(key.slice(0, root.length)).toEqual([...root]);
		expect(key).toEqual([...root, 'credentials']);
	});
});

describe('readDoctorCredentialsFailure (D-W52-63, `w52-b5` §2)', () => {
	const failure = (status: number, message = 'Refused') =>
		readDoctorCredentialsFailure(new ApiError(message, status, PATH));

	it('🔴 D-W52-63: 422 a group the server will not take, 429, 409, 401, 403, the change’s own refusals — and anything else nobody decided', () => {
		expect(failure(422, 'Validation Error: items[0].startYear must be a whole year')).toBe(
			'invalid'
		);
		expect(failure(422, 'Validation Error: DOCTOR_WRITES_GREEK_ONLY')).toBe('invalid');
		expect(failure(429)).toBe('rate-limited');
		expect(failure(409)).toBe('conflict');
		expect(failure(401)).toBe('session');
		expect(failure(403)).toBe('forbidden');
		expect(failure(500)).toBe('unknown');
		expect(failure(0)).toBe('unknown');
		expect(readDoctorCredentialsFailure(new DoctorCredentialRefusal('gone'))).toBe('gone');
		expect(readDoctorCredentialsFailure(new DoctorCredentialRefusal('full'))).toBe('full');
		expect(readDoctorCredentialsFailure(new Error('offline'))).toBe('unknown');
		expect(readDoctorCredentialsFailure(undefined)).toBe('unknown');
	});
});
