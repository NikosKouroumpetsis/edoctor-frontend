import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import { isPlainClick } from '$shared/lib/navigation';
import { getSessionOptional } from '$shared/state/session';
import {
	changeAppointment,
	readAppointmentChangeFailure,
	storeAppointmentDetail,
	type AppointmentChangeRequest
} from '$modules/appointments/api/appointment';
import { appointmentsQueryKeys } from '$modules/appointments/api/keys';
import {
	changeRefusalRereads,
	readChangeOutcome,
	type ChangeOutcome
} from '$modules/appointments/lib/change';
import type { AppointmentDone } from '$modules/appointments/lib/detail';
import { useAppointmentSteps } from '$modules/appointments/ui/change-screen';
import { getAppointmentsMemoryOptional } from '$modules/appointments/ui/memory';
import type { AppointmentChangeProps } from '../types';

/**
 * What every screen of 52 shares (P-W4 §4.3, §3.6): the ONE write (`PATCH`, sent by «Αποθήκευση», U-136.3) and what
 * follows it — the answer becomes the appointment's page at once and every list is read again, the green notice is
 * remembered by the page (D-W4-33: never the address) and the screen goes back to the appointment (U-136.6), so the
 * browser's «back» never opens the form again. A refusal is read in the screen's terms (`readChangeOutcome`): the
 * session opens the sign-in over the screen (what was chosen stays); every other answer is the screen's to say while
 * the patient STAYS with what was chosen, and the appointment is read again (🔴 D-W4-37: a screen no longer allowed then
 * gives way to the 51 by its own guard; never a silent way back while the change is still allowed).
 */
export function useAppointmentChange(props: () => AppointmentChangeProps) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const memory = getAppointmentsMemoryOptional();
	const steps = useAppointmentSteps();
	const appointmentHref = () => props().links.appointment(props().appointment.id);
	const leave = () => steps.leave(appointmentHref());
	const reread = () =>
		void client.invalidateQueries({
			queryKey: appointmentsQueryKeys.detail(props().appointment.id)
		});

	type Write = {
		request: AppointmentChangeRequest;
		done: AppointmentDone;
		onRefused?: (outcome: ChangeOutcome) => void;
	};

	const write = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: ({ request }: Write) => changeAppointment(props().appointment.id, request),
		onSuccess: (answer, { done, onRefused }) => {
			if (!answer) {
				reread();
				onRefused?.({
					kind: 'refused',
					message: m.appointments_change_failed({}, { locale: props().locale })
				});
				return;
			}
			memory?.remember(answer.id, done);
			void storeAppointmentDetail(client, answer);
			leave();
		},
		onError: (error, { onRefused }) => {
			const outcome = readChangeOutcome(readAppointmentChangeFailure(error), props().locale);
			// 🔴 U-84: the session ended under the screen; the sign-in opens over it, the choice stays.
			if (outcome.kind === 'session') session?.expire({});
			if (changeRefusalRereads(outcome)) reread();
			onRefused?.(outcome);
		}
	}));

	return {
		steps,
		get pending() {
			return write.isPending;
		},
		/** «Αποθήκευση»: one write at a time (a second press is cut, P-W4 §7). */
		send(request: AppointmentChangeRequest, done: AppointmentDone, onRefused?: Write['onRefused']) {
			if (write.isPending) return;
			write.mutate({ request, done, onRefused });
		},
		/** «Άκυρο» and a save: back to the appointment, the steps that were opened (else the appointment in place). */
		leave,
		/** «←»: the link's own way with a modifier, else back to the appointment. */
		back(event: MouseEvent) {
			if (!isPlainClick(event)) return;
			event.preventDefault();
			leave();
		},
		get appointmentHref() {
			return appointmentHref();
		}
	};
}

export type AppointmentChange = ReturnType<typeof useAppointmentChange>;
