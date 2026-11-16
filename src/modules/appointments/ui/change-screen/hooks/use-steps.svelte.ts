import { useHistorySteps } from '$shared/lib/navigation';

/** The patient's flows that count their steps in the history (`App.PageState`): an appointment's, the relatives'. */
export type AppointmentStepsFlow = 'appointment' | 'relatives';

/**
 * 🔴 U-102 / U-136 / U-137 (D-W3-31, P-W4 §3.6): every screen an appointment opens — «Αλλαγή», the cancellation — is a
 * page of its own in the history, opened from the appointment one step on (`page.state.appointment.depth` 1) or from
 * another of them (2: «Θέλετε απλώς άλλη ώρα;», «Προσθήκη συγγενή»); leaving it goes back exactly those steps — the
 * shared `useHistorySteps` (D-W51-50). Screen 55 (U-139) counts a relative's form the same way, under its own key.
 */
export function useAppointmentSteps(flow: AppointmentStepsFlow = 'appointment') {
	return useHistorySteps(flow);
}
