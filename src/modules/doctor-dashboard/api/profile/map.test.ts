import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient } from '@tanstack/svelte-query';
import { doctorDashboardQueryKeys } from '$modules/doctor-dashboard/api/keys';
import {
	getMyPracticeLicence,
	getMyProfile,
	getMyProfilePreview,
	getMyProfileText
} from './endpoints';
import { mapDoctorMyProfile, mapDoctorPracticeLicence, mapDoctorProfileText } from './map';
import {
	SAMPLE_DESCRIPTION,
	SAMPLE_DOCTOR_ID,
	sampleDescriptionReader,
	sampleMyProfileView,
	sampleProfileTextView
} from './profile.sample';
import {
	doctorMyPracticeLicenceQuery,
	doctorMyProfilePreviewQuery,
	doctorMyProfileQuery,
	doctorMyProfileTextQuery
} from './queries';
import type { DoctorMyProfileView, DoctorProfileTextView } from './types';

afterEach(() => vi.unstubAllGlobals());

const envelope = (data: unknown) =>
	new Response(JSON.stringify({ status: 'success', message: '', data }), { status: 200 });
const broken = (patch: Record<string, unknown>) =>
	mapDoctorMyProfile({ ...sampleMyProfileView(), ...patch } as DoctorMyProfileView);

describe('mapDoctorMyProfile (D-W52-17, U-65.6)', () => {
	// Widened by D-W52-47 (screen 79): `sections.about` carries `nameLocked` too.
	// Widened by D-W52-57 / 59 (screen 80): `sections.specialty` carries `specializationsCount` and `hasCatalogue` too.
	it('D-W52-17: the server’s facts one to one — the id and the slug, the visibility, the six sections, the helpers', () => {
		expect(
			mapDoctorMyProfile(
				sampleMyProfileView({
					visibility: {
						visible: false,
						reason: 'LICENCE_EXPIRED',
						licenceEndedAt: '2026-11-15T21:59:59.999Z'
					},
					missing: ['ADD_SPEAK_LANGUAGES']
				})
			)
		).toEqual({
			doctorId: SAMPLE_DOCTOR_ID,
			slug: 'eleni-pappa-kardiologos',
			visibility: {
				visible: false,
				reason: 'LICENCE_EXPIRED',
				licenceEndedAt: '2026-11-15T21:59:59.999Z'
			},
			sections: {
				photos: { count: 4 },
				about: { fullName: 'Ελένη Παππά', hasDescription: true, nameLocked: true },
				specialty: { name: 'Καρδιολόγος', specializationsCount: 2, hasCatalogue: true },
				cv: { studies: 2, positions: 3, conferences: 1 },
				languages: { names: ['Ελληνικά', 'Αγγλικά'], socialCount: 2 },
				services: { count: 4, minPrice: 50, samePrice: false }
			},
			missing: ['ADD_SPEAK_LANGUAGES']
		});
	});

	it('🔴 D-W52-47 (U-207.1): `nameLocked` of the name is only the server’s own `true` — `false`, a word, a number or nothing is an open name', () => {
		const lockOf = (nameLocked: unknown) =>
			broken({
				sections: {
					...sampleMyProfileView().sections,
					about: { fullName: 'Ελένη Παππά', hasDescription: true, nameLocked }
				}
			})?.sections.about.nameLocked;
		expect(lockOf(true)).toBe(true);
		for (const value of [false, 'true', 1, null, undefined, {}]) {
			expect(lockOf(value), String(value)).toBe(false);
		}
		expect(broken({ sections: 'none' })?.sections.about).toEqual({
			fullName: null,
			hasDescription: false,
			nameLocked: false
		});
	});

	it('🔴 U-65.6 (negative): an answer that is no profile is a failed read — nothing, a list, no server id for the doctor', () => {
		for (const view of [null, undefined, [], 'profile', 7]) {
			expect(mapDoctorMyProfile(view as never), String(view)).toBeNull();
		}
		for (const doctorId of [undefined, null, '', 'doctor-1', 42, `${SAMPLE_DOCTOR_ID}/../x`]) {
			expect(broken({ doctorId }), String(doctorId)).toBeNull();
		}
	});

	it('🔴 U-65.6 (negative): a slug that is no slug, a name too long or no text is none — never drawn, never an address', () => {
		for (const slug of [null, '', 'a/b', '../admin', 'x'.repeat(161), '<b>x</b>', 7]) {
			expect(broken({ slug })?.slug, String(slug)).toBeNull();
		}
		const facts = broken({
			sections: {
				...sampleMyProfileView().sections,
				about: { fullName: 'Ε'.repeat(161), hasDescription: 'yes' },
				specialty: { name: '   ' }
			}
		});
		expect(facts?.sections.about).toEqual({
			fullName: null,
			hasDescription: false,
			nameLocked: false
		});
		expect(facts?.sections.specialty).toEqual({
			name: null,
			specializationsCount: 0,
			hasCatalogue: false
		});
	});

	it('🔴 U-65.6 (negative): a count that is no whole number from 0 is 0; a price that is no amount is none; too many languages are cut', () => {
		const facts = broken({
			sections: {
				photos: { count: -3 },
				about: { fullName: 'Ελένη Παππά', hasDescription: true },
				specialty: { name: 'Καρδιολόγος' },
				cv: { studies: 2.5, positions: '3', conferences: 100_000 },
				languages: {
					names: [...Array.from({ length: 40 }, (_, index) => `Γλώσσα ${index}`), 7, '', null],
					socialCount: Number.NaN
				},
				services: { count: 2, minPrice: Number.POSITIVE_INFINITY, samePrice: 'true' }
			}
		});
		expect(facts?.sections.photos.count).toBe(0);
		expect(facts?.sections.cv).toEqual({ studies: 0, positions: 0, conferences: 0 });
		expect(facts?.sections.languages.names).toHaveLength(30);
		expect(facts?.sections.languages.socialCount).toBe(0);
		expect(facts?.sections.services).toEqual({ count: 2, minPrice: null, samePrice: false });
		for (const minPrice of [-1, '50', null, 100_001]) {
			const priced = broken({
				sections: {
					...sampleMyProfileView().sections,
					services: { count: 2, minPrice, samePrice: false }
				}
			});
			expect(priced?.sections.services.minPrice, String(minPrice)).toBeNull();
		}
		// No service, no price — whatever a broken answer says.
		const none = broken({
			sections: {
				...sampleMyProfileView().sections,
				services: { count: 0, minPrice: 50, samePrice: true }
			}
		});
		expect(none?.sections.services.minPrice).toBeNull();
	});

	it('🔴 U-65.6 (negative): missing sections read as empty ones; an unknown reason or helper is left out; `visible` is only the server’s own `true`, never beside a reason', () => {
		const bare = broken({ visibility: undefined, sections: 'none', missing: 'ADD_STUDIES' });
		expect(bare?.visibility).toEqual({ visible: false, reason: null, licenceEndedAt: null });
		expect(bare?.sections.photos).toEqual({ count: 0 });
		expect(bare?.sections.languages).toEqual({ names: [], socialCount: 0 });
		expect(bare?.missing).toEqual([]);
		expect(
			broken({ visibility: { visible: 'true', reason: 'BANNED', licenceEndedAt: 'never' } })
				?.visibility
		).toEqual({ visible: false, reason: null, licenceEndedAt: null });
		expect(
			broken({ visibility: { visible: true, reason: 'NOT_VERIFIED', licenceEndedAt: null } })
				?.visibility.visible
		).toBe(false);
		// The day of the end only with its reason, and only a day the browser can read.
		expect(
			broken({
				visibility: {
					visible: false,
					reason: 'NOT_VERIFIED',
					licenceEndedAt: '2026-11-15T21:59:59.999Z'
				}
			})?.visibility.licenceEndedAt
		).toBeNull();
		expect(
			broken({
				visibility: { visible: false, reason: 'LICENCE_EXPIRED', licenceEndedAt: '<script>' }
			})?.visibility.licenceEndedAt
		).toBeNull();
		// D-W52-17: only the four helpers of this page, in the server's order, each once.
		expect(
			broken({
				missing: [
					'ADD_SPEAK_LANGUAGES',
					'ADD_BIO',
					'VERIFY_LOGIN_PHONE',
					'ADD_PROFILE_IMAGE',
					'ADD_PROFILE_IMAGE',
					'<b>x</b>',
					null
				]
			})?.missing
		).toEqual(['ADD_PROFILE_IMAGE', 'ADD_SPEAK_LANGUAGES']);
	});
});

describe('the two reads of «Το προφίλ μου» (D-W52-17, D-W52-18)', () => {
	it('🔴 U-224.2: both ask for the doctor of the session — the path names nobody, only the language follows', async () => {
		const spy = vi.fn(async (input: string) =>
			envelope(
				String(input).includes('/preview')
					? { doctor: null, pricingVisible: true, language: 'el' }
					: sampleMyProfileView()
			)
		);
		vi.stubGlobal('fetch', spy);
		expect((await getMyProfile('el'))?.doctorId).toBe(SAMPLE_DOCTOR_ID);
		expect((await getMyProfilePreview('en')).doctor).toBeNull();
		const [overview, preview] = spy.mock.calls.map(([input]) => new URL(String(input)));
		expect(overview.pathname).toMatch(/\/doctor\/me\/profile$/u);
		expect([...overview.searchParams]).toEqual([['lang', 'el']]);
		expect(preview.pathname).toMatch(/\/doctor\/me\/profile\/preview$/u);
		expect([...preview.searchParams]).toEqual([['lang', 'en']]);
	});

	it('D-W52-17: both live under ONE root of the dashboard’s cache, by language — personal, a refusal never asked again', () => {
		const overview = doctorMyProfileQuery('el');
		const preview = doctorMyProfilePreviewQuery('el', () => null);
		expect(overview.queryKey).toEqual(['doctor-dashboard', 'profile', 'overview', 'el']);
		expect(preview.queryKey).toEqual(['doctor-dashboard', 'profile', 'preview', 'el']);
		expect(overview.queryKey.slice(0, 2)).toEqual([...doctorDashboardQueryKeys.profile()]);
		expect(overview.meta).toEqual(preview.meta);
		expect(overview.meta).toBeDefined();
		expect(preview.refetchOnWindowFocus).toBe(false);
	});

	it('🔴 U-65.6 (negative): an answer that is no profile is a failed read, never an empty page', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope({ doctorId: 'nobody' }))
		);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		await expect(client.fetchQuery(doctorMyProfileQuery('el'))).rejects.toThrow();
	});

	it('🔴 D-W52-18: the preview keeps what the screen’s reader made of the answer — its facts, or `null` for a page that cannot be drawn', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope({ doctor: null, pricingVisible: true, language: 'el' }))
		);
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		const read = vi.fn((answer: { doctor: unknown }) => (answer.doctor ? { name: 'x' } : null));
		const missing = await client.fetchQuery(doctorMyProfilePreviewQuery('el', read));
		expect(read).toHaveBeenCalledWith({ doctor: null, pricingVisible: true, language: 'el' });
		expect(missing.profile).toBeNull();
		expect(typeof missing.readAt).toBe('number');
	});
});

describe('«Όνομα και περιγραφή»: the page’s own text (D-W52-47, D-W52-48, U-65.6)', () => {
	const textOf = (view: unknown, read = sampleDescriptionReader) =>
		mapDoctorProfileText(view as DoctorProfileTextView, read);

	it('🔴 D-W52-48: the name and the description as the paragraphs the public page’s reader makes — nothing else of the answer is kept', () => {
		const facts = textOf(sampleProfileTextView());
		expect(facts).toEqual({ fullName: 'Ελένη Παππά', paragraphs: [...SAMPLE_DESCRIPTION] });
		expect(Object.keys(facts ?? {})).toEqual(['fullName', 'paragraphs']);
	});

	it('🔴 U-207.2: no description yet — `{}`, no blocks, blank ones — is no paragraph; `null` (no text in that language) is an answer: no name, no description', () => {
		expect(textOf(sampleProfileTextView([]))).toEqual({ fullName: 'Ελένη Παππά', paragraphs: [] });
		expect(textOf(sampleProfileTextView(['   ', '']))?.paragraphs).toEqual([]);
		expect(textOf(sampleProfileTextView([], { description: null }))?.paragraphs).toEqual([]);
		expect(textOf(null)).toEqual({ fullName: null, paragraphs: [] });
	});

	it('🔴 U-65.6 (negative): an answer that is no text is a failed read — nothing, a list, a word, a number', () => {
		for (const view of [undefined, [], [sampleProfileTextView()], 'text', 7, true]) {
			expect(textOf(view), String(view)).toBeUndefined();
		}
	});

	it('🔴 U-65.6 (negative): a name too long or no text is none; what the reader answers is trusted for nothing — only words are kept, trimmed, bounded in number and in length', () => {
		for (const fullName of ['Ε'.repeat(161), '   ', 7, null, undefined, { name: 'x' }]) {
			expect(
				textOf(sampleProfileTextView([], { fullName: fullName as string }))?.fullName,
				String(fullName)
			).toBeNull();
		}
		const mixed = () => ['  Πρώτη  ', 7, null, '', '   ', { text: 'x' }, 'Δεύτερη'] as never;
		expect(textOf(sampleProfileTextView(), mixed)?.paragraphs).toEqual(['Πρώτη', 'Δεύτερη']);
		const many = () => Array.from({ length: 500 }, (_, index) => `Παράγραφος ${index}`);
		expect(textOf(sampleProfileTextView(), many)?.paragraphs).toHaveLength(100);
		const long = () => ['α'.repeat(50_000)];
		expect(textOf(sampleProfileTextView(), long)?.paragraphs[0]).toHaveLength(10_000);
		for (const reader of [() => 'one string' as never, () => null as never]) {
			expect(textOf(sampleProfileTextView(), reader)?.paragraphs).toEqual([]);
		}
		const failing = () => {
			throw new Error('broken document');
		};
		expect(textOf(sampleProfileTextView(), failing)).toEqual({
			fullName: 'Ελένη Παππά',
			paragraphs: []
		});
	});

	it('🔴 U-65.6 (negative): markup stays the words it is — the map makes no element and unwraps nothing', () => {
		const facts = textOf(
			sampleProfileTextView(['<img src=x onerror=alert(1)>'], { fullName: '<b>Ελένη</b>' })
		);
		expect(facts).toEqual({
			fullName: '<b>Ελένη</b>',
			paragraphs: ['<img src=x onerror=alert(1)>']
		});
	});

	it('🔴 D-W52-47 · D-W52-01: the read asks `GET /doctor/profile/translations/el` — Greek whatever the page’s language, no parameter, no doctor named — and hands the reader the server’s own document', async () => {
		const view = sampleProfileTextView();
		const spy = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () =>
			envelope(view)
		);
		vi.stubGlobal('fetch', spy);
		const read = vi.fn(sampleDescriptionReader);
		expect(await getMyProfileText(read)).toEqual({
			fullName: 'Ελένη Παππά',
			paragraphs: [...SAMPLE_DESCRIPTION]
		});
		expect(spy).toHaveBeenCalledTimes(1);
		const [input, init] = spy.mock.calls[0];
		const url = new URL(String(input));
		expect(url.pathname).toMatch(/\/doctor\/profile\/translations\/el$/u);
		expect(url.search).toBe('');
		expect(init?.method).toBe('GET');
		expect(init?.credentials).toBe('include');
		expect(init?.cache).toBe('no-store');
		expect(read).toHaveBeenCalledExactlyOnceWith(view.description);
	});

	it('D-W52-47: the text lives under the profile’s root of the dashboard’s cache — one key whatever the language, personal, asked again when the page comes back to the front; a refusal is never asked again', () => {
		const text = doctorMyProfileTextQuery(sampleDescriptionReader);
		expect(text.queryKey).toEqual(['doctor-dashboard', 'profile', 'text']);
		expect(text.queryKey.slice(0, 2)).toEqual([...doctorDashboardQueryKeys.profile()]);
		expect(text.meta).toEqual(doctorMyProfileQuery('el').meta);
		expect(text.meta).toBeDefined();
		expect(text.refetchOnWindowFocus).toBe('always');
	});

	it('🔴 U-65.6 (negative): an answer that is no text fails the query, never an empty page; `null` does not', async () => {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope(['not', 'a', 'text']))
		);
		await expect(
			client.fetchQuery(doctorMyProfileTextQuery(sampleDescriptionReader))
		).rejects.toThrow();
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope(null))
		);
		await expect(
			client.fetchQuery(doctorMyProfileTextQuery(sampleDescriptionReader))
		).resolves.toEqual({ fullName: null, paragraphs: [] });
	});
});

describe('the specialty of «Το προφίλ μου» (D-W52-57 / 59, screen 80)', () => {
	const specialtyOf = (specialty: unknown, missing: unknown = []) =>
		broken({ sections: { ...sampleMyProfileView().sections, specialty }, missing });

	it('🔴 D-W52-57: `hasCatalogue` is only the server’s own `true`; the count is the server’s, none without a list and never past the three it keeps', () => {
		expect(
			specialtyOf({ name: 'Καρδιολόγος', specializationsCount: 1, hasCatalogue: true })?.sections
				.specialty
		).toEqual({ name: 'Καρδιολόγος', specializationsCount: 1, hasCatalogue: true });
		for (const flag of [false, 'true', 1, null, undefined]) {
			expect(
				specialtyOf({ name: 'Καρδιολόγος', specializationsCount: 2, hasCatalogue: flag })?.sections
					.specialty,
				String(flag)
			).toEqual({ name: 'Καρδιολόγος', specializationsCount: 0, hasCatalogue: false });
		}
		for (const [sent, kept] of [
			[7, 3],
			[3, 3],
			[-1, 0],
			[1.5, 0],
			['2', 0],
			[null, 0]
		] as const) {
			expect(
				specialtyOf({ name: 'Καρδιολόγος', specializationsCount: sent, hasCatalogue: true })
					?.sections.specialty.specializationsCount,
				String(sent)
			).toBe(kept);
		}
		// An answer of before the list (no such fields): the specialty alone.
		expect(specialtyOf({ name: 'Καρδιολόγος' })?.sections.specialty).toEqual({
			name: 'Καρδιολόγος',
			specializationsCount: 0,
			hasCatalogue: false
		});
	});

	it('🔴 D-W52-57: `ADD_SPECIALIZATIONS` is kept in the server’s place among the helpers — and never for a specialty without a list', () => {
		const withList = { name: 'Καρδιολόγος', specializationsCount: 0, hasCatalogue: true };
		expect(
			specialtyOf(withList, ['ADD_SPEAK_LANGUAGES', 'ADD_SPECIALIZATIONS', 'ADD_PROFILE_IMAGE'])
				?.missing
		).toEqual(['ADD_PROFILE_IMAGE', 'ADD_SPECIALIZATIONS', 'ADD_SPEAK_LANGUAGES']);
		expect(
			specialtyOf({ ...withList, hasCatalogue: false }, ['ADD_SPECIALIZATIONS', 'ADD_STUDIES'])
				?.missing
		).toEqual(['ADD_STUDIES']);
		expect(specialtyOf(withList, ['add_specializations', 'ADD_SPECIALISATIONS'])?.missing).toEqual(
			[]
		);
	});
});

describe('the practice licence of screen 80 (D-W52-59, U-65.6)', () => {
	it('🔴 D-W52-59: the number and the day of the base profile, and NOTHING else of it — no email, no phone, no id', () => {
		const facts = mapDoctorPracticeLicence({
			id: SAMPLE_DOCTOR_ID,
			licenseNumber: ' 48213 ',
			licenseObtainedDate: '2010-03-12T00:00:00.000Z',
			notificationEmail: 'e***@seed.edoctor.test',
			phone: '2100000000'
		} as never);
		expect(facts).toEqual({ number: '48213', obtainedDay: '2010-03-12' });
		expect(
			mapDoctorPracticeLicence({
				licenseNumber: 'Α-48/2010',
				licenseObtainedDate: '2010-03-12'
			} as never)
		).toEqual({ number: 'Α-48/2010', obtainedDay: '2010-03-12' });
	});

	it('🔴 D-W52-59: a record without a number, or without a day, says so — `null`, never a made-up value', () => {
		expect(
			mapDoctorPracticeLicence({ licenseNumber: null, licenseObtainedDate: null } as never)
		).toEqual({ number: null, obtainedDay: null });
		expect(mapDoctorPracticeLicence({} as never)).toEqual({ number: null, obtainedDay: null });
		expect(mapDoctorPracticeLicence({ licenseNumber: '   ' } as never)?.number).toBeNull();
	});

	it('🔴 U-65.6 (negative): a number past the server’s 50, of more than one line or no text is none; a day the calendar lacks, or no day, is none; markup stays text; an answer that is no record is a failed read', () => {
		const numberOf = (licenseNumber: unknown) =>
			mapDoctorPracticeLicence({ licenseNumber } as never)?.number;
		expect(numberOf('9'.repeat(50))).toBe('9'.repeat(50));
		expect(numberOf('9'.repeat(51))).toBeNull();
		expect(numberOf('48213\n<script>')).toBeNull();
		expect(numberOf('48213\u2028x')).toBeNull();
		expect(numberOf(48213)).toBeNull();
		expect(numberOf(['48213'])).toBeNull();
		expect(numberOf('<b>48213</b>')).toBe('<b>48213</b>');
		const dayOf = (licenseObtainedDate: unknown) =>
			mapDoctorPracticeLicence({ licenseObtainedDate } as never)?.obtainedDay;
		for (const bad of [
			'2010-02-31',
			'2010-13-01',
			'12/03/2010',
			'2010-03-12x',
			'2010-3-12',
			'',
			'x'.repeat(41),
			20100312,
			{}
		]) {
			expect(dayOf(bad), String(bad)).toBeNull();
		}
		for (const answer of [undefined, null, 'x', 3, ['a']]) {
			expect(mapDoctorPracticeLicence(answer as never), String(answer)).toBeUndefined();
		}
	});

	it('🔴 D-W52-59 · U-65.6: the read asks `GET /doctor/profile/base` with the cookies, never cached, no parameter, no doctor named; it lives under the profile’s root, personal, asked again when the page comes back to the front', async () => {
		const spy = vi.fn<(input: string, init?: RequestInit) => Promise<Response>>(async () =>
			envelope({ licenseNumber: '48213', licenseObtainedDate: '2010-03-12T00:00:00.000Z' })
		);
		vi.stubGlobal('fetch', spy);
		expect(await getMyPracticeLicence()).toEqual({ number: '48213', obtainedDay: '2010-03-12' });
		const [input, init] = spy.mock.calls[0];
		const url = new URL(String(input));
		expect(url.pathname).toMatch(/\/doctor\/profile\/base$/u);
		expect(url.search).toBe('');
		expect(init?.method).toBe('GET');
		expect(init?.credentials).toBe('include');
		expect(init?.cache).toBe('no-store');
		const query = doctorMyPracticeLicenceQuery();
		expect(query.queryKey).toEqual(['doctor-dashboard', 'profile', 'licence']);
		expect(query.meta).toEqual(doctorMyProfileQuery('el').meta);
		expect(query.refetchOnWindowFocus).toBe('always');
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => envelope(['no', 'record']))
		);
		await expect(client.fetchQuery(doctorMyPracticeLicenceQuery())).rejects.toThrow();
	});
});
