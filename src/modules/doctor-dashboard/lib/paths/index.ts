import { isUuid } from '$shared/lib/ids';
import type { DoctorCredentialKind } from '$modules/doctor-dashboard/api/credentials';

/**
 * 🔴 D-W51-16 (D-W51-01: the web takes the application's names): the doctor's dashboard — «Σήμερα» at `/doctor`, «Μενού»
 * at `/doctor/menu` (below 744 a tab of its own, from 744 the same page in the middle and its rows in the ☰).
 */
export const doctorTodayPath = '/doctor';
export const doctorMenuPath = '/doctor/menu';

/**
 * 🔴 D-W51-31 (screen 67, the application's `/doctor/appointments`): «Ραντεβού», the doctor's whole book — opened from
 * «Όλα τα ραντεβού» of «Σήμερα», a page under the tab «Σήμερα» (U-81.2: as the application's, inside its tab).
 */
export const doctorAppointmentsPath = '/doctor/appointments';

/**
 * 🔴 D-W51-31: «Σήμερα» of the bar and of the capsule is the current tab on its own page and on every page under
 * «Ραντεβού» (a prefix rule: `/doctor/appointments` and what is under it, never a look-alike word).
 */
export function isDoctorTodayTab(basePath: string): boolean {
	return (
		basePath === doctorTodayPath ||
		basePath === doctorAppointmentsPath ||
		basePath.startsWith(`${doctorAppointmentsPath}/`)
	);
}

/**
 * 🔴 D-W51-36 (screen 68, the application's `/doctor/appointments/<id>`): one appointment of the doctor — from 1128
 * beside the list of 67, below it a page of its own.
 */
export function doctorAppointmentPath(appointmentId: string): string {
	return `${doctorAppointmentsPath}/${encodeURIComponent(appointmentId)}`;
}

/**
 * 🔴 D-W51-46 · D-W51-51 · D-W51-52 · D-W51-62 (screens 69, 70 and 71, the application's
 * `/doctor/appointments/<id>/reject|cancel|time|services|correction`): what one appointment of the doctor opens as a
 * screen of its own (U-102) — the refusal of a request, the cancellation of an appointment, «Αλλαγή ώρας», «Υπηρεσίες
 * και κόστος», «Διόρθωση έκβασης»; the closed list.
 */
export type DoctorAppointmentStep = 'reject' | 'cancel' | 'time' | 'services' | 'correction';

const STEPS: readonly DoctorAppointmentStep[] = [
	'reject',
	'cancel',
	'time',
	'services',
	'correction'
];

/** Screen 69's two steps (D-W51-46): the refusal of a request and the cancellation of an appointment, with a reason. */
export type DoctorReasonStep = Extract<DoctorAppointmentStep, 'reject' | 'cancel'>;

/** Whether a step is one of screen 69's (else screen 70's «Αλλαγή ώρας» or «Υπηρεσίες και κόστος»). */
export function isDoctorReasonStep(step: DoctorAppointmentStep): step is DoctorReasonStep {
	return step === 'reject' || step === 'cancel';
}

/** 🔴 D-W51-46 · D-W51-51 · D-W51-62: `/doctor/appointments/<id>/<step>` — from 1128 beside the list of 67, below it alone. */
export function doctorAppointmentStepPath(
	appointmentId: string,
	step: DoctorAppointmentStep
): string {
	return `${doctorAppointmentPath(appointmentId)}/${step}`;
}

/**
 * 🔴 D-W51-69 (screen 72, the application's `/doctor/appointments/new`): «Νέο ραντεβού» — from «Ραντεβού» beside the
 * list from 1128, from «Σήμερα» a page in the middle (`?from=today`), below 744 over the tabs.
 */
export const doctorNewAppointmentPath = `${doctorAppointmentsPath}/new`;

/** The word of the address that names screen 72 (never an appointment's id: those are the server's uuids). */
const NEW_WORD = 'new';

/**
 * 🔴 D-W51-46 · D-W51-62 · D-W51-69 · U-81.2: whether `basePath` (the path without the language) is a step screen of an
 * appointment (screens 69, 70, 71) or «Νέο ραντεβού» (screen 72) — pushed over the tabs below 744, as the application's
 * (`m-reject.png`, `m-move.png`, `m-fix.png`, `m-search.png`: no capsule, its own bar at the bottom).
 */
export function isDoctorAppointmentStepPage(basePath: string): boolean {
	const prefix = `${doctorAppointmentsPath}/`;
	if (!basePath.startsWith(prefix)) return false;
	if (basePath === doctorNewAppointmentPath) return true;
	const [appointmentId, step, ...deeper] = basePath.slice(prefix.length).split('/');
	return (
		deeper.length === 0 &&
		isUuid(appointmentId ?? '') &&
		STEPS.some((candidate) => candidate === step)
	);
}

/** Screen 67's three pills (D-W51-29): «Αιτήματα» · «Επερχόμενα» · «Ιστορικό». */
export type DoctorAppointmentsTab = 'requests' | 'upcoming' | 'history';

const TABS: readonly DoctorAppointmentsTab[] = ['requests', 'upcoming', 'history'];

/**
 * What `/doctor/appointments/[...path]` shows: the list, or one appointment (`/<id>`, screen 68, D-W51-36) and what it
 * opens (`/<id>/reject|cancel|time|services|correction`, screens 69, 70 and 71: `step`, `null` for the appointment
 * itself) — each with the list's
 * pill (`?tab=`, «Επερχόμενα» by default, as the prototype opens it from «Όλα τα ραντεβού») and office (`?office=<id>`,
 * none for every office), so the list beside the appointment (and its «‹» below 1128) keeps both.
 */
export type DoctorAppointmentsAddress =
	| { view: 'list'; tab: DoctorAppointmentsTab; officeId: string | null }
	| {
			view: 'appointment';
			appointmentId: string;
			step: DoctorAppointmentStep | null;
			tab: DoctorAppointmentsTab;
			officeId: string | null;
	  }
	| {
			view: 'new';
			/** 🔴 D-W51-69: the patient already chosen (`?kind=&id=`, from screen 73's «Νέο ραντεβού»), else none. */
			patient: DoctorNewAppointmentPatientKey | null;
			/** Where it was opened from: «Σήμερα» draws it alone in the middle, «Ραντεβού» beside its list from 1128. */
			from: DoctorNewAppointmentOrigin;
			tab: DoctorAppointmentsTab;
			officeId: string | null;
	  };

/** A patient of the doctor by its key, as `?kind=&id=` names it (the closed words of `searchDoctorPatients`). */
export type DoctorNewAppointmentPatientKey = {
	kind: 'account' | 'relative' | 'record';
	id: string;
};

/**
 * 🔴 D-W51-69 · D-W51-73: where screen 72 opens from — «Ραντεβού» (`list`, by default), «Σήμερα» (`today`, `?from=today`)
 * or a patient's card of screen 73 (`patient`, `?from=patient` with the patient's `?kind=&id=`): from the last two it is
 * a page alone in the middle, and its «‹» leads back where it came from.
 */
export type DoctorNewAppointmentOrigin = 'list' | 'today' | 'patient';

const PATIENT_KINDS: readonly DoctorNewAppointmentPatientKey['kind'][] = [
	'account',
	'relative',
	'record'
];

/** `?kind=&id=` read against the closed words and a server id; anything else is no patient chosen. */
function readNewAppointmentPatient(search: URLSearchParams): DoctorNewAppointmentPatientKey | null {
	const kind = PATIENT_KINDS.find((candidate) => candidate === search.get('kind'));
	const id = search.get('id');
	return kind && id && isUuid(id) ? { kind, id } : null;
}

/**
 * 🔴 D-W51-31 · D-W51-36 · D-W51-46 · D-W51-51 · D-W51-62 · D-W51-69 / U-65.6: the route's rest read against a closed list
 * — `''` is the list, `new` screen 72 (`?kind=&id=` a patient chosen, `?from=today` from «Σήμερα»), `<id>` (a server id)
 * the appointment, `<id>/reject|cancel|time|services|correction` its five step screens; anything else (another word, a
 * slash, one level deeper, an id that is not the server's) is `undefined`, a 404. The pill is one of the three words
 * (any other reads «Επερχόμενα»), the office a server id (anything else reads every office): fixed words and ids,
 * never a person's fact.
 */
export function readDoctorAppointmentsAddress(
	rest: string | undefined,
	search: URLSearchParams
): DoctorAppointmentsAddress | undefined {
	const tab = TABS.find((candidate) => candidate === search.get('tab')) ?? 'upcoming';
	const office = search.get('office');
	const officeId = office && isUuid(office) ? office : null;
	if (!rest) return { view: 'list', tab, officeId };
	if (rest === NEW_WORD) {
		const patient = readNewAppointmentPatient(search);
		const from = search.get('from');
		return {
			view: 'new',
			patient,
			from: from === 'today' ? 'today' : from === 'patient' && patient ? 'patient' : 'list',
			tab,
			officeId
		};
	}
	const [appointmentId = '', step, ...deeper] = rest.split('/');
	if (!isUuid(appointmentId) || deeper.length > 0) return undefined;
	if (step === undefined) return { view: 'appointment', appointmentId, step: null, tab, officeId };
	const known = STEPS.find((candidate) => candidate === step);
	return known ? { view: 'appointment', appointmentId, step: known, tab, officeId } : undefined;
}

/**
 * The list's search (`?tab=…&office=…`) after `/doctor/appointments` in the page's language (the patient's
 * `APPOINTMENTS_HISTORY_SEARCH` way: the path is resolved, the search follows it): the default pill and every office
 * leave the address bare.
 */
export function doctorAppointmentsSearch(
	tab: DoctorAppointmentsTab,
	officeId: string | null
): string {
	const search = new URLSearchParams();
	if (tab !== 'upcoming') search.set('tab', tab);
	if (officeId) search.set('office', officeId);
	const query = search.toString();
	return query ? `?${query}` : '';
}

/**
 * 🔴 D-W51-18 (§1.2: no row leads to a void): what the doctor's frame opens in 5.1 — «Μηνύματα» the doctor's own messages
 * since step 10 (D-W51-85, the end of the transition: `/doctor/messages`), «Ειδοποιήσεις» the doctor's own list since
 * step 11 (D-W51-89, screen 75, the end of the transition: `/doctor/notifications`), «Ρυθμίσεις λογαριασμού» the shared
 * screen 57, the Help Centre, the doctors' terms (the legal page `doctor-marketplace-terms`), the patient's home.
 */
export const doctorFramePaths = {
	messages: '/doctor/messages',
	notifications: '/doctor/notifications',
	accountSettings: '/profile/account-settings',
	help: '/help',
	terms: '/legal/doctor-marketplace-terms',
	home: '/'
} as const;

/**
 * 🔴 D-W51-69: the search after `/doctor/appointments/new` — from «Σήμερα» `?from=today`, from «Ραντεβού» the list's pill
 * and office (its list stays beside it), and a chosen patient (`?kind=&id=`, step 9's «Νέο ραντεβού» of screen 73).
 */
export function doctorNewAppointmentSearch(input: {
	from: DoctorNewAppointmentOrigin;
	tab?: DoctorAppointmentsTab;
	officeId?: string | null;
	patient?: DoctorNewAppointmentPatientKey | null;
}): string {
	const search = new URLSearchParams();
	if (input.from === 'today') search.set('from', 'today');
	else if (input.from === 'patient') search.set('from', 'patient');
	else {
		if (input.tab && input.tab !== 'upcoming') search.set('tab', input.tab);
		if (input.officeId) search.set('office', input.officeId);
	}
	if (input.patient) {
		search.set('kind', input.patient.kind);
		search.set('id', input.patient.id);
	}
	const query = search.toString();
	return query ? `?${query}` : '';
}

/**
 * 🔴 D-W51-73 (screen 73, the application's `/doctor/patients`): «Οι ασθενείς μου» — the list, from the row of the
 * doctor's «Μενού»; a page under the tab «Μενού» (U-81.2: as the application's, inside its tab).
 */
export const doctorPatientsPath = '/doctor/patients';

/** 🔴 D-W51-63: the key of one patient of the doctor — an account, a relative, the doctor's own record — by a server id. */
export type DoctorPatientAddressKey = DoctorNewAppointmentPatientKey;

/** 🔴 D-W51-76 · U-198.2: what a record's card opens as a screen of its own (U-102): «Στοιχεία ασθενή», the join. */
export type DoctorPatientStep = 'edit' | 'merge';

const PATIENT_STEPS: readonly DoctorPatientStep[] = ['edit', 'merge'];

/** 🔴 D-W51-73: `/doctor/patients/<kind>/<id>` — from 1128 beside the list, below it a page of its own. */
export function doctorPatientPath(key: DoctorPatientAddressKey): string {
	return `${doctorPatientsPath}/${key.kind}/${encodeURIComponent(key.id)}`;
}

/** 🔴 D-W51-76 · U-198.2: `/doctor/patients/record/<id>/edit|merge` — beside the list from 1128, below it alone. */
export function doctorPatientStepPath(
	key: DoctorPatientAddressKey,
	step: DoctorPatientStep
): string {
	return `${doctorPatientPath(key)}/${step}`;
}

/** What `/doctor/patients/[...path]` shows: the list, or one patient's card (screen 73) and what a record's card opens. */
export type DoctorPatientsAddress =
	| { view: 'list' }
	| { view: 'card'; key: DoctorPatientAddressKey; step: DoctorPatientStep | null };

/**
 * 🔴 D-W51-73 / U-65.6: the route's rest read against a closed list — `''` the list, `<kind>/<id>` a card (`kind` one of
 * `account | relative | record`, `id` a server id), `record/<id>/edit|merge` the two screens of a record; anything else
 * (another word, a step of an account or a relative, a slash more, an id that is not the server's) is `undefined`, a 404.
 */
export function readDoctorPatientsAddress(
	rest: string | undefined
): DoctorPatientsAddress | undefined {
	if (!rest) return { view: 'list' };
	const [kindWord, id = '', step, ...deeper] = rest.split('/');
	const kind = PATIENT_KINDS.find((candidate) => candidate === kindWord);
	if (!kind || !isUuid(id) || deeper.length > 0) return undefined;
	if (step === undefined) return { view: 'card', key: { kind, id }, step: null };
	const known = PATIENT_STEPS.find((candidate) => candidate === step);
	return known && kind === 'record' ? { view: 'card', key: { kind, id }, step: known } : undefined;
}

/**
 * 🔴 D-W52-22 · D-W52-23 (screen 77, the application's «Το προφίλ μου» inside the tab «Μενού»): the page of the first row
 * of the doctor's «Μενού», and 🔴 D-W52-26 «Δείτε πώς σας βλέπουν», a page of its own (U-102: never a window). A closed
 * list: each section's own page (screens 78–83) adds its address with its card.
 */
export const doctorProfilePath = '/doctor/profile';
export const doctorProfilePreviewPath = '/doctor/profile/preview';

/**
 * 🔴 D-W52-41 (screen 78, the settings' way: `/profile/account-settings/<section>`): «Φωτογραφίες», the first section of
 * «Το προφίλ μου» with a page — from 950 beside the list of 77, below it a page of its own.
 */
export const doctorProfilePhotosPath = `${doctorProfilePath}/photos`;

/**
 * 🔴 D-W52-49 (screen 79, as the photos' page): «Όνομα και περιγραφή», read only — from 950 beside the list of 77, below
 * it a page of its own.
 */
export const doctorProfileAboutPath = `${doctorProfilePath}/about`;

/** The word of the address that names the choice of the specializations (D-W52-59). */
const SPECIALIZATIONS_WORD = 'specializations';

/**
 * 🔴 D-W52-59 (screen 80, as the photos' page): «Ειδικότητα και εξειδικεύσεις» — from 950 beside the list of 77, below
 * it a page of its own; and the choice of the specializations, a page of its own under it (U-102: never a window).
 */
export const doctorProfileSpecialtyPath = `${doctorProfilePath}/specialty`;
export const doctorProfileSpecializationsPath = `${doctorProfileSpecialtyPath}/${SPECIALIZATIONS_WORD}`;

/**
 * 🔴 D-W52-63 (screen 81, as the photos' page): «Βιογραφικό» — from 950 beside the list of 77, below it a page of its
 * own.
 */
export const doctorProfileCvPath = `${doctorProfilePath}/cv`;

/** The words of the address that name the three groups of the biography, and a row that does not exist yet. */
const CV_GROUP_WORDS: Record<DoctorCredentialKind, string> = {
	STUDY: 'studies',
	WORK: 'experience',
	CONFERENCE: 'conferences'
};
const CV_NEW_WORD = 'new';
const cvKindOf = (word: string | undefined): DoctorCredentialKind | undefined =>
	(Object.keys(CV_GROUP_WORDS) as DoctorCredentialKind[]).find(
		(kind) => CV_GROUP_WORDS[kind] === word
	);

/**
 * 🔴 D-W52-63 (U-102: a page, never a window): ONE row of the biography — `/doctor/profile/cv/<group>/<id>` the row the
 * server keeps under `id`, `/doctor/profile/cv/<group>/new` («Προσθήκη», `id` `null`) a row that does not exist yet.
 */
export function doctorProfileCvItemPath(kind: DoctorCredentialKind, id: string | null): string {
	return `${doctorProfileCvPath}/${CV_GROUP_WORDS[kind]}/${id === null ? CV_NEW_WORD : encodeURIComponent(id)}`;
}

/** The words of the address that name the two pages under screen 82 (D-W52-69 / 70). */
const SPOKEN_WORD = 'spoken';
const NETWORKS_WORD = 'networks';

/**
 * 🔴 D-W52-69 / 70 (screen 82, as the photos' page): «Γλώσσες και κοινωνικά δίκτυα» — from 950 beside the list of 77,
 * below it a page of its own; and under it two pages of their own (U-102: never a window): the choice of the languages
 * the doctor speaks, and the four links.
 */
export const doctorProfileLanguagesPath = `${doctorProfilePath}/languages`;
export const doctorProfileSpokenLanguagesPath = `${doctorProfileLanguagesPath}/${SPOKEN_WORD}`;
export const doctorProfileNetworksPath = `${doctorProfileLanguagesPath}/${NETWORKS_WORD}`;

/** The word of the address that names «Νέα υπηρεσία», the catalogue of the specialty (D-W52-81). */
const NEW_SERVICE_WORD = 'new';

/**
 * 🔴 D-W52-81 / 82 (screen 83, as the photos' page): «Υπηρεσίες και τιμές» — from 950 beside the list of 77, below it a
 * page of its own; under it, each a page of its own (U-102: never a window), ONE service of the doctor
 * (`/doctor/profile/services/<id>`), «Νέα υπηρεσία» (`…/services/new`, the catalogue of the specialty) and the page of a
 * new one of the catalogue (`…/services/new/<serviceId>`).
 */
export const doctorProfileServicesPath = `${doctorProfilePath}/services`;
export const doctorProfileNewServicePath = `${doctorProfileServicesPath}/${NEW_SERVICE_WORD}`;

/** 🔴 D-W52-82: the page of ONE service of the doctor — its server id. */
export function doctorProfileServicePath(id: string): string {
	return `${doctorProfileServicesPath}/${encodeURIComponent(id)}`;
}

/** 🔴 D-W52-82: the page of a NEW service — the catalogue's id of the service picked in «Νέα υπηρεσία». */
export function doctorProfileNewServiceItemPath(serviceId: string): string {
	return `${doctorProfileNewServicePath}/${encodeURIComponent(serviceId)}`;
}

/** The word of the address that names «Προσαρμογή» of one photo (D-W52-40). */
const CROP_WORD = 'crop';

/** 🔴 D-W52-40 (U-102: a page, never a window): «Προσαρμογή» of one photo — `/doctor/profile/photos/<id>/crop`. */
export function doctorProfilePhotoCropPath(imageId: string): string {
	return `${doctorProfilePhotosPath}/${encodeURIComponent(imageId)}/${CROP_WORD}`;
}

/**
 * What `/doctor/profile/[...path]` shows: the list of «Το προφίλ μου» (from 950 with its first section beside it), or
 * one section — «Φωτογραφίες», with the photo whose «Προσαρμογή» is open (`cropId`, `null` for the grid), «Όνομα
 * και περιγραφή» (D-W52-49), «Ειδικότητα και εξειδικεύσεις» (D-W52-59; `pick`: the choice of the specializations), or
 * «Βιογραφικό» (D-W52-63; `item`: the one row whose page is open — its group and its id, `null` for a new one), or
 * «Γλώσσες και κοινωνικά δίκτυα» (D-W52-69 / 70; `page`: `spoken` the choice of the languages, `networks` the four
 * links, `null` screen 82 itself), or «Υπηρεσίες και τιμές» (D-W52-81 / 82; `page`: one service, «Νέα υπηρεσία» or a
 * new one, `null` screen 83 itself).
 */
export type DoctorProfileAddress =
	| { section: null }
	| { section: 'photos'; cropId: string | null }
	| { section: 'about' }
	| { section: 'specialty'; pick: boolean }
	| { section: 'cv'; item: { kind: DoctorCredentialKind; id: string | null } | null }
	| { section: 'languages'; page: 'spoken' | 'networks' | null }
	| { section: 'services'; page: DoctorServicesPage | null };

/**
 * 🔴 D-W52-81 / 82: a page under «Υπηρεσίες και τιμές» — ONE service of the doctor (`id`), «Νέα υπηρεσία» (the
 * catalogue), or a new one of the catalogue (`serviceId`).
 */
export type DoctorServicesPage =
	| { view: 'service'; id: string }
	| { view: 'catalogue' }
	| { view: 'new'; serviceId: string };

/**
 * 🔴 D-W52-41 / D-W52-49 / D-W52-59 / D-W52-63 / D-W52-69 / D-W52-70 / D-W52-81 / D-W52-82 / U-65.6: the route's rest read against a closed list — `''` the list,
 * `photos` the photos, `photos/<id>/crop` one photo's «Προσαρμογή» (`id` a server id), `about` «Όνομα και περιγραφή»
 * (nothing under it), `specialty` «Ειδικότητα και εξειδικεύσεις» and `specialty/specializations` the choice (nothing
 * else under it), `cv` «Βιογραφικό» and `cv/<group>/<id>` or `cv/<group>/new` one row of it (`group` one of `studies |
 * experience | conferences`, `id` a server id), `languages` «Γλώσσες και κοινωνικά δίκτυα», `languages/spoken` the
 * choice of the languages and `languages/networks` the four links (nothing else under it), `services` «Υπηρεσίες και
 * τιμές» with `services/<id>` one service, `services/new` «Νέα υπηρεσία» and `services/new/<serviceId>` a new one (each
 * id a server id, nothing else under it); anything else (another
 * section's word before its card, a look-alike, a slash more, an id that is not the server's) is `undefined`, a 404.
 * `preview` is a route of its own.
 */
export function readDoctorProfileAddress(
	rest: string | undefined
): DoctorProfileAddress | undefined {
	if (!rest) return { section: null };
	const [section, imageId, step, ...deeper] = rest.split('/');
	if (section === 'about') return imageId === undefined ? { section: 'about' } : undefined;
	if (section === 'cv') {
		if (imageId === undefined) return { section: 'cv', item: null };
		const kind = cvKindOf(imageId);
		if (!kind || step === undefined || deeper.length > 0) return undefined;
		if (step === CV_NEW_WORD) return { section: 'cv', item: { kind, id: null } };
		return isUuid(step) ? { section: 'cv', item: { kind, id: step } } : undefined;
	}
	if (section === 'services') {
		if (imageId === undefined) return { section: 'services', page: null };
		if (deeper.length > 0) return undefined;
		if (imageId === NEW_SERVICE_WORD) {
			if (step === undefined) return { section: 'services', page: { view: 'catalogue' } };
			return isUuid(step)
				? { section: 'services', page: { view: 'new', serviceId: step } }
				: undefined;
		}
		return step === undefined && isUuid(imageId)
			? { section: 'services', page: { view: 'service', id: imageId } }
			: undefined;
	}
	if (section === 'languages') {
		if (imageId === undefined) return { section: 'languages', page: null };
		if (step !== undefined) return undefined;
		if (imageId === SPOKEN_WORD) return { section: 'languages', page: 'spoken' };
		return imageId === NETWORKS_WORD ? { section: 'languages', page: 'networks' } : undefined;
	}
	if (section === 'specialty') {
		if (imageId === undefined) return { section: 'specialty', pick: false };
		return imageId === SPECIALIZATIONS_WORD && step === undefined
			? { section: 'specialty', pick: true }
			: undefined;
	}
	if (section !== 'photos' || deeper.length > 0) return undefined;
	if (imageId === undefined) return { section: 'photos', cropId: null };
	return step === CROP_WORD && isUuid(imageId) ? { section: 'photos', cropId: imageId } : undefined;
}

/**
 * 🔴 D-W52-91 (screen 84, the application's «Κριτικές» inside the tab «Μενού»): the doctor's reviews — a row of «Μενού»,
 * the target of «Νέα κριτική» and of the row of 68 (`?review=<id>`: the list goes to that review); 🔴 D-W52-92 the
 * reply to one review and its report, each a page of its own (U-102: never a window).
 */
export const doctorReviewsPath = '/doctor/reviews';

/** The words of the address that name the two pages of one review (D-W52-92). */
const REVIEW_STEPS = ['reply', 'report'] as const;
export type DoctorReviewStep = (typeof REVIEW_STEPS)[number];

/** 🔴 D-W52-92: `/doctor/reviews/<id>/reply|report` — the reply to one review and its report. */
export function doctorReviewStepPath(ratingId: string, step: DoctorReviewStep): string {
	return `${doctorReviewsPath}/${encodeURIComponent(ratingId)}/${step}`;
}

/** The two choices of the list (U-218.1), as the address names them: every review, or those without a reply. */
export type DoctorReviewsChoice = 'all' | 'unanswered';
const UNANSWERED_WORD = 'unanswered';

/**
 * What `/doctor/reviews/[...path]` shows: the list with its choice (`?filter=unanswered`, «Όλες» by default) and the
 * review it goes to (`?review=<id>`, a server id, else none), or the page of one review (its reply or its report).
 */
export type DoctorReviewsAddress =
	| { view: 'list'; filter: DoctorReviewsChoice; reviewId: string | null }
	| { view: DoctorReviewStep; reviewId: string };

/**
 * 🔴 D-W52-91 / 92 · U-65.6: the route's rest read against a closed list — `''` the list (`?filter=` one word, any other
 * reads «Όλες»; `?review=` a server id, any other reads none), `<id>/reply` and `<id>/report` the two pages of one review
 * (`id` a server id); anything else (another word, a slash more, an id that is not the server's) is `undefined`, a 404.
 */
export function readDoctorReviewsAddress(
	rest: string | undefined,
	search: URLSearchParams
): DoctorReviewsAddress | undefined {
	if (!rest) {
		const review = search.get('review');
		return {
			view: 'list',
			filter: search.get('filter') === UNANSWERED_WORD ? 'unanswered' : 'all',
			reviewId: review && isUuid(review) ? review : null
		};
	}
	const [reviewId = '', step, ...deeper] = rest.split('/');
	if (!isUuid(reviewId) || deeper.length > 0) return undefined;
	const known = REVIEW_STEPS.find((candidate) => candidate === step);
	return known ? { view: known, reviewId } : undefined;
}

/** The list's search after `/doctor/reviews` (the path resolved, the search after it): «Όλες» and no review leave it bare. */
export function doctorReviewsSearch(input: {
	filter?: DoctorReviewsChoice;
	reviewId?: string | null;
}): string {
	const search = new URLSearchParams();
	if (input.filter === 'unanswered') search.set('filter', UNANSWERED_WORD);
	if (input.reviewId) search.set('review', input.reviewId);
	const query = search.toString();
	return query ? `?${query}` : '';
}

/** The address of the reviews a path under `/doctor/reviews/` names, `undefined` for any other path. */
function reviewsAddressOf(basePath: string): DoctorReviewsAddress | undefined {
	return basePath.startsWith(`${doctorReviewsPath}/`)
		? readDoctorReviewsAddress(basePath.slice(doctorReviewsPath.length + 1), new URLSearchParams())
		: undefined;
}

/**
 * 🔴 D-W52-92 · U-81.2: the reply to a review and its report are pushed over the tabs below 744 (their own «Άκυρο ·
 * Αποστολή» at the bottom); the list of screen 84 keeps the capsule (`84-reviews/shots/m-full.png`).
 */
export function isDoctorReviewStepPage(basePath: string): boolean {
	return reviewsAddressOf(basePath) !== undefined;
}

/**
 * 🔴 D-W52-102 / 103 (screen 85, the application's «Τα άρθρα μου» inside the tab «Μενού»): the doctor's articles — a row
 * of «Μενού» and the target of «Το άρθρο σας δημοσιεύτηκε / δεν δημοσιεύτηκε»; «Νέο άρθρο» and one article, each a
 * page of its own (U-102: never a window).
 */
export const doctorArticlesPath = '/doctor/articles';
const NEW_ARTICLE_WORD = 'new';
export const doctorNewArticlePath = `${doctorArticlesPath}/${NEW_ARTICLE_WORD}`;

/** 🔴 D-W52-103: `/doctor/articles/<id>` — one article of the doctor, its page and its text. */
export function doctorArticlePath(articleId: string): string {
	return `${doctorArticlesPath}/${encodeURIComponent(articleId)}`;
}

/** What `/doctor/articles/[...path]` shows: the list, «Νέο άρθρο», or one article by the server's id. */
export type DoctorArticlesAddress =
	| { view: 'list' }
	| { view: 'new' }
	| { view: 'article'; articleId: string };

/**
 * 🔴 D-W52-102 / 103 · U-65.6: the route's rest read against a closed list — `''` the list, `new` a new article, a
 * server id one article; anything else (another word, a slash more, an id that is not the server's) is `undefined`, a
 * 404.
 */
export function readDoctorArticlesAddress(
	rest: string | undefined
): DoctorArticlesAddress | undefined {
	if (!rest) return { view: 'list' };
	const [first = '', ...deeper] = rest.split('/');
	if (deeper.length > 0) return undefined;
	if (first === NEW_ARTICLE_WORD) return { view: 'new' };
	return isUuid(first) ? { view: 'article', articleId: first } : undefined;
}

/** The address of the articles a path under `/doctor/articles/` names, `undefined` for any other path. */
function articlesAddressOf(basePath: string): DoctorArticlesAddress | undefined {
	return basePath.startsWith(`${doctorArticlesPath}/`)
		? readDoctorArticlesAddress(basePath.slice(doctorArticlesPath.length + 1))
		: undefined;
}

/**
 * 🔴 D-W52-103 · U-81.2: «Νέο άρθρο» and one article are pushed over the tabs below 744 (their own «Άκυρο · Αποστολή
 * για έλεγχο» at the bottom); the list of screen 85 keeps the capsule (`85-articles/shots/m-full.png`).
 */
export function isDoctorArticlePage(basePath: string): boolean {
	return articlesAddressOf(basePath) !== undefined;
}

/** The address of «Το προφίλ μου» a path under `/doctor/profile/` names, `undefined` for any other path. */
function profileAddressOf(basePath: string): DoctorProfileAddress | undefined {
	return basePath.startsWith(`${doctorProfilePath}/`)
		? readDoctorProfileAddress(basePath.slice(doctorProfilePath.length + 1))
		: undefined;
}

/**
 * 🔴 D-W51-73 · U-81.2: «Μενού» of the capsule is the current tab on its own page and on every page of «Οι ασθενείς μου»
 * (a prefix rule: `/doctor/patients` and what is under it, never a look-alike word). 🔴 D-W51-89: and on the doctor's
 * notifications (screen 75 opens from the bell of «Μενού», inside the tab, `sw.js` `nt-back`). 🔴 D-W52-22: and on «Το
 * προφίλ μου» and its preview; 🔴 D-W52-41: and on the pages of its sections (the closed list of
 * `readDoctorProfileAddress`, never a look-alike). 🔴 D-W52-91: and on «Κριτικές» and its two pages (the closed list of
 * `readDoctorReviewsAddress`). 🔴 D-W52-102: and on «Τα άρθρα μου» and its pages (the closed list of
 * `readDoctorArticlesAddress`).
 */
export function isDoctorMenuTab(basePath: string): boolean {
	return (
		basePath === doctorMenuPath ||
		basePath === doctorFramePaths.notifications ||
		basePath === doctorProfilePath ||
		basePath === doctorProfilePreviewPath ||
		profileAddressOf(basePath) !== undefined ||
		basePath === doctorReviewsPath ||
		reviewsAddressOf(basePath) !== undefined ||
		basePath === doctorArticlesPath ||
		articlesAddressOf(basePath) !== undefined ||
		basePath === doctorPatientsPath ||
		basePath.startsWith(`${doctorPatientsPath}/`)
	);
}

/**
 * 🔴 D-W52-26 · U-81.2: «Δείτε πώς σας βλέπουν» is pushed over the tabs below 744, as the application's pushed page and as
 * the public profile it draws (its own booking bar at the bottom, no capsule).
 */
export function isDoctorProfilePreviewPage(basePath: string): boolean {
	return basePath === doctorProfilePreviewPath;
}

/**
 * 🔴 D-W52-40 · U-81.2: «Προσαρμογή» of a photo is pushed over the tabs below 744 too (the application's page without a
 * bar: its own «Άκυρο · Αποθήκευση» stands at the bottom); the photos' grid keeps the capsule
 * (`78-photos/shots/m-full.png`).
 */
export function isDoctorPhotoCropPage(basePath: string): boolean {
	const address = profileAddressOf(basePath);
	return address?.section === 'photos' && address.cropId !== null;
}

/**
 * 🔴 D-W52-59 · U-81.2: the choice of the specializations is pushed over the tabs below 744 too (`80-spec/shots/m-pick.png`:
 * no capsule, its own «Άκυρο · Αποθήκευση» at the bottom); screen 80 itself keeps the capsule (`m-full.png`).
 */
export function isDoctorSpecializationsPickPage(basePath: string): boolean {
	const address = profileAddressOf(basePath);
	return address?.section === 'specialty' && address.pick;
}

/**
 * 🔴 D-W52-63 · U-81.2: the page of ONE row of the biography is pushed over the tabs below 744 too (`81-cv/shots/m-edit.png`,
 * `m-new.png`: no capsule, its own «Άκυρο · Αποθήκευση» at the bottom); screen 81 itself keeps the capsule
 * (`m-full.png`).
 */
export function isDoctorCredentialPage(basePath: string): boolean {
	const address = profileAddressOf(basePath);
	return address?.section === 'cv' && address.item !== null;
}

/**
 * 🔴 D-W52-69 / 70 · U-81.2: the choice of the languages and the page of the four links are pushed over the tabs below
 * 744 too (`82-langs/shots/m-pick.png`, `m-soc.png`: no capsule, their own «Άκυρο · Αποθήκευση» at the bottom); screen
 * 82 itself keeps the capsule (`m-full.png`).
 */
export function isDoctorLanguagesStepPage(basePath: string): boolean {
	const address = profileAddressOf(basePath);
	return address?.section === 'languages' && address.page !== null;
}

/**
 * 🔴 D-W52-81 / 82 · U-81.2: ONE service, «Νέα υπηρεσία» and a new one are pushed over the tabs below 744 too
 * (`83-services/shots/m-edit.png`, `m-pick.png`, `m-new.png`: no capsule, their own bar at the bottom); screen 83 itself
 * keeps the capsule (`m-full.png`).
 */
export function isDoctorServicePage(basePath: string): boolean {
	const address = profileAddressOf(basePath);
	return address?.section === 'services' && address.page !== null;
}

/**
 * 🔴 D-W51-76 · U-198.2 · U-81.2: whether `basePath` is «Στοιχεία ασθενή» or the join of a record — pushed over the tabs
 * below 744, as the application's (no capsule, its own bar at the bottom).
 */
export function isDoctorPatientStepPage(basePath: string): boolean {
	const address = basePath.startsWith(`${doctorPatientsPath}/`)
		? readDoctorPatientsAddress(basePath.slice(doctorPatientsPath.length + 1))
		: undefined;
	return address?.view === 'card' && address.step !== null;
}

/**
 * 🔴 D-W51-85 · U-81.2: «Μηνύματα» of the bar and of the capsule is the current tab on the doctor's messages and on every
 * page under them (a prefix rule: `/doctor/messages` and what is under it, never a look-alike word).
 */
export function isDoctorMessagesTab(basePath: string): boolean {
	return (
		basePath === doctorFramePaths.messages || basePath.startsWith(`${doctorFramePaths.messages}/`)
	);
}

/**
 * 🔴 D-W51-85 · U-81.2 (`m-thread.png`, `m-new.png`: no capsule): a conversation, one the doctor starts and «Προηγούμενες
 * συνομιλίες» are pushed over the tabs below 744, as the patient's (the list alone keeps the capsule).
 */
export function isDoctorMessagesPushedPage(basePath: string): boolean {
	return basePath.startsWith(`${doctorFramePaths.messages}/`);
}
