/**
 * Tests only: the centre of a patient's account as the server answers it (`GET /notification/preferences/me`), the
 * owner's table of D-132 (record §5.5) — six kinds in the SERVER's order («Ερωτήσεις» before «Μηνύματα»), every switch on.
 * A doctor's account has the second section too (`withDoctor`). No person's facts.
 */
type SampleCell = { channel: string; mode: string; enabled: boolean | null; scope: string | null };

const cell = (
	channel: string,
	mode: string,
	enabled: boolean | null,
	scope: string | null = null
): SampleCell => ({ channel, mode, enabled, scope });

export function samplePreferencesView(
	options: {
		/** Every switch of the patient's side in this place (`true`). */
		on?: boolean;
		/** One switch in another place: `{ 'REMINDERS:SMS': false }`. */
		set?: Record<string, boolean>;
		withDoctor?: boolean;
	} = {}
) {
	const on = options.on ?? true;
	const toggle = (category: string, channel: string, scope: string | null = null) =>
		cell(channel, 'TOGGLE', options.set?.[`${category}:${channel}`] ?? on, scope);
	const patient = {
		side: 'PATIENT',
		categories: [
			{
				category: 'APPOINTMENT_UPDATES',
				cells: [
					cell('EMAIL', 'ALWAYS', true),
					toggle('APPOINTMENT_UPDATES', 'PUSH'),
					cell('SMS', 'SET_BY_DOCTOR', null)
				]
			},
			{
				category: 'REMINDERS',
				cells: [
					toggle('REMINDERS', 'EMAIL'),
					toggle('REMINDERS', 'PUSH'),
					toggle('REMINDERS', 'SMS', 'WHEN_DOCTOR_OFFERS')
				]
			},
			{ category: 'RATINGS', cells: [toggle('RATINGS', 'EMAIL'), toggle('RATINGS', 'PUSH')] },
			{ category: 'QUESTIONS', cells: [cell('EMAIL', 'ALWAYS', true)] },
			{ category: 'MESSAGES', cells: [toggle('MESSAGES', 'EMAIL'), toggle('MESSAGES', 'PUSH')] },
			{ category: 'ACCOUNT', cells: [cell('EMAIL', 'ALWAYS', true)] }
		]
	};
	const doctor = {
		side: 'DOCTOR',
		categories: [
			{
				category: 'DOCTOR_NEW_APPOINTMENTS',
				cells: [
					cell('EMAIL', 'TOGGLE', true),
					cell('PUSH', 'TOGGLE', true),
					cell('SMS', 'TOGGLE', false, 'NEW_REQUESTS_ONLY')
				]
			},
			{
				category: 'DOCTOR_RATINGS',
				cells: [cell('EMAIL', 'TOGGLE', true), cell('PUSH', 'TOGGLE', true)]
			},
			{
				category: 'DOCTOR_MESSAGES',
				cells: [cell('EMAIL', 'TOGGLE', true), cell('PUSH', 'TOGGLE', true)]
			},
			{ category: 'DOCTOR_ACCOUNT', cells: [cell('EMAIL', 'ALWAYS', true)] }
		]
	};
	return { updatedAt: null, sections: options.withDoctor ? [patient, doctor] : [patient] };
}
