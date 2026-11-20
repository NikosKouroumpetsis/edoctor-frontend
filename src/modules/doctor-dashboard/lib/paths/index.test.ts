import { describe, expect, it } from 'vitest';
import {
	doctorArticlePath,
	doctorArticlesPath,
	doctorNewArticlePath,
	isDoctorArticlePage,
	readDoctorArticlesAddress,
	doctorAppointmentPath,
	doctorAppointmentsSearch,
	doctorAppointmentStepPath,
	doctorFramePaths,
	doctorNewAppointmentPath,
	doctorNewAppointmentSearch,
	doctorPatientPath,
	doctorPatientStepPath,
	doctorProfileAboutPath,
	doctorProfilePath,
	doctorProfilePhotoCropPath,
	doctorProfilePhotosPath,
	doctorProfilePreviewPath,
	doctorProfileCvItemPath,
	doctorProfileCvPath,
	doctorProfileLanguagesPath,
	doctorProfileNetworksPath,
	doctorProfileNewServiceItemPath,
	doctorProfileNewServicePath,
	doctorProfileServicePath,
	doctorProfileServicesPath,
	doctorProfileSpecializationsPath,
	doctorProfileSpecialtyPath,
	doctorProfileSpokenLanguagesPath,
	isDoctorAppointmentStepPage,
	isDoctorLanguagesStepPage,
	isDoctorMenuTab,
	isDoctorMessagesPushedPage,
	isDoctorMessagesTab,
	isDoctorPatientStepPage,
	isDoctorPhotoCropPage,
	isDoctorProfilePreviewPage,
	isDoctorReasonStep,
	isDoctorCredentialPage,
	isDoctorServicePage,
	isDoctorSpecializationsPickPage,
	isDoctorTodayTab,
	readDoctorAppointmentsAddress,
	readDoctorPatientsAddress,
	readDoctorProfileAddress,
	doctorReviewsPath,
	doctorReviewsSearch,
	doctorReviewStepPath,
	isDoctorReviewStepPage,
	readDoctorReviewsAddress
} from '.';

const OFFICE = '0193d000-0000-7000-8000-0000000000f2';
const read = (rest: string | undefined, search = '') =>
	readDoctorAppointmentsAddress(rest, new URLSearchParams(search));

describe('🔴 D-W51-31 · the doctor’s «Ραντεβού» in the address (screen 67)', () => {
	it('the list: «Επερχόμενα» by default, the three pills by their word, the office by its id', () => {
		expect(read(undefined)).toEqual({ view: 'list', tab: 'upcoming', officeId: null });
		expect(read('', 'tab=requests')).toEqual({ view: 'list', tab: 'requests', officeId: null });
		expect(read('', `tab=history&office=${OFFICE}`)).toEqual({
			view: 'list',
			tab: 'history',
			officeId: OFFICE
		});
	});

	// Rewrites «any rest is no page (68 comes with step 4)» of step 3: D-W51-36 opens `/<id>` with screen 68 (card w51-w4);
	// then «`<id>/reject` is no page» of step 4: D-W51-46 opens `/<id>/reject|cancel` with screen 69 (card w51-w5).
	it('U-65.6 (negative): another word is «Επερχόμενα», an office that is no id is every office; a rest that is no server id is no page', () => {
		expect(read('', 'tab=HISTORY&office=<b>')).toEqual({
			view: 'list',
			tab: 'upcoming',
			officeId: null
		});
		for (const rest of ['requests', '/', `${OFFICE}/`, `${OFFICE}x`, '<script>', '../menu']) {
			expect(read(rest), rest).toBeUndefined();
		}
	});

	// The address of `/<id>` carries `step: null` since D-W51-46 (card w51-w5): the appointment itself, no step screen.
	it('🔴 D-W51-36: `/<id>` (a server id, one level) is the appointment, with the list’s pill and office kept', () => {
		expect(read(OFFICE)).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: null,
			tab: 'upcoming',
			officeId: null
		});
		expect(read(OFFICE, `tab=history&office=${OFFICE}`)).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: null,
			tab: 'history',
			officeId: OFFICE
		});
		expect(doctorAppointmentPath(OFFICE)).toBe(`/doctor/appointments/${OFFICE}`);
	});

	it('🔴 D-W51-46: `/<id>/reject` and `/<id>/cancel` are screen 69 over the appointment, with the pill and office kept', () => {
		expect(read(`${OFFICE}/reject`, 'tab=requests')).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: 'reject',
			tab: 'requests',
			officeId: null
		});
		expect(read(`${OFFICE}/cancel`, `office=${OFFICE}`)).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: 'cancel',
			tab: 'upcoming',
			officeId: OFFICE
		});
		expect(doctorAppointmentStepPath(OFFICE, 'reject')).toBe(
			`/doctor/appointments/${OFFICE}/reject`
		);
		expect(doctorAppointmentStepPath(OFFICE, 'cancel')).toBe(
			`/doctor/appointments/${OFFICE}/cancel`
		);
	});

	it('🔴 D-W51-51 · D-W51-52: `/<id>/time` and `/<id>/services` are screen 70 over the appointment, with the pill and office kept', () => {
		expect(read(`${OFFICE}/time`, 'tab=requests')).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: 'time',
			tab: 'requests',
			officeId: null
		});
		expect(read(`${OFFICE}/services`, `tab=history&office=${OFFICE}`)).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: 'services',
			tab: 'history',
			officeId: OFFICE
		});
		expect(doctorAppointmentStepPath(OFFICE, 'time')).toBe(`/doctor/appointments/${OFFICE}/time`);
		expect(doctorAppointmentStepPath(OFFICE, 'services')).toBe(
			`/doctor/appointments/${OFFICE}/services`
		);
		// Screen 69 keeps its two steps; screens 70 and 71 have their own slices.
		expect(
			['reject', 'cancel', 'time', 'services', 'correction'].map((step) =>
				isDoctorReasonStep(step as never)
			)
		).toEqual([true, true, false, false, false]);
	});

	it('🔴 D-W51-62 · U-102: διόρθωση = οθόνη — `/<id>/correction` is screen 71 over the appointment, with the pill and office kept', () => {
		expect(read(`${OFFICE}/correction`, `tab=history&office=${OFFICE}`)).toEqual({
			view: 'appointment',
			appointmentId: OFFICE,
			step: 'correction',
			tab: 'history',
			officeId: OFFICE
		});
		expect(doctorAppointmentStepPath(OFFICE, 'correction')).toBe(
			`/doctor/appointments/${OFFICE}/correction`
		);
	});

	// Rewrites «D-W51-46 / U-65.6 (negative): depth 2 with ONLY those two words»: D-W51-51 (step 6) adds `time` and
	// `services` to the closed list, card w51-w6 §2; any other word stays a 404.
	// Rewrites «… ONLY the four words `reject | cancel | time | services`»: D-W51-62 (step 7) adds `correction`, card w51-w7
	// §2; any other word stays a 404.
	it('🔴 D-W51-46 · D-W51-51 · D-W51-62 / U-65.6 (negative): depth 2 with ONLY the five words `reject | cancel | time | services | correction` — another word, a capital, deeper, an id that is not the server’s is no page', () => {
		for (const rest of [
			`${OFFICE}/Correction`,
			`${OFFICE}/correct`,
			`${OFFICE}/fix`,
			`${OFFICE}/outcome`,
			`${OFFICE}/correction/`,
			`${OFFICE}/correction/x`,
			`${OFFICE}/Reject`,
			`${OFFICE}/move`,
			`${OFFICE}/Time`,
			`${OFFICE}/service`,
			`${OFFICE}/charges`,
			`${OFFICE}/time/`,
			`${OFFICE}/services/x`,
			`${OFFICE}/reject/`,
			`${OFFICE}/reject/x`,
			`${OFFICE}/cancel/reject`,
			`${OFFICE}x/reject`,
			'reject',
			'/reject',
			'<script>/reject',
			`${OFFICE}/%3Cscript%3E`
		]) {
			expect(read(rest), rest).toBeUndefined();
		}
	});

	it('🔴 D-W51-69: `new` is screen 72 — from «Ραντεβού» (its pill and office), `?from=today` from «Σήμερα», `?kind=&id=` a patient chosen', () => {
		expect(read('new')).toEqual({
			view: 'new',
			patient: null,
			from: 'list',
			tab: 'upcoming',
			officeId: null
		});
		expect(read('new', `tab=history&office=${OFFICE}&kind=relative&id=${OFFICE}`)).toEqual({
			view: 'new',
			patient: { kind: 'relative', id: OFFICE },
			from: 'list',
			tab: 'history',
			officeId: OFFICE
		});
		expect(read('new', 'from=today')).toMatchObject({ view: 'new', from: 'today' });
		// (negative, U-65.6) a patient of another word or no server id is none; another origin is the list; deeper is no page.
		for (const search of [
			`kind=Record&id=${OFFICE}`,
			'kind=record&id=x',
			`kind=doctor&id=${OFFICE}`
		]) {
			expect(read('new', search), search).toMatchObject({ patient: null });
		}
		expect(read('new', 'from=TODAY')).toMatchObject({ from: 'list' });
		for (const rest of ['new/x', 'New', 'new/', `new/${OFFICE}`])
			expect(read(rest), rest).toBeUndefined();
	});

	it('D-W51-69: the search after `/doctor/appointments/new` — `?from=today` alone from «Σήμερα», the list’s pill and office from «Ραντεβού», the patient last', () => {
		expect(doctorNewAppointmentPath).toBe('/doctor/appointments/new');
		expect(doctorNewAppointmentSearch({ from: 'today', tab: 'history', officeId: OFFICE })).toBe(
			'?from=today'
		);
		expect(doctorNewAppointmentSearch({ from: 'list', tab: 'upcoming', officeId: null })).toBe('');
		expect(doctorNewAppointmentSearch({ from: 'list', tab: 'requests', officeId: OFFICE })).toBe(
			`?tab=requests&office=${OFFICE}`
		);
		expect(
			doctorNewAppointmentSearch({ from: 'today', patient: { kind: 'record', id: OFFICE } })
		).toBe(`?from=today&kind=record&id=${OFFICE}`);
	});

	// Rewrites «only screen 69 is pushed over the tabs»: D-W51-51 / 52 push screen 70 the same way (`m-move.png`).
	// Rewrites «only screens 69 and 70 …»: D-W51-62 (step 7) pushes screen 71 the same way (`m-fix.png`), card w51-w7 §2.
	// Rewrites «only screens 69, 70 and 71 …»: D-W51-69 (step 8) pushes screen 72 the same way (`m-search.png`), card w51-w8.
	it('🔴 D-W51-46 · D-W51-51 · D-W51-62 · D-W51-69 · U-81.2: only screens 69, 70, 71 and 72 are pushed over the tabs — never the list, the 68 or a look-alike', () => {
		expect(isDoctorAppointmentStepPage('/doctor/appointments/new')).toBe(true);
		expect(isDoctorAppointmentStepPage(`/doctor/appointments/${OFFICE}/correction`)).toBe(true);
		expect(isDoctorAppointmentStepPage(`/doctor/appointments/${OFFICE}/reject`)).toBe(true);
		expect(isDoctorAppointmentStepPage(`/doctor/appointments/${OFFICE}/cancel`)).toBe(true);
		expect(isDoctorAppointmentStepPage(`/doctor/appointments/${OFFICE}/time`)).toBe(true);
		expect(isDoctorAppointmentStepPage(`/doctor/appointments/${OFFICE}/services`)).toBe(true);
		for (const path of [
			'/doctor/appointments',
			`/doctor/appointments/${OFFICE}`,
			`/doctor/appointments/${OFFICE}/move`,
			`/doctor/appointments/${OFFICE}/outcome`,
			`/doctor/appointments/${OFFICE}/correction/x`,
			`/doctor/appointments/${OFFICE}/reject/x`,
			'/doctor/appointments/new/x',
			'/doctor/appointments/New',
			'/doctor/appointments/x/reject',
			`/appointments/${OFFICE}/cancel`,
			'/doctor'
		]) {
			expect(isDoctorAppointmentStepPage(path), path).toBe(false);
		}
	});

	it('the search after the path: the default pill and every office leave it bare', () => {
		expect(doctorAppointmentsSearch('upcoming', null)).toBe('');
		expect(doctorAppointmentsSearch('requests', null)).toBe('?tab=requests');
		expect(doctorAppointmentsSearch('history', OFFICE)).toBe(`?tab=history&office=${OFFICE}`);
		expect(doctorAppointmentsSearch('upcoming', OFFICE)).toBe(`?office=${OFFICE}`);
	});

	it('🔴 D-W51-31: «Σήμερα» is the current tab on `/doctor` and on `/doctor/appointments…` — never on a look-alike word', () => {
		for (const path of [
			'/doctor',
			'/doctor/appointments',
			`/doctor/appointments/${OFFICE}`,
			`/doctor/appointments/${OFFICE}/reject`
		]) {
			expect(isDoctorTodayTab(path), path).toBe(true);
		}
		for (const path of [
			'/doctor/menu',
			'/doctor/appointmentsx',
			'/doctor/appointment',
			'/appointments',
			'/doctor/onboarding'
		]) {
			expect(isDoctorTodayTab(path), path).toBe(false);
		}
	});
});

describe('🔴 D-W51-73 · screen 73 «Οι ασθενείς μου» in the address', () => {
	const ID = '0193d000-0000-7000-8000-0000000000b3';

	it('`/doctor/patients` is the list; `<kind>/<id>` one card (account · relative · record); a record’s `/edit` and `/merge`', () => {
		expect(readDoctorPatientsAddress(undefined)).toEqual({ view: 'list' });
		expect(readDoctorPatientsAddress('')).toEqual({ view: 'list' });
		for (const kind of ['account', 'relative', 'record'] as const) {
			expect(readDoctorPatientsAddress(`${kind}/${ID}`), kind).toEqual({
				view: 'card',
				key: { kind, id: ID },
				step: null
			});
		}
		expect(readDoctorPatientsAddress(`record/${ID}/edit`)).toEqual({
			view: 'card',
			key: { kind: 'record', id: ID },
			step: 'edit'
		});
		expect(readDoctorPatientsAddress(`record/${ID}/merge`)).toMatchObject({ step: 'merge' });
		expect(doctorPatientPath({ kind: 'relative', id: ID })).toBe(`/doctor/patients/relative/${ID}`);
		expect(doctorPatientStepPath({ kind: 'record', id: ID }, 'edit')).toBe(
			`/doctor/patients/record/${ID}/edit`
		);
	});

	it('D-W51-73 / U-65.6 (negative): another kind, a capital, an id that is not the server’s, deeper, or a step of an account or a relative is no page (a 404)', () => {
		for (const rest of [
			`doctor/${ID}`,
			`Account/${ID}`,
			`patient/${ID}`,
			'account/x',
			'account/<script>',
			`account/${ID}x`,
			'account',
			`account/${ID}/`,
			`account/${ID}/edit`,
			`relative/${ID}/merge`,
			`record/${ID}/delete`,
			`record/${ID}/Edit`,
			`record/${ID}/edit/x`,
			`record/../${ID}`
		]) {
			expect(readDoctorPatientsAddress(rest), rest).toBeUndefined();
		}
	});

	it('🔴 D-W51-73 · U-81.2: «Μενού» is the current tab on `/doctor/menu` and on `/doctor/patients…`; only a record’s two screens are pushed over the tabs', () => {
		for (const path of ['/doctor/menu', '/doctor/patients', `/doctor/patients/account/${ID}`]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
		}
		for (const path of ['/doctor', '/doctor/patientsx', '/doctor/patient', '/patients']) {
			expect(isDoctorMenuTab(path), path).toBe(false);
		}
		expect(isDoctorPatientStepPage(`/doctor/patients/record/${ID}/edit`)).toBe(true);
		expect(isDoctorPatientStepPage(`/doctor/patients/record/${ID}/merge`)).toBe(true);
		for (const path of [
			'/doctor/patients',
			`/doctor/patients/record/${ID}`,
			`/doctor/patients/account/${ID}/edit`,
			`/doctor/patients/record/x/edit`,
			`/patients/record/${ID}/edit`
		]) {
			expect(isDoctorPatientStepPage(path), path).toBe(false);
		}
	});

	it('🔴 D-W52-22 · D-W52-26 · U-81.2: «Μενού» is the current tab on «Το προφίλ μου» and its preview — the two addresses, never a look-alike; only the preview is pushed over the tabs', () => {
		expect(doctorProfilePath).toBe('/doctor/profile');
		expect(doctorProfilePreviewPath).toBe('/doctor/profile/preview');
		for (const path of ['/doctor/profile', '/doctor/profile/preview']) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
			expect(isDoctorMessagesTab(path), path).toBe(false);
		}
		for (const path of [
			'/doctor/profiles',
			'/doctor/profilex',
			'/doctor/profile/previews',
			'/doctor/profile/preview/x',
			// Widened by D-W52-41 (screen 78): `/doctor/profile/photos` is a page now (the next case); a section whose
			// screen is not built yet, and every look-alike of the photos' address, stay no page.
			// Widened by D-W52-49 (screen 79): `/doctor/profile/about` is a page now (its own case below); its look-alikes not.
			// Widened by D-W52-81 (screen 83): `/doctor/profile/services` is a page now (its own case below); its look-alikes not.
			'/doctor/profile/abouts',
			'/doctor/profile/about/x',
			'/doctor/profile/servicesx',
			'/doctor/profile/services/x',
			'/doctor/profile/photosx',
			'/doctor/profile/photo',
			'/profile',
			'/profile/preview'
		]) {
			expect(isDoctorMenuTab(path), path).toBe(false);
			expect(isDoctorProfilePreviewPage(path), path).toBe(false);
		}
		expect(isDoctorProfilePreviewPage('/doctor/profile/preview')).toBe(true);
		expect(isDoctorProfilePreviewPage('/doctor/profile')).toBe(false);
	});

	it('🔴 D-W52-41 · D-W52-40 · U-65.6: «Φωτογραφίες» is `/doctor/profile/photos` and one photo’s «Προσαρμογή» `/doctor/profile/photos/<id>/crop` — a closed list inside the tab «Μενού»; only «Προσαρμογή» is pushed over the tabs', () => {
		expect(doctorProfilePhotosPath).toBe('/doctor/profile/photos');
		expect(doctorProfilePhotoCropPath(ID)).toBe(`/doctor/profile/photos/${ID}/crop`);
		expect(readDoctorProfileAddress(undefined)).toEqual({ section: null });
		expect(readDoctorProfileAddress('')).toEqual({ section: null });
		expect(readDoctorProfileAddress('photos')).toEqual({ section: 'photos', cropId: null });
		expect(readDoctorProfileAddress(`photos/${ID}/crop`)).toEqual({
			section: 'photos',
			cropId: ID
		});
		for (const path of ['/doctor/profile/photos', `/doctor/profile/photos/${ID}/crop`]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
			expect(isDoctorMessagesTab(path), path).toBe(false);
			expect(isDoctorProfilePreviewPage(path), path).toBe(false);
		}
		expect(isDoctorPhotoCropPage(`/doctor/profile/photos/${ID}/crop`)).toBe(true);
		for (const path of ['/doctor/profile', '/doctor/profile/photos', '/doctor/profile/preview']) {
			expect(isDoctorPhotoCropPage(path), path).toBe(false);
		}
	});

	it('🔴 D-W52-49 · U-65.6: «Όνομα και περιγραφή» is `/doctor/profile/about` — one address with nothing under it, inside the tab «Μενού», never pushed over the tabs', () => {
		expect(doctorProfileAboutPath).toBe('/doctor/profile/about');
		expect(readDoctorProfileAddress('about')).toEqual({ section: 'about' });
		expect(isDoctorMenuTab('/doctor/profile/about')).toBe(true);
		expect(isDoctorTodayTab('/doctor/profile/about')).toBe(false);
		expect(isDoctorMessagesTab('/doctor/profile/about')).toBe(false);
		// The page keeps the capsule below 744 (`79-about/shots/m-full.png`): it is no pushed page.
		expect(isDoctorProfilePreviewPage('/doctor/profile/about')).toBe(false);
		expect(isDoctorPhotoCropPage('/doctor/profile/about')).toBe(false);
		for (const rest of [
			'about/',
			'about/edit',
			`about/${ID}`,
			'About',
			'abouts',
			'about/../photos'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(false);
		}
	});

	it('🔴 D-W52-59 · U-65.6: «Ειδικότητα και εξειδικεύσεις» is `/doctor/profile/specialty` and the choice `/doctor/profile/specialty/specializations` — a closed list, inside the tab «Μενού»; only the choice is pushed over the tabs (its own bar at the bottom)', () => {
		expect(doctorProfileSpecialtyPath).toBe('/doctor/profile/specialty');
		expect(doctorProfileSpecializationsPath).toBe('/doctor/profile/specialty/specializations');
		expect(readDoctorProfileAddress('specialty')).toEqual({ section: 'specialty', pick: false });
		expect(readDoctorProfileAddress('specialty/specializations')).toEqual({
			section: 'specialty',
			pick: true
		});
		for (const path of [doctorProfileSpecialtyPath, doctorProfileSpecializationsPath]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
			expect(isDoctorMessagesTab(path), path).toBe(false);
			expect(isDoctorProfilePreviewPage(path), path).toBe(false);
			expect(isDoctorPhotoCropPage(path), path).toBe(false);
		}
		// Screen 80 keeps the capsule below 744 (`80-spec/shots/m-full.png`); the choice has none (`m-pick.png`).
		expect(isDoctorSpecializationsPickPage(doctorProfileSpecialtyPath)).toBe(false);
		expect(isDoctorSpecializationsPickPage(doctorProfileSpecializationsPath)).toBe(true);
		for (const path of ['/doctor/profile', '/doctor/profile/photos', '/doctor/profile/about']) {
			expect(isDoctorSpecializationsPickPage(path), path).toBe(false);
		}
		expect(isDoctorSpecializationsPickPage('/profile/specialty/specializations')).toBe(false);
		for (const rest of [
			'specialty/',
			'specialty/edit',
			'specialty/specialization',
			'specialty/specializationsx',
			'specialty/Specializations',
			'specialty/specializations/',
			'specialty/specializations/PR011-01',
			'specialty/specializations/../photos',
			'specialty//specializations',
			'Specialty',
			'specialties',
			'specialty%2Fspecializations',
			'specialty/<script>'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(false);
			expect(isDoctorSpecializationsPickPage(`/doctor/profile/${rest}`), rest).toBe(false);
		}
	});

	it('🔴 U-210 · D-W52-63 · U-65.6: «Βιογραφικό» is `/doctor/profile/cv` and ONE row of it `/doctor/profile/cv/<group>/<id>` or `…/<group>/new` — a closed list, inside the tab «Μενού»; only the page of a row is pushed over the tabs (its own bar at the bottom)', () => {
		expect(doctorProfileCvPath).toBe('/doctor/profile/cv');
		expect(doctorProfileCvItemPath('STUDY', null)).toBe('/doctor/profile/cv/studies/new');
		expect(doctorProfileCvItemPath('WORK', ID)).toBe(`/doctor/profile/cv/experience/${ID}`);
		expect(doctorProfileCvItemPath('CONFERENCE', ID)).toBe(`/doctor/profile/cv/conferences/${ID}`);
		expect(readDoctorProfileAddress('cv')).toEqual({ section: 'cv', item: null });
		expect(readDoctorProfileAddress('cv/studies/new')).toEqual({
			section: 'cv',
			item: { kind: 'STUDY', id: null }
		});
		expect(readDoctorProfileAddress(`cv/experience/${ID}`)).toEqual({
			section: 'cv',
			item: { kind: 'WORK', id: ID }
		});
		expect(readDoctorProfileAddress(`cv/conferences/${ID}`)).toEqual({
			section: 'cv',
			item: { kind: 'CONFERENCE', id: ID }
		});
		const pages = [
			doctorProfileCvPath,
			doctorProfileCvItemPath('STUDY', null),
			doctorProfileCvItemPath('WORK', ID),
			doctorProfileCvItemPath('CONFERENCE', ID)
		];
		for (const path of pages) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
			expect(isDoctorMessagesTab(path), path).toBe(false);
			expect(isDoctorProfilePreviewPage(path), path).toBe(false);
			expect(isDoctorPhotoCropPage(path), path).toBe(false);
			expect(isDoctorSpecializationsPickPage(path), path).toBe(false);
			// Screen 81 keeps the capsule below 744 (`81-cv/shots/m-full.png`); the page of a row has none (`m-edit.png`).
			expect(isDoctorCredentialPage(path), path).toBe(path !== doctorProfileCvPath);
		}
		for (const path of ['/doctor/profile', '/doctor/profile/photos', '/doctor/profile/specialty']) {
			expect(isDoctorCredentialPage(path), path).toBe(false);
		}
		expect(isDoctorCredentialPage(`/profile/cv/experience/${ID}`)).toBe(false);
		for (const rest of [
			'cv/',
			'cv/new',
			'cv/studies',
			'cv/studies/',
			'cv/study/new',
			'cv/STUDY/new',
			'cv/Studies/new',
			'cv/work/new',
			'cv/experience/New',
			'cv/experience/1',
			'cv/experience/new/',
			'cv/experience/new/x',
			`cv/experience/${ID}/`,
			`cv/experience/${ID}/edit`,
			`cv/${ID}`,
			`cv/experiencex/${ID}`,
			`cv/experience/${ID}x`,
			'cv/experience/../photos',
			'cv//new',
			`cv/experience%2F${ID}`,
			'cv/experience/<script>',
			'CV',
			'cvs'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(false);
			expect(isDoctorCredentialPage(`/doctor/profile/${rest}`), rest).toBe(false);
		}
	});

	it('🔴 U-211 · D-W52-69 / 70 · U-65.6: «Γλώσσες και κοινωνικά δίκτυα» is `/doctor/profile/languages`, the choice of the languages `…/languages/spoken` and the four links `…/languages/networks` — a closed list, inside the tab «Μενού»; only the two pages under 82 are pushed over the tabs (their own bar at the bottom)', () => {
		expect(doctorProfileLanguagesPath).toBe('/doctor/profile/languages');
		expect(doctorProfileSpokenLanguagesPath).toBe('/doctor/profile/languages/spoken');
		expect(doctorProfileNetworksPath).toBe('/doctor/profile/languages/networks');
		expect(readDoctorProfileAddress('languages')).toEqual({ section: 'languages', page: null });
		expect(readDoctorProfileAddress('languages/spoken')).toEqual({
			section: 'languages',
			page: 'spoken'
		});
		expect(readDoctorProfileAddress('languages/networks')).toEqual({
			section: 'languages',
			page: 'networks'
		});
		for (const path of [
			doctorProfileLanguagesPath,
			doctorProfileSpokenLanguagesPath,
			doctorProfileNetworksPath
		]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
			expect(isDoctorMessagesTab(path), path).toBe(false);
			expect(isDoctorProfilePreviewPage(path), path).toBe(false);
			expect(isDoctorPhotoCropPage(path), path).toBe(false);
			expect(isDoctorSpecializationsPickPage(path), path).toBe(false);
			expect(isDoctorCredentialPage(path), path).toBe(false);
			// Screen 82 keeps the capsule below 744 (`82-langs/shots/m-full.png`); its two pages have none (`m-pick.png`, `m-soc.png`).
			expect(isDoctorLanguagesStepPage(path), path).toBe(path !== doctorProfileLanguagesPath);
		}
		for (const path of [
			'/doctor/profile',
			'/doctor/profile/photos',
			'/doctor/profile/specialty/specializations',
			'/doctor/profile/cv/studies/new'
		]) {
			expect(isDoctorLanguagesStepPage(path), path).toBe(false);
		}
		expect(isDoctorLanguagesStepPage('/profile/languages/spoken')).toBe(false);
		for (const rest of [
			'languages/',
			'languagesx',
			'Languages',
			'language',
			'language/spoken',
			'languages/Spoken',
			'languages/spokenx',
			'languages/spoken/',
			'languages/spoken/SL001',
			'languages/networks/',
			'languages/networks/facebook',
			'languages/network',
			'languages/social',
			'languages/links',
			'languages/edit',
			'languages/../photos',
			'languages//spoken',
			'languages%2Fspoken',
			'languages/<script>',
			'networks',
			'spoken'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(false);
			expect(isDoctorLanguagesStepPage(`/doctor/profile/${rest}`), rest).toBe(false);
		}
	});

	// Widened by D-W52-49 (screen 79): `about` left the list (it is a page now, the case above); its look-alikes joined.
	// Widened by D-W52-59 (screen 80): `specialty` left the list (a page now, the case below); its look-alikes joined.
	// Widened by D-W52-63 (screen 81): `cv` left the list (a page now, the case above); its look-alikes joined.
	// Widened by D-W52-69 / 70 (screen 82): `languages` left the list (a page now, the case above); its look-alikes joined.
	// Widened by D-W52-81 / 82 (screen 83): `services` left the list (a page now, the case below); its look-alikes joined.
	it('🔴 D-W52-41 · U-65.6 (negative): anything else under «Το προφίλ μου» is no page — another section’s word, a look-alike, an id that is not the server’s, a slash more, a step that is not «Προσαρμογή»', () => {
		for (const rest of [
			'aboutx',
			'about/x',
			'specialtyx',
			'specialty/x',
			'specializations',
			'cvx',
			'cv/x',
			'credentials',
			'languagesx',
			'languages/x',
			'speak-languages',
			'servicesx',
			'services/x',
			'service',
			'preview',
			'photosx',
			'Photos',
			'photos/',
			`photos/${ID}`,
			`photos/${ID}/`,
			`photos/${ID}/crop/`,
			`photos/${ID}/crop/x`,
			`photos/${ID}/cropx`,
			`photos/${ID}/delete`,
			'photos/x/crop',
			'photos/../crop',
			'photos//crop',
			`photos/${ID}%2Fcrop`,
			'photos/<script>/crop'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(rest === 'preview');
			expect(isDoctorPhotoCropPage(`/doctor/profile/${rest}`), rest).toBe(false);
		}
		expect(isDoctorPhotoCropPage(`/profile/photos/${ID}/crop`)).toBe(false);
		expect(isDoctorMenuTab(`/profile/photos`)).toBe(false);
	});

	it('🔴 D-W52-81 / 82 · U-65.6: «Υπηρεσίες και τιμές» is `/doctor/profile/services`, one service `…/services/<id>`, «Νέα υπηρεσία» `…/services/new` and a new one `…/services/new/<id>` — a closed list inside the tab «Μενού»; only the three pages under it are pushed over the tabs', () => {
		expect(doctorProfileServicesPath).toBe('/doctor/profile/services');
		expect(doctorProfileServicePath(ID)).toBe(`/doctor/profile/services/${ID}`);
		expect(doctorProfileNewServicePath).toBe('/doctor/profile/services/new');
		expect(doctorProfileNewServiceItemPath(ID)).toBe(`/doctor/profile/services/new/${ID}`);
		expect(readDoctorProfileAddress('services')).toEqual({ section: 'services', page: null });
		expect(readDoctorProfileAddress(`services/${ID}`)).toEqual({
			section: 'services',
			page: { view: 'service', id: ID }
		});
		expect(readDoctorProfileAddress('services/new')).toEqual({
			section: 'services',
			page: { view: 'catalogue' }
		});
		expect(readDoctorProfileAddress(`services/new/${ID}`)).toEqual({
			section: 'services',
			page: { view: 'new', serviceId: ID }
		});
		for (const path of [
			'/doctor/profile/services',
			`/doctor/profile/services/${ID}`,
			'/doctor/profile/services/new',
			`/doctor/profile/services/new/${ID}`
		]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorServicePage(path), path).toBe(path !== '/doctor/profile/services');
		}
		// U-65.6 (negative): a look-alike, an id that is not the server's, a slash more, a word under a service.
		for (const rest of [
			'services/',
			'Services',
			'services/x',
			'services/new/x',
			`services/new/${ID}/`,
			`services/new/${ID}/x`,
			`services/${ID}/`,
			`services/${ID}/edit`,
			`services/${ID}/delete`,
			'services/../new',
			`services/${ID}%2Fedit`,
			'services/<script>',
			'services/news'
		]) {
			expect(readDoctorProfileAddress(rest), rest).toBeUndefined();
			expect(isDoctorServicePage(`/doctor/profile/${rest}`), rest).toBe(false);
			expect(isDoctorMenuTab(`/doctor/profile/${rest}`), rest).toBe(false);
		}
		expect(isDoctorServicePage(`/profile/services/${ID}`)).toBe(false);
	});

	it('🔴 D-W51-73: «Νέο ραντεβού» of a card is screen 72 alone, `?from=patient` with the patient chosen — never without one', () => {
		expect(
			doctorNewAppointmentSearch({ from: 'patient', patient: { kind: 'account', id: ID } })
		).toBe(`?from=patient&kind=account&id=${ID}`);
		expect(read('new', `from=patient&kind=account&id=${ID}`)).toEqual({
			view: 'new',
			patient: { kind: 'account', id: ID },
			from: 'patient',
			tab: 'upcoming',
			officeId: null
		});
		// (negative) `from=patient` without a patient of the server's is the list's.
		expect(read('new', 'from=patient')).toMatchObject({ from: 'list', patient: null });
		expect(read('new', 'from=patient&kind=account&id=x')).toMatchObject({ from: 'list' });
	});
});

describe('🔴 D-W51-89 · the doctor’s «Ειδοποιήσεις» in the frame (screen 75)', () => {
	it('D-W51-89: «Ειδοποιήσεις» of the ☰ and the bell open the doctor’s own list — the end of the transition D-W51-18 (never the patient’s `/notifications`)', () => {
		expect(doctorFramePaths.notifications).toBe('/doctor/notifications');
		expect(doctorFramePaths.notifications).not.toBe('/notifications');
	});

	it('D-W51-89 · U-81.2: inside the tab «Μενού» (it opens from its bell), never pushed over the tabs; no look-alike word', () => {
		expect(isDoctorMenuTab('/doctor/notifications')).toBe(true);
		expect(isDoctorTodayTab('/doctor/notifications')).toBe(false);
		expect(isDoctorMessagesTab('/doctor/notifications')).toBe(false);
		expect(isDoctorMessagesPushedPage('/doctor/notifications')).toBe(false);
		expect(isDoctorPatientStepPage('/doctor/notifications')).toBe(false);
		expect(isDoctorAppointmentStepPage('/doctor/notifications')).toBe(false);
		for (const path of ['/notifications', '/doctor/notificationsx', '/doctor/notification']) {
			expect(isDoctorMenuTab(path), path).toBe(false);
		}
	});
});

describe('🔴 D-W51-85 · the doctor’s «Μηνύματα» in the frame (screen 74)', () => {
	const ID = '0193d000-0000-7000-8000-0000000000c1';

	it('«Μηνύματα» of the frame opens the doctor’s own messages (the end of the transition D-W51-18)', () => {
		expect(doctorFramePaths.messages).toBe('/doctor/messages');
	});

	it('the current tab on the list and under it; pushed over the tabs below 744 only under it (U-81.2)', () => {
		for (const path of ['/doctor/messages', `/doctor/messages/${ID}`, '/doctor/messages/archive']) {
			expect(isDoctorMessagesTab(path), path).toBe(true);
		}
		expect(isDoctorMessagesPushedPage('/doctor/messages')).toBe(false);
		for (const path of [
			`/doctor/messages/${ID}`,
			'/doctor/messages/archive',
			'/doctor/messages/new'
		]) {
			expect(isDoctorMessagesPushedPage(path), path).toBe(true);
		}
	});

	it('(negative) a look-alike word is neither', () => {
		for (const path of ['/doctor/messagesx', '/messages', '/doctor', '/doctor/menu']) {
			expect(isDoctorMessagesTab(path), path).toBe(false);
			expect(isDoctorMessagesPushedPage(path), path).toBe(false);
		}
	});
});

describe('🔴 D-W52-91 / 92 · screen 84 «Κριτικές» in the address', () => {
	const ID = '0193d000-0000-7000-8000-0000000000c4';
	const reviews = (rest: string | undefined, search = '') =>
		readDoctorReviewsAddress(rest, new URLSearchParams(search));

	it('D-W52-91 / 92: `/doctor/reviews` the list (`?filter=unanswered`, `?review=<id>`), `/<id>/reply` and `/<id>/report` the two pages of one review', () => {
		expect(doctorReviewsPath).toBe('/doctor/reviews');
		expect(doctorReviewStepPath(ID, 'reply')).toBe(`/doctor/reviews/${ID}/reply`);
		expect(doctorReviewStepPath(ID, 'report')).toBe(`/doctor/reviews/${ID}/report`);
		expect(reviews('')).toEqual({ view: 'list', filter: 'all', reviewId: null });
		expect(reviews(undefined, `filter=unanswered&review=${ID}`)).toEqual({
			view: 'list',
			filter: 'unanswered',
			reviewId: ID
		});
		expect(reviews(`${ID}/reply`)).toEqual({ view: 'reply', reviewId: ID });
		expect(reviews(`${ID}/report`)).toEqual({ view: 'report', reviewId: ID });
		expect(doctorReviewsSearch({})).toBe('');
		expect(doctorReviewsSearch({ filter: 'all', reviewId: null })).toBe('');
		expect(doctorReviewsSearch({ filter: 'unanswered' })).toBe('?filter=unanswered');
		expect(doctorReviewsSearch({ reviewId: ID })).toBe(`?review=${ID}`);
	});

	it('🔴 D-W52-91 / U-65.6 (negative): another word, a capital, a slash more, an id that is not the server’s is no page; a choice or a review out of the closed words reads none', () => {
		for (const rest of [
			ID,
			`${ID}/Reply`,
			`${ID}/reply/x`,
			`${ID}/delete`,
			`x/reply`,
			`${ID}//reply`
		]) {
			expect(reviews(rest), rest).toBeUndefined();
		}
		expect(reviews('', 'filter=UNANSWERED&review=x')).toEqual({
			view: 'list',
			filter: 'all',
			reviewId: null
		});
	});

	it('🔴 D-W52-91 · D-W52-92 · U-81.2: inside the tab «Μενού» (a row of it); only the reply and the report are pushed over the tabs — never the list or a look-alike', () => {
		for (const path of [
			'/doctor/reviews',
			`/doctor/reviews/${ID}/reply`,
			`/doctor/reviews/${ID}/report`
		]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
		}
		expect(isDoctorReviewStepPage('/doctor/reviews')).toBe(false);
		expect(isDoctorReviewStepPage(`/doctor/reviews/${ID}/reply`)).toBe(true);
		expect(isDoctorReviewStepPage(`/doctor/reviews/${ID}/report`)).toBe(true);
		for (const path of [
			'/doctor/reviewsx',
			'/doctor/review',
			'/reviews',
			`/doctor/reviews/${ID}`,
			`/doctor/reviews/${ID}/reply/x`,
			'/doctor/reviews/x/reply'
		]) {
			expect(isDoctorMenuTab(path), path).toBe(false);
			expect(isDoctorReviewStepPage(path), path).toBe(false);
		}
	});
});

describe('🔴 D-W52-102 / 103 · screen 85 «Τα άρθρα μου» in the address', () => {
	const ID = '0193d000-0000-7000-8000-0000000000b5';

	it('D-W52-102 / 103: `/doctor/articles` the list, `/new` a new article, `/<id>` one article', () => {
		expect(doctorArticlesPath).toBe('/doctor/articles');
		expect(doctorNewArticlePath).toBe('/doctor/articles/new');
		expect(doctorArticlePath(ID)).toBe(`/doctor/articles/${ID}`);
		expect(readDoctorArticlesAddress('')).toEqual({ view: 'list' });
		expect(readDoctorArticlesAddress(undefined)).toEqual({ view: 'list' });
		expect(readDoctorArticlesAddress('new')).toEqual({ view: 'new' });
		expect(readDoctorArticlesAddress(ID)).toEqual({ view: 'article', articleId: ID });
	});

	it('🔴 D-W52-102 / U-65.6 (negative): another word, a capital, a slash more, an id that is not the server’s is no page', () => {
		for (const rest of ['New', 'x', `${ID}/x`, `${ID}/`, 'new/x', '%3Cscript%3E', '1']) {
			expect(readDoctorArticlesAddress(rest), rest).toBeUndefined();
		}
	});

	it('🔴 D-W52-102 / 103 · U-81.2: inside the tab «Μενού» (a row of it); only «Νέο άρθρο» and one article are pushed over the tabs — never the list or a look-alike', () => {
		for (const path of ['/doctor/articles', '/doctor/articles/new', `/doctor/articles/${ID}`]) {
			expect(isDoctorMenuTab(path), path).toBe(true);
			expect(isDoctorTodayTab(path), path).toBe(false);
		}
		expect(isDoctorArticlePage('/doctor/articles')).toBe(false);
		expect(isDoctorArticlePage('/doctor/articles/new')).toBe(true);
		expect(isDoctorArticlePage(`/doctor/articles/${ID}`)).toBe(true);
		for (const path of [
			'/doctor/articlesx',
			'/doctor/article',
			'/articles',
			'/doctor/articles/x',
			`/doctor/articles/${ID}/x`
		]) {
			expect(isDoctorMenuTab(path), path).toBe(false);
			expect(isDoctorArticlePage(path), path).toBe(false);
		}
	});
});
