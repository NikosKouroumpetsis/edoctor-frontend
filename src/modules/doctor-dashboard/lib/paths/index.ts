import { isUuid } from '$shared/lib/ids';

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
 * 🔴 D-W51-73 · U-81.2: «Μενού» of the capsule is the current tab on its own page and on every page of «Οι ασθενείς μου»
 * (a prefix rule: `/doctor/patients` and what is under it, never a look-alike word). 🔴 D-W51-89: and on the doctor's
 * notifications (screen 75 opens from the bell of «Μενού», inside the tab, `sw.js` `nt-back`).
 */
export function isDoctorMenuTab(basePath: string): boolean {
	return (
		basePath === doctorMenuPath ||
		basePath === doctorFramePaths.notifications ||
		basePath === doctorPatientsPath ||
		basePath.startsWith(`${doctorPatientsPath}/`)
	);
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
