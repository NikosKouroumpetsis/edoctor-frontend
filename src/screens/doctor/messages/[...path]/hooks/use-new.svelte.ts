import { doctorPatientConversationFacts } from '$modules/doctor-dashboard/lib/patients';
import { useDoctorPatientCard } from '$modules/doctor-dashboard/ui/patient';
import type { DoctorConversationTarget } from '$modules/messages/types';
import type { InboxFreshPatient } from '$modules/messages/ui/inbox';

/**
 * 🔴 U-193.1 (D-W51-87; the application's `new` screen): a conversation the doctor starts — the patient read as screen
 * 73's card reads it (the same `404` for anyone not the doctor's, D-W51-63), composed here into what the messages draw
 * (a module never imports another): the account that will hold it, the appointment it is about, the conversation the
 * card already names (it then opens in this page's place). A card with no account is no patient to write to.
 */
export function useDoctorMessagesNew(options: {
	target: () => DoctorConversationTarget;
	cardHref: () => string;
}) {
	const read = useDoctorPatientCard({ patientKey: options.target });
	const facts = $derived(read.card ? doctorPatientConversationFacts(read.card) : null);
	const patient = $derived.by((): InboxFreshPatient => {
		const state = read.state === 'ready' ? (facts ? 'ready' : 'missing') : read.state;
		return {
			target: options.target(),
			state,
			name: facts?.name ?? '',
			line: facts?.line ?? null,
			conversationId: facts?.conversationId ?? null,
			cardHref: options.cardHref(),
			retry: () => read.retry()
		};
	});
	return {
		get patient() {
			return patient;
		}
	};
}
