import { describe, expect, it } from 'vitest';
import { mapDoctorMyProfile } from '$modules/doctor-dashboard/api/profile';
import {
	sampleEmptyProfileView,
	sampleMyProfileView
} from '$modules/doctor-dashboard/api/profile/profile.sample';
import type { DoctorMyProfileFacts } from '$modules/doctor-dashboard/api/profile';
import {
	buildDoctorProfilePreviewNote,
	buildDoctorProfileRows,
	buildDoctorProfileStatus,
	doctorProfileSections,
	emphasizeDoctorOfficeSettings
} from './index';

type View = NonNullable<Parameters<typeof sampleMyProfileView>[0]>;
type Sections = DoctorMyProfileFacts['sections'];
type Missing = DoctorMyProfileFacts['missing'][number];
type Reason = NonNullable<DoctorMyProfileFacts['visibility']['reason']>;

const factsOf = (patch: View = {}): DoctorMyProfileFacts => {
	const facts = mapDoctorMyProfile(sampleMyProfileView(patch));
	if (!facts) throw new Error('no facts');
	return facts;
};
const withSections = (patch: Partial<Sections>): DoctorMyProfileFacts => {
	const facts = factsOf();
	return { ...facts, sections: { ...facts.sections, ...patch } };
};
/** `Intl` writes the euro after a no-break space: the page shows it as it is, the spec compares plain spaces. */
const plain = (text: string | null) => text?.replace(/\s/gu, ' ') ?? null;
const hasOf = (facts: DoctorMyProfileFacts, id: string, locale: 'el' | 'en' = 'el') =>
	plain(buildDoctorProfileRows(facts, locale).find((row) => row.id === id)?.has ?? null);
const statusOf = (facts: DoctorMyProfileFacts, locale: 'el' | 'en' = 'el') =>
	buildDoctorProfileStatus(facts, buildDoctorProfileRows(facts, locale), locale);

describe('the six sections of «Το προφίλ μου» (D-W52-24)', () => {
	// Rewrites «… no page of its own in step 1» by D-W52-41 (screen 78): «Φωτογραφίες» has its page; the other five none yet.
	// Widened by D-W52-49 (screen 79): «Όνομα και περιγραφή» has its page too; the other four none yet.
	// Widened by D-W52-59 (screen 80): «Ειδικότητα και εξειδικεύσεις» has its page too; the other three none yet.
	// Widened by D-W52-63 (screen 81): «Βιογραφικό» has its page too; the other two none yet.
	// Widened by D-W52-69 / 70 (screen 82): «Γλώσσες και κοινωνικά δίκτυα» has its page too; the last one none yet.
	// Widened by D-W52-81 (screen 83): «Υπηρεσίες και τιμές» has its page too — every row of 77 is a link now.
	it('🔴 D-W52-24 · D-W52-41 · D-W52-49 · D-W52-59 · D-W52-63 · D-W52-69 · D-W52-81: the six rows in the prototype’s order, each with its name and its page — «Φωτογραφίες», «Όνομα και περιγραφή», «Ειδικότητα και εξειδικεύσεις», «Βιογραφικό», «Γλώσσες και κοινωνικά δίκτυα» and «Υπηρεσίες και τιμές» (no row leads to a void)', () => {
		const rows = buildDoctorProfileRows(factsOf(), 'el');
		expect(rows.map((row) => [row.id, row.label])).toEqual([
			['photos', 'Φωτογραφίες'],
			['about', 'Όνομα και περιγραφή'],
			['specialty', 'Ειδικότητα και εξειδικεύσεις'],
			['cv', 'Βιογραφικό'],
			['languages', 'Γλώσσες και κοινωνικά δίκτυα'],
			['services', 'Υπηρεσίες και τιμές']
		]);
		expect(rows.map((row) => row.path)).toEqual([
			'/doctor/profile/photos',
			'/doctor/profile/about',
			'/doctor/profile/specialty',
			'/doctor/profile/cv',
			'/doctor/profile/languages',
			'/doctor/profile/services'
		]);
		expect(doctorProfileSections.map((section) => section.id)).toEqual(rows.map((row) => row.id));
		// U-173 / D-W52-24: the reviews and the articles are rows of the «Μενού», never sections here.
		expect(rows.map((row) => row.label).join(' ')).not.toMatch(/κριτικ|άρθρ/iu);
	});

	// Widened by D-W52-59 (screen 80, `sw.js` `spNow`): the specialty's row counts the doctor's specializations too.
	it('D-W52-24: what each section holds, word for word («pr=full»)', () => {
		const rows = buildDoctorProfileRows(factsOf(), 'el');
		expect(rows.map((row) => plain(row.has))).toEqual([
			'4 φωτογραφίες',
			'Ελένη Παππά',
			'Καρδιολόγος · 2 εξειδικεύσεις',
			'2 σπουδές · 3 θέσεις · 1 συνέδριο',
			'Ελληνικά, Αγγλικά · 2 δίκτυα',
			'4 υπηρεσίες · από 50 €'
		]);
		expect(rows.map((row) => row.missing)).toEqual([null, null, null, null, null, null]);
	});

	it('D-W52-24: the numbers — «1 φωτογραφία», «1 σπουδή», «1 θέση», «1 συνέδριο», «1 δίκτυο», «1 υπηρεσία» — and their plurals', () => {
		const one = withSections({
			photos: { count: 1 },
			cv: { studies: 1, positions: 1, conferences: 1 },
			languages: { names: ['Ελληνικά'], socialCount: 1 },
			services: { count: 1, minPrice: 60, samePrice: true }
		});
		expect(hasOf(one, 'photos')).toBe('1 φωτογραφία');
		expect(hasOf(one, 'cv')).toBe('1 σπουδή · 1 θέση · 1 συνέδριο');
		expect(hasOf(one, 'languages')).toBe('Ελληνικά · 1 δίκτυο');
		expect(hasOf(one, 'services')).toBe('1 υπηρεσία · 60 €');
		const many = withSections({
			photos: { count: 12 },
			cv: { studies: 5, positions: 2, conferences: 7 },
			languages: { names: ['Ελληνικά', 'Αγγλικά', 'Γαλλικά'], socialCount: 4 }
		});
		expect(hasOf(many, 'photos')).toBe('12 φωτογραφίες');
		expect(hasOf(many, 'cv')).toBe('5 σπουδές · 2 θέσεις · 7 συνέδρια');
		expect(hasOf(many, 'languages')).toBe('Ελληνικά, Αγγλικά, Γαλλικά · 4 δίκτυα');
	});

	it('🔴 U-211 · D-W52-69 (screen 82, `sw.js` `slNow`): «Ελληνικά, Αγγλικά · 2 δίκτυα» — the languages in the server’s order, the first three by name and «+N» for the rest (a doctor may speak ten); the names are the server’s, text', () => {
		const languages = (names: string[], socialCount = 2) =>
			hasOf(withSections({ languages: { names, socialCount } }), 'languages');
		expect(languages(['Ελληνικά', 'Αγγλικά'])).toBe('Ελληνικά, Αγγλικά · 2 δίκτυα');
		expect(languages(['Ελληνικά', 'Αγγλικά', 'Γαλλικά', 'Γερμανικά'])).toBe(
			'Ελληνικά, Αγγλικά, Γαλλικά +1 · 2 δίκτυα'
		);
		const ten = ['Ελληνικά', 'Αγγλικά', 'Αλβανικά', 'Αραβικά', 'Βουλγαρικά'].concat([
			'Γαλλικά',
			'Γερμανικά',
			'Ιταλικά',
			'Ισπανικά',
			'Ρωσικά'
		]);
		expect(languages(ten, 0)).toBe('Ελληνικά, Αγγλικά, Αλβανικά +7');
		expect(languages(['<b>Ελληνικά</b>'], 1)).toBe('<b>Ελληνικά</b> · 1 δίκτυο');
		expect(
			plain(
				buildDoctorProfileRows(
					withSections({ languages: { names: ['Greek', 'English'], socialCount: 2 } }),
					'en'
				).find((row) => row.id === 'languages')?.has ?? null
			)
		).toBe('Greek, English · 2 networks');
	});

	it('🔴 D-W52-24: only what is not zero — a part that holds nothing is left out, a section that holds nothing says nothing', () => {
		expect(hasOf(withSections({ cv: { studies: 0, positions: 3, conferences: 0 } }), 'cv')).toBe(
			'3 θέσεις'
		);
		expect(hasOf(withSections({ cv: { studies: 2, positions: 0, conferences: 4 } }), 'cv')).toBe(
			'2 σπουδές · 4 συνέδρια'
		);
		expect(hasOf(withSections({ languages: { names: [], socialCount: 2 } }), 'languages')).toBe(
			'2 δίκτυα'
		);
		expect(
			hasOf(withSections({ languages: { names: ['Ελληνικά'], socialCount: 0 } }), 'languages')
		).toBe('Ελληνικά');
		const empty = withSections({
			photos: { count: 0 },
			specialty: { name: null, specializationsCount: 0, hasCatalogue: false },
			cv: { studies: 0, positions: 0, conferences: 0 },
			languages: { names: [], socialCount: 0 },
			services: { count: 0, minPrice: null, samePrice: false }
		});
		for (const id of ['photos', 'specialty', 'cv', 'languages', 'services']) {
			expect(hasOf(empty, id), id).toBeNull();
		}
		expect(buildDoctorProfileRows(empty, 'el').map((row) => row.has)).not.toContain('');
	});

	it('🔴 D-W52-24: «από» only when the prices differ — the same price, or one service, is the amount alone; no price, no amount', () => {
		const services = (count: number, minPrice: number | null, samePrice: boolean) =>
			hasOf(withSections({ services: { count, minPrice, samePrice } }), 'services');
		expect(services(4, 50, false)).toBe('4 υπηρεσίες · από 50 €');
		expect(services(2, 60, true)).toBe('2 υπηρεσίες · 60 €');
		expect(services(1, 60, true)).toBe('1 υπηρεσία · 60 €');
		// One service cannot differ from itself, whatever the answer says.
		expect(services(1, 60, false)).toBe('1 υπηρεσία · 60 €');
		expect(services(3, null, false)).toBe('3 υπηρεσίες');
		expect(services(3, 0, true)).toBe('3 υπηρεσίες · 0 €');
		// The site's own euros: cents only when the amount has them.
		expect(services(2, 47.5, false)).toBe('2 υπηρεσίες · από 47,50 €');
		expect(plain(buildDoctorProfileRows(factsOf(), 'en')[5].has)).toBe('4 services · from €50');
	});

	it('🔴 D-W52-24 (U-207, screen 79): a name without a description says so in the same muted line — never as something missing', () => {
		const facts = withSections({
			about: { fullName: 'Ελένη Παππά', hasDescription: false, nameLocked: true }
		});
		const about = buildDoctorProfileRows(facts, 'el').find((row) => row.id === 'about');
		expect(about?.has).toBe('Ελένη Παππά · χωρίς περιγραφή ακόμη');
		expect(about?.missing).toBeNull();
		expect(hasOf(factsOf(), 'about')).toBe('Ελένη Παππά');
	});

	// Widened by D-W52-57 / 59 (screen 80): the specializations of a specialty with a list are asked for too (the case
	// below); the specialty ITSELF is still never asked for — this doctor's has no list.
	it('🔴 D-W52-24 (U-205, U-213.4): what is missing — a photo, studies or experience (one line for either), the languages; never the description, the specialty itself or the services', () => {
		const rows = buildDoctorProfileRows(
			mapDoctorMyProfile(sampleEmptyProfileView()) as DoctorMyProfileFacts,
			'el'
		);
		expect(rows.map((row) => [row.id, row.missing])).toEqual([
			['photos', 'Προσθέστε μια φωτογραφία σας'],
			['about', null],
			['specialty', null],
			['cv', 'Προσθέστε σπουδές και εμπειρία'],
			['languages', 'Προσθέστε τις γλώσσες που μιλάτε'],
			['services', null]
		]);
		expect(plain(rows[5].has)).toBe('1 υπηρεσία · 60 €');
		for (const code of ['ADD_STUDIES', 'ADD_WORK_EXPERIENCE'] as const) {
			const cv = buildDoctorProfileRows(factsOf({ missing: [code] }), 'el')[3];
			expect(cv.missing, code).toBe('Προσθέστε σπουδές και εμπειρία');
		}
	});
});

describe('the specialty’s row of «Το προφίλ μου» (D-W52-59, screen 80)', () => {
	const specialty = (
		patch: Partial<Sections['specialty']>,
		missing: Missing[] = [],
		locale: 'el' | 'en' = 'el'
	) => {
		const facts = factsOf({
			sections: {
				...sampleMyProfileView().sections,
				specialty: { ...sampleMyProfileView().sections.specialty, ...patch }
			},
			missing
		});
		const row = buildDoctorProfileRows(facts, locale).find((entry) => entry.id === 'specialty');
		return [plain(row?.has ?? null), row?.missing ?? null];
	};

	it('🔴 U-209 · D-W52-59: «Καρδιολόγος · 2 εξειδικεύσεις» / «· μία εξειδίκευση» — word for word, in both languages', () => {
		expect(specialty({ specializationsCount: 2 })).toEqual(['Καρδιολόγος · 2 εξειδικεύσεις', null]);
		expect(specialty({ specializationsCount: 3 })).toEqual(['Καρδιολόγος · 3 εξειδικεύσεις', null]);
		expect(specialty({ specializationsCount: 1 })).toEqual(['Καρδιολόγος · μία εξειδίκευση', null]);
		expect(specialty({ specializationsCount: 1 }, [], 'en')[0]).toBe(
			'Καρδιολόγος · one specialization'
		);
		expect(specialty({ specializationsCount: 2 }, [], 'en')[0]).toBe(
			'Καρδιολόγος · 2 specializations'
		);
	});

	it('🔴 U-209 · D-W52-57 / 59: none picked from a list ⇒ the specialty alone and «Διαλέξτε τις εξειδικεύσεις σας» in the strong line — and the section counts among those that want something', () => {
		expect(specialty({ specializationsCount: 0 }, ['ADD_SPECIALIZATIONS'])).toEqual([
			'Καρδιολόγος',
			'Διαλέξτε τις εξειδικεύσεις σας'
		]);
		expect(specialty({ specializationsCount: 0 }, ['ADD_SPECIALIZATIONS'], 'en')[1]).toBe(
			'Pick your specializations'
		);
		const facts = factsOf({
			sections: {
				...sampleMyProfileView().sections,
				specialty: { name: 'Καρδιολόγος', specializationsCount: 0, hasCatalogue: true }
			},
			missing: ['ADD_SPECIALIZATIONS', 'ADD_SPEAK_LANGUAGES']
		});
		expect(statusOf(facts).lines[1]).toBe('2 ενότητες θέλουν κάτι ακόμη.');
	});

	it('🔴 D-W52-59 (negative): a specialty WITHOUT a list writes the specialty alone — no count, and never «Διαλέξτε…», whatever the answer says beside it', () => {
		expect(specialty({ hasCatalogue: false, specializationsCount: 0 })).toEqual([
			'Καρδιολόγος',
			null
		]);
		// A count or a helper the server would never send for it changes nothing.
		expect(
			specialty({ hasCatalogue: false, specializationsCount: 2 }, ['ADD_SPECIALIZATIONS'])
		).toEqual(['Καρδιολόγος', null]);
		// With a list, a helper the server does not send is never made up from a count of zero.
		expect(specialty({ hasCatalogue: true, specializationsCount: 0 })).toEqual([
			'Καρδιολόγος',
			null
		]);
	});
});

describe('«Ρυθμίσεις ιατρείου» in the footnotes (D-W52-27, D-W52-42)', () => {
	it('🔴 D-W52-27 · D-W52-42: the name of the page in bold, the sentence’s own words unchanged around it — in both languages; a sentence without the name stays whole', () => {
		expect(
			emphasizeDoctorOfficeSettings(
				'Ιατρεία, ώρες και ασφαλιστικοί φορείς: στις Ρυθμίσεις ιατρείου.',
				'el'
			)
		).toEqual([
			{ text: 'Ιατρεία, ώρες και ασφαλιστικοί φορείς: στις ', strong: false },
			{ text: 'Ρυθμίσεις ιατρείου', strong: true },
			{ text: '.', strong: false }
		]);
		expect(
			emphasizeDoctorOfficeSettings(
				'The photos of the practice go to each practice, in Practice settings.',
				'en'
			).map((run) => [run.text, run.strong])
		).toEqual([
			['The photos of the practice go to each practice, in ', false],
			['Practice settings', true],
			['.', false]
		]);
		expect(emphasizeDoctorOfficeSettings('Καμία αναφορά.', 'el')).toEqual([
			{ text: 'Καμία αναφορά.', strong: false }
		]);
		expect(emphasizeDoctorOfficeSettings('Ρυθμίσεις ιατρείου', 'el')).toEqual([
			{ text: 'Ρυθμίσεις ιατρείου', strong: true }
		]);
	});
});

describe('the status of «Το προφίλ μου» (D-W52-25)', () => {
	it('🔴 D-W52-25: the search shows the doctor ⇒ green, «Φαίνεστε στην αναζήτηση», what it means and the counter', () => {
		expect(statusOf(factsOf({ missing: ['ADD_SPEAK_LANGUAGES'] }))).toEqual({
			tone: 'done',
			icon: 'checkmark-circle-outline',
			title: 'Φαίνεστε στην αναζήτηση',
			lines: ['Οι ασθενείς βρίσκουν το προφίλ σας.', 'Μία ενότητα θέλει κάτι ακόμη.']
		});
		expect(statusOf(factsOf()).lines[1]).toBe('Το προφίλ σας είναι πλήρες.');
		expect(
			statusOf(factsOf({ missing: ['ADD_PROFILE_IMAGE', 'ADD_SPEAK_LANGUAGES'] })).lines[1]
		).toBe('2 ενότητες θέλουν κάτι ακόμη.');
		// The counter counts SECTIONS: studies and experience are one of them.
		expect(statusOf(factsOf({ missing: ['ADD_STUDIES', 'ADD_WORK_EXPERIENCE'] })).lines[1]).toBe(
			'Μία ενότητα θέλει κάτι ακόμη.'
		);
	});

	it('🔴 D-W52-25: `NOT_VERIFIED` ⇒ orange, «Δεν φαίνεστε ακόμη στην αναζήτηση», the team’s check and the counter', () => {
		expect(statusOf(mapDoctorMyProfile(sampleEmptyProfileView()) as DoctorMyProfileFacts)).toEqual({
			tone: 'warm',
			icon: 'alert-circle-outline',
			title: 'Δεν φαίνεστε ακόμη στην αναζήτηση',
			lines: [
				'Η ομάδα του eDoctor ελέγχει τα στοιχεία σας. Στο μεταξύ, συμπληρώστε το προφίλ σας.',
				'3 ενότητες θέλουν κάτι ακόμη.'
			]
		});
	});

	it('🔴 D-W52-25: `LICENCE_EXPIRED` ⇒ «Δεν φαίνεστε στην αναζήτηση» and the day the licence ended on the platform’s calendar — no counter; a day that cannot be read leaves the title alone', () => {
		const expired = (licenceEndedAt: string | null, missing: View['missing'] = []) =>
			statusOf(
				factsOf({
					visibility: { visible: false, reason: 'LICENCE_EXPIRED', licenceEndedAt },
					missing
				})
			);
		// 21:59 UTC on the 15th is 23:59 in Athens — the 15th, not the 16th.
		expect(expired('2026-11-15T21:59:59.999Z', ['ADD_PROFILE_IMAGE'])).toEqual({
			tone: 'warm',
			icon: 'alert-circle-outline',
			title: 'Δεν φαίνεστε στην αναζήτηση',
			lines: [
				'Η άδειά σας έληξε στις 15 Νοεμβρίου 2026. Το προφίλ σας αλλάζει κανονικά και θα φανεί ξανά με την ανανέωση.'
			]
		});
		// 22:30 UTC is already the next day in Athens.
		expect(expired('2026-10-30T22:30:00.000Z').lines[0]).toContain('31 Οκτωβρίου 2026');
		expect(expired(null)).toMatchObject({ title: 'Δεν φαίνεστε στην αναζήτηση', lines: [] });
		expect(
			statusOf(
				factsOf({
					visibility: {
						visible: false,
						reason: 'LICENCE_EXPIRED',
						licenceEndedAt: '2026-11-15T21:59:59.999Z'
					}
				}),
				'en'
			).lines[0]
		).toContain('November 15, 2026');
	});

	// Rewrites «D-W52-25 (negative): … the title alone» by D-W52-25α (round 2 of screen 77, the application's rule): still
	// no reason, and now the counter while a section asks for something — never «Το προφίλ σας είναι πλήρες.».
	it('🔴 D-W52-25 · D-W52-25α: `NO_MARKETPLACE_LICENCE` and `INCOMPLETE` ⇒ the title and no reason (none was designed, none is made up) — the counter ONLY while a section asks for something', () => {
		const hidden = (reason: 'NO_MARKETPLACE_LICENCE' | 'INCOMPLETE', missing: Missing[]) =>
			statusOf(factsOf({ visibility: { visible: false, reason, licenceEndedAt: null }, missing }));
		for (const reason of ['NO_MARKETPLACE_LICENCE', 'INCOMPLETE'] as const) {
			expect(hidden(reason, ['ADD_PROFILE_IMAGE']), reason).toEqual({
				tone: 'warm',
				icon: 'alert-circle-outline',
				title: 'Δεν φαίνεστε ακόμη στην αναζήτηση',
				lines: ['Μία ενότητα θέλει κάτι ακόμη.']
			});
			expect(
				hidden(reason, ['ADD_PROFILE_IMAGE', 'ADD_STUDIES', 'ADD_SPEAK_LANGUAGES']).lines,
				reason
			).toEqual(['3 ενότητες θέλουν κάτι ακόμη.']);
		}
		// A broken answer (not shown, no reason) says no more than that either.
		expect(
			statusOf(factsOf({ visibility: { visible: false, reason: null, licenceEndedAt: null } }))
				.lines
		).toEqual([]);
	});

	it('🔴 D-W52-25α (negative): «Το προφίλ σας είναι πλήρες.» is NEVER written under «Δεν φαίνεστε» for a doctor the search hides for what no row names — nothing missing ⇒ the title alone', () => {
		for (const reason of ['NO_MARKETPLACE_LICENCE', 'INCOMPLETE'] as const) {
			for (const locale of ['el', 'en'] as const) {
				const status = statusOf(
					factsOf({ visibility: { visible: false, reason, licenceEndedAt: null }, missing: [] }),
					locale
				);
				expect(status.lines, `${reason} ${locale}`).toEqual([]);
			}
		}
		// The two states that keep it, as before: the doctor the search shows, and the one the team is checking.
		expect(statusOf(factsOf({ missing: [] })).lines).toContain('Το προφίλ σας είναι πλήρες.');
		expect(
			statusOf(
				factsOf({
					visibility: { visible: false, reason: 'NOT_VERIFIED', licenceEndedAt: null },
					missing: []
				})
			).lines
		).toContain('Το προφίλ σας είναι πλήρες.');
	});

	// Widened by D-W52-26α (round 2): the prototype's third line, for a licence that ended (`sw.js` `prevPage`).
	it('🔴 D-W52-26 · D-W52-26α: the band’s line by whether the search shows the doctor — its own words for a licence that ended — and nothing while that is not known', () => {
		const note = (visible: boolean, reason: Reason | null, locale: 'el' | 'en' = 'el') =>
			buildDoctorProfilePreviewNote({ visible, reason }, locale);
		expect(note(true, null)).toBe('Η σελίδα σας, όπως την ανοίγει ένας ασθενής.');
		for (const reason of ['NOT_VERIFIED', 'NO_MARKETPLACE_LICENCE', 'INCOMPLETE', null] as const) {
			expect(note(false, reason), String(reason)).toBe(
				'Ακόμη δεν φαίνεστε στην αναζήτηση: αυτή τη σελίδα τη βλέπετε μόνο εσείς.'
			);
		}
		expect(note(false, 'LICENCE_EXPIRED')).toBe(
			'Δεν φαίνεστε στην αναζήτηση όσο η άδειά σας έληξε: αυτή τη σελίδα τη βλέπετε μόνο εσείς.'
		);
		expect(note(false, 'LICENCE_EXPIRED', 'en')).toBe(
			'You do not appear in search while your licence has expired: only you can see this page.'
		);
		expect(buildDoctorProfilePreviewNote(null, 'el')).toBeNull();
	});
});
