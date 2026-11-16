import { describe, expect, it } from 'vitest';
import {
	doctorAppointmentPath,
	doctorAppointmentsSearch,
	doctorAppointmentStepPath,
	doctorFramePaths,
	doctorNewAppointmentPath,
	doctorNewAppointmentSearch,
	doctorPatientPath,
	doctorPatientStepPath,
	isDoctorAppointmentStepPage,
	isDoctorMenuTab,
	isDoctorMessagesPushedPage,
	isDoctorMessagesTab,
	isDoctorPatientStepPage,
	isDoctorReasonStep,
	isDoctorTodayTab,
	readDoctorAppointmentsAddress,
	readDoctorPatientsAddress
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
