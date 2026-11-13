import { describe, expect, it } from 'vitest';
import {
	mapNotificationPreferences,
	type NotificationPreferencesFacts
} from '$modules/notifications/api/preferences';
import { samplePreferencesView } from '$modules/notifications/api/preferences/preferences.sample';
import { notificationGroups } from '$modules/notifications/config/groups';
import { applyNotificationChanges, buildNotificationGroups } from '.';

const el = { locale: 'el' } as const;
const en = { locale: 'en' } as const;

const facts = (options?: Parameters<typeof samplePreferencesView>[0]) =>
	mapNotificationPreferences(samplePreferencesView(options));
const rowsOf = (given: NotificationPreferencesFacts, options: typeof el | typeof en = el) =>
	buildNotificationGroups(given, options).flatMap((group) => group.rows);
const rowOf = (given: NotificationPreferencesFacts, category: string) =>
	rowsOf(given).find((row) => row.category === category);

/** One kind of the patient's side with the cells a test names: `[channel, mode, enabled, scope?]`. */
const kind = (
	category: string,
	cells: [string, string, boolean | null, (string | null)?][]
): NotificationPreferencesFacts =>
	mapNotificationPreferences({
		sections: [
			{
				side: 'PATIENT',
				categories: [
					{
						category,
						cells: cells.map(([channel, mode, enabled, scope = null]) => ({
							channel,
							mode,
							enabled,
							scope
						}))
					}
				]
			}
		]
	});
const summaryOf = (cells: [string, string, boolean | null, (string | null)?][]) =>
	rowsOf(kind('REMINDERS', cells))[0]?.summary;

describe('modules/notifications/lib/preferences · «Ειδοποιήσεις» as its groups (wave 4.5, screen 60)', () => {
	it('record §5.5: three groups with their titles, the six kinds in the PAGE’s order (the table’s, not the server’s)', () => {
		const groups = buildNotificationGroups(facts(), el);
		expect(groups.map((group) => [group.id, group.title])).toEqual([
			['appointments', 'Ραντεβού'],
			['messages', 'Μηνύματα και ερωτήσεις'],
			['account', 'Λογαριασμός']
		]);
		expect(groups.map((group) => group.rows.map((row) => row.category))).toEqual([
			['APPOINTMENT_UPDATES', 'REMINDERS', 'RATINGS'],
			// The server names «Ερωτήσεις» first; the page's table says «Μηνύματα» first.
			['MESSAGES', 'QUESTIONS'],
			['ACCOUNT']
		]);
	});

	it('U-140: the six kinds, the three channels and the fixed words as the application writes them, and in English', () => {
		expect(rowsOf(facts()).map((row) => row.title)).toEqual([
			'Αλλαγές στα ραντεβού σας',
			'Υπενθυμίσεις ραντεβού',
			'Κριτικές',
			'Μηνύματα από γιατρούς',
			'Ερωτήσεις σε γιατρούς',
			'Λογαριασμός και όροι'
		]);
		expect(rowsOf(facts(), en).map((row) => row.title)).toEqual([
			'Changes to your appointments',
			'Appointment reminders',
			'Reviews',
			'Messages from doctors',
			'Questions to doctors',
			'Account and terms'
		]);
		expect(rowOf(facts(), 'APPOINTMENT_UPDATES')?.cells).toEqual([
			{ channel: 'EMAIL', label: 'Email', note: null, control: 'always', on: true, fixed: 'Πάντα' },
			{
				channel: 'PUSH',
				label: 'Ειδοποιήσεις εφαρμογής',
				note: null,
				control: 'switch',
				on: true,
				fixed: null
			},
			{
				channel: 'SMS',
				label: 'SMS',
				note: null,
				control: 'doctor',
				on: false,
				fixed: 'Ορίζει ο γιατρός'
			}
		]);
		expect(rowOf(facts(), 'REMINDERS')?.cells[2]).toMatchObject({
			channel: 'SMS',
			note: 'Όταν το προσφέρει ο γιατρός',
			control: 'switch'
		});
		const english = rowsOf(facts(), en).find((row) => row.category === 'APPOINTMENT_UPDATES');
		expect(english?.cells.map((cell) => [cell.label, cell.fixed])).toEqual([
			['Email', 'Always'],
			['App notifications', null],
			['SMS', 'Set by your doctor']
		]);
		expect(buildNotificationGroups(facts(), en).map((group) => group.title)).toEqual([
			'Appointments',
			'Messages and questions',
			'Account'
		]);
	});

	it('🔴 U-173: Κριτικές — the kind `RATINGS` is «Κριτικές» / «Reviews» (D-W45-23), and no word of this page says «αξιολόγηση»', () => {
		expect(rowOf(facts(), 'RATINGS')?.title).toBe('Κριτικές');
		expect(rowsOf(facts(), en).find((row) => row.category === 'RATINGS')?.title).toBe('Reviews');
		expect(rowOf(facts(), 'RATINGS')?.line).toBe(
			'Η πρόσκληση να γράψετε κριτική για μια επίσκεψη και η απάντηση του γιατρού.'
		);
		// Every word the page draws (the kinds' codes are no words of it).
		for (const options of [el, en]) {
			const said = buildNotificationGroups(facts({ withDoctor: true }), options).flatMap(
				(group) => [
					group.title,
					...group.rows.flatMap((row) => [
						row.title,
						row.summary,
						row.line ?? '',
						...row.cells.flatMap((cell) => [cell.label, cell.note ?? '', cell.fixed ?? ''])
					])
				]
			);
			expect(said.length).toBeGreaterThan(20);
			expect(said.join(' · ')).not.toMatch(/αξιολ[οό]γ|rating/iu);
		}
	});

	it('record §5.5: the window’s one line for the four kinds with a switch, in both languages; a kind of «Πάντα» alone has none', () => {
		const lines = (options: typeof el | typeof en) =>
			Object.fromEntries(rowsOf(facts(), options).map((row) => [row.category, row.line]));
		expect(lines(el)).toEqual({
			APPOINTMENT_UPDATES: 'Όταν ένα ραντεβού επιβεβαιώνεται, αλλάζει ή ακυρώνεται.',
			REMINDERS: 'Πριν από κάθε ραντεβού σας.',
			RATINGS: 'Η πρόσκληση να γράψετε κριτική για μια επίσκεψη και η απάντηση του γιατρού.',
			MESSAGES: 'Όταν ένας γιατρός σάς γράφει.',
			QUESTIONS: null,
			ACCOUNT: null
		});
		expect(lines(en)).toEqual({
			APPOINTMENT_UPDATES: 'When an appointment is confirmed, changed or cancelled.',
			REMINDERS: 'Before each of your appointments.',
			RATINGS: 'The invitation to review a visit, and the doctor’s reply.',
			MESSAGES: 'When a doctor writes to you.',
			QUESTIONS: null,
			ACCOUNT: null
		});
	});

	it('the summary of the owner’s table (`not.js:36-40`): what is on, in the server’s order; «Πάντα: …» for a kind of «Πάντα» alone', () => {
		const summaries = (given: NotificationPreferencesFacts, options: typeof el | typeof en = el) =>
			Object.fromEntries(rowsOf(given, options).map((row) => [row.category, row.summary]));
		expect(summaries(facts())).toEqual({
			APPOINTMENT_UPDATES: 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής',
			REMINDERS: 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής, SMS',
			RATINGS: 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής',
			MESSAGES: 'Ενεργό: Email, Ειδοποιήσεις εφαρμογής',
			QUESTIONS: 'Πάντα: Email',
			ACCOUNT: 'Πάντα: Email'
		});
		// Every switch off: «Αλλαγές» keeps its «Πάντα» email — «Ενεργό», never «Πάντα», for a kind that has a switch.
		expect(summaries(facts({ on: false }))).toEqual({
			APPOINTMENT_UPDATES: 'Ενεργό: Email',
			REMINDERS: 'Ανενεργό',
			RATINGS: 'Ανενεργό',
			MESSAGES: 'Ανενεργό',
			QUESTIONS: 'Πάντα: Email',
			ACCOUNT: 'Πάντα: Email'
		});
		expect(summaries(facts({ on: false }), en)).toMatchObject({
			APPOINTMENT_UPDATES: 'On: Email',
			REMINDERS: 'Off',
			QUESTIONS: 'Always: Email'
		});
		expect(summaries(facts(), en).REMINDERS).toBe('On: Email, App notifications, SMS');
	});

	it('the summary in every combination of a kind’s cells', () => {
		// One switch.
		expect(summaryOf([['EMAIL', 'TOGGLE', true]])).toBe('Ενεργό: Email');
		expect(summaryOf([['EMAIL', 'TOGGLE', false]])).toBe('Ανενεργό');
		// Two switches: both, either, none.
		expect(
			summaryOf([
				['EMAIL', 'TOGGLE', true],
				['PUSH', 'TOGGLE', true]
			])
		).toBe('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(
			summaryOf([
				['EMAIL', 'TOGGLE', false],
				['PUSH', 'TOGGLE', true]
			])
		).toBe('Ενεργό: Ειδοποιήσεις εφαρμογής');
		expect(
			summaryOf([
				['EMAIL', 'TOGGLE', true],
				['PUSH', 'TOGGLE', false]
			])
		).toBe('Ενεργό: Email');
		expect(
			summaryOf([
				['EMAIL', 'TOGGLE', false],
				['PUSH', 'TOGGLE', false]
			])
		).toBe('Ανενεργό');
		// «Πάντα» alone, one or more channels.
		expect(summaryOf([['EMAIL', 'ALWAYS', true]])).toBe('Πάντα: Email');
		expect(
			summaryOf([
				['EMAIL', 'ALWAYS', true],
				['SMS', 'ALWAYS', true]
			])
		).toBe('Πάντα: Email, SMS');
		// «Πάντα» beside a switch: «Ενεργό», with the switch on or off.
		expect(
			summaryOf([
				['EMAIL', 'ALWAYS', true],
				['PUSH', 'TOGGLE', true]
			])
		).toBe('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(
			summaryOf([
				['EMAIL', 'ALWAYS', true],
				['PUSH', 'TOGGLE', false]
			])
		).toBe('Ενεργό: Email');
		// The server's order of the channels, whatever it is.
		expect(
			summaryOf([
				['SMS', 'TOGGLE', true],
				['PUSH', 'TOGGLE', true],
				['EMAIL', 'TOGGLE', true]
			])
		).toBe('Ενεργό: SMS, Ειδοποιήσεις εφαρμογής, Email');
		// A switch the answer left undecided is not on.
		expect(summaryOf([['EMAIL', 'TOGGLE', null]])).toBe('Ανενεργό');
		// (negative) an «Πάντα» the answer says is off is not counted as on.
		expect(summaryOf([['EMAIL', 'ALWAYS', false]])).toBe('Ανενεργό');
	});

	it('🔴 record §5.5: `SET_BY_DOCTOR` δεν μετρά ως ανοιχτό — never in the summary, whatever the answer says of it; beside «Πάντα» the kind is «Ενεργό», alone it is «Ανενεργό»', () => {
		expect(
			summaryOf([
				['EMAIL', 'ALWAYS', true],
				['SMS', 'SET_BY_DOCTOR', null]
			])
		).toBe('Ενεργό: Email');
		expect(
			summaryOf([
				['EMAIL', 'TOGGLE', true],
				['SMS', 'SET_BY_DOCTOR', true]
			])
		).toBe('Ενεργό: Email');
		expect(summaryOf([['SMS', 'SET_BY_DOCTOR', true]])).toBe('Ανενεργό');
		expect(summaryOf([['SMS', 'SET_BY_DOCTOR', null]])).toBe('Ανενεργό');
		const row = rowsOf(kind('REMINDERS', [['SMS', 'SET_BY_DOCTOR', true]]))[0];
		expect(row?.cells[0]).toMatchObject({
			control: 'doctor',
			on: false,
			fixed: 'Ορίζει ο γιατρός'
		});
		expect(row?.canChange).toBe(false);
	});

	it('«Αλλαγή» only where the account has a switch: the four kinds of the table, never «Ερωτήσεις» or «Λογαριασμός και όροι»', () => {
		expect(Object.fromEntries(rowsOf(facts()).map((row) => [row.category, row.canChange]))).toEqual(
			{
				APPOINTMENT_UPDATES: true,
				REMINDERS: true,
				RATINGS: true,
				MESSAGES: true,
				QUESTIONS: false,
				ACCOUNT: false
			}
		);
		// It follows the answer, not the kind: «Λογαριασμός» with a switch has it, «Μηνύματα» of «Πάντα» alone has not.
		expect(rowsOf(kind('ACCOUNT', [['PUSH', 'TOGGLE', false]]))[0]?.canChange).toBe(true);
		expect(rowsOf(kind('MESSAGES', [['EMAIL', 'ALWAYS', true]]))[0]?.canChange).toBe(false);
	});

	it('🔴 D-W45-22: μόνο η πλευρά του ασθενή — a doctor’s account reads the same six rows; no kind, title or switch of the «DOCTOR» side (U-164.1)', () => {
		const doctor = buildNotificationGroups(facts({ withDoctor: true }), el);
		expect(doctor).toEqual(buildNotificationGroups(facts(), el));
		expect(JSON.stringify(doctor)).not.toMatch(/DOCTOR_/u);
		// (negative) the doctor's side alone — whatever it carries, a patient's kind included — is no row at all.
		const only = mapNotificationPreferences({
			sections: [
				{
					side: 'DOCTOR',
					categories: [
						{
							category: 'DOCTOR_MESSAGES',
							cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null }]
						},
						{
							category: 'MESSAGES',
							cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null }]
						}
					]
				}
			]
		});
		expect(buildNotificationGroups(only, el)).toEqual([]);
		// (negative) a doctor's kind sent on the patient's side has no name here, so no row: no code is drawn as a title.
		expect(
			rowsOf(kind('DOCTOR_RATINGS', [['EMAIL', 'TOGGLE', true]])).map((row) => row.category)
		).toEqual([]);
	});

	it('D-W45-22: a kind the server does not send has no row, and a group left with none is not drawn', () => {
		const some = mapNotificationPreferences({
			sections: [
				{
					side: 'PATIENT',
					categories: samplePreferencesView().sections[0].categories.filter((entry) =>
						['REMINDERS', 'ACCOUNT'].includes(entry.category)
					)
				}
			]
		});
		expect(
			buildNotificationGroups(some, el).map((group) => [
				group.id,
				group.rows.map((row) => row.category)
			])
		).toEqual([
			['appointments', ['REMINDERS']],
			['account', ['ACCOUNT']]
		]);
		expect(buildNotificationGroups({ sections: [] }, el)).toEqual([]);
		// A kind with no channel at all has nothing to say.
		expect(buildNotificationGroups(kind('RATINGS', []), el)).toEqual([]);
	});

	it('D-W45-22: είδος εκτός πίνακα μπαίνει στην τελευταία ομάδα — after that group’s own kinds, in the server’s order', () => {
		// The table without «Κριτικές» and «Ερωτήσεις»: both are kinds the page can name and the table does not list.
		const table = [
			{ id: 'appointments', categories: ['APPOINTMENT_UPDATES', 'REMINDERS'] },
			{ id: 'messages', categories: ['MESSAGES'] },
			{ id: 'account', categories: ['ACCOUNT'] }
		] as const;
		expect(
			buildNotificationGroups(facts(), el, table).map((group) => [
				group.id,
				group.rows.map((row) => row.category)
			])
		).toEqual([
			['appointments', ['APPOINTMENT_UPDATES', 'REMINDERS']],
			['messages', ['MESSAGES']],
			['account', ['ACCOUNT', 'RATINGS', 'QUESTIONS']]
		]);
		// The site's own table lists every kind the page can name: with it nothing is out of place.
		expect(notificationGroups.flatMap((group) => group.categories)).toEqual([
			'APPOINTMENT_UPDATES',
			'REMINDERS',
			'RATINGS',
			'MESSAGES',
			'QUESTIONS',
			'ACCOUNT'
		]);
	});

	it('(negative) a kind the answer names twice is ONE row (the first), never two rows of one switch', () => {
		const twice = mapNotificationPreferences({
			sections: [
				{
					side: 'PATIENT',
					categories: [
						{
							category: 'MESSAGES',
							cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: true, scope: null }]
						},
						{
							category: 'MESSAGES',
							cells: [{ channel: 'EMAIL', mode: 'TOGGLE', enabled: false, scope: null }]
						}
					]
				}
			]
		});
		expect(rowsOf(twice).map((row) => [row.category, row.summary])).toEqual([
			['MESSAGES', 'Ενεργό: Email']
		]);
	});

	it('a scope that is not the patient’s («Μόνο για νέα αιτήματα», the doctor’s) says nothing under the channel', () => {
		expect(
			rowsOf(kind('REMINDERS', [['SMS', 'TOGGLE', true, 'NEW_REQUESTS_ONLY']]))[0]?.cells[0]?.note
		).toBeNull();
	});
});

describe('modules/notifications/lib/preferences · a switch in its new place before the server answers (D-W45-24)', () => {
	it('moves the one cell it names and leaves every other as read; the summary behind follows', () => {
		const before = facts();
		const after = applyNotificationChanges(before, [
			{ category: 'REMINDERS', channel: 'SMS', enabled: false }
		]);
		expect(rowOf(after, 'REMINDERS')?.summary).toBe('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		expect(rowOf(after, 'RATINGS')?.summary).toBe('Ενεργό: Email, Ειδοποιήσεις εφαρμογής');
		// What was read is not written over.
		expect(rowOf(before, 'REMINDERS')?.summary).toBe('Ενεργό: Email, Ειδοποιήσεις εφαρμογής, SMS');
		expect(applyNotificationChanges(before, [])).toBe(before);
	});

	it('(negative) only a `TOGGLE` cell moves: «Πάντα», one the doctor decides, a channel the kind lacks or a kind the account lacks change nothing', () => {
		const before = facts();
		expect(
			applyNotificationChanges(before, [
				{ category: 'ACCOUNT', channel: 'EMAIL', enabled: false },
				{ category: 'APPOINTMENT_UPDATES', channel: 'EMAIL', enabled: false },
				{ category: 'APPOINTMENT_UPDATES', channel: 'SMS', enabled: true },
				{ category: 'RATINGS', channel: 'SMS', enabled: true },
				{ category: 'DOCTOR_MESSAGES', channel: 'EMAIL', enabled: false }
			])
		).toEqual(before);
	});
});
