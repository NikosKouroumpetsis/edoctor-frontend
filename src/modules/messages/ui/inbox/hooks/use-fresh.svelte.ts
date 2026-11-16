import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { getSessionOptional } from '$shared/state/session';
import { refreshInbox, startDoctorConversation } from '$modules/messages/api/conversations';
import { newClientMessageId } from '$modules/messages/lib/client-id';
import { readMessagingRefusal } from '$modules/messages/lib/refusals';
import type { DoctorConversationTarget } from '$modules/messages/types';

type FirstMessage = { clientMessageId: string; body: string };

/**
 * 🔴 U-193.1 (D-W51-87): a conversation the doctor starts — its first message goes to `POST /messaging/doctor/conversations`
 * with the patient's key, and the conversation the server answers takes this page's place (`onStarted`, a replace). The
 * words stay in the field until then, and in this page's memory only (U-84). The same words keep the same id, so a retry
 * never doubles (#18); a refusal says why, in the field's line, with the 21's words where it has them.
 */
export function useFresh(options: {
	target: () => DoctorConversationTarget;
	locale: () => SupportedLocale;
	onStarted: (conversationId: string) => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const words = $derived({ locale: options.locale() });

	let draft = $state('');
	let line = $state<string | null>(null);
	let last: FirstMessage | null = null;

	const mutation = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: (message: FirstMessage) => startDoctorConversation(options.target(), message),
		onSuccess: (answer) => {
			refreshInbox(client);
			options.onStarted(answer.conversationId);
		},
		onError: (error) => refused(error)
	}));

	function refused(error: unknown) {
		switch (readMessagingRefusal(error)) {
			case 'session':
				// 🔴 U-84: the session ended under the page: the words stay in the field and it asks for the sign-in.
				line = null;
				session?.expire({ onSignedIn: () => send() });
				return;
			case 'gone':
				line = m.doctor_patients_missing({}, words);
				return;
			case 'blocked':
				line = m.messages_blocked_by({}, words);
				return;
			case 'new-limit':
				line = m.messages_doctor_new_limit({}, words);
				return;
			case 'send-limit':
				line = m.messages_rate({}, words);
				return;
			case 'duplicate':
				line = m.messages_doctor_duplicate({}, words);
				return;
			case 'too-long':
				line = m.messages_too_long({}, words);
				return;
			case 'empty':
				line = m.messages_compose_empty({}, words);
				return;
			default:
				line = m.messages_compose_network({}, words);
		}
	}

	function send() {
		const body = draft.trim();
		if (!body || mutation.isPending) return;
		const message: FirstMessage =
			last && last.body === body ? last : { clientMessageId: newClientMessageId(), body };
		last = message;
		line = null;
		mutation.mutate(message);
	}

	return {
		get draft() {
			return draft;
		},
		set draft(next: string) {
			draft = next;
		},
		/** Why the first message was refused, in the field's line; `null` while nothing is wrong. */
		get line() {
			return line;
		},
		get sending() {
			return mutation.isPending;
		},
		send,
		/** Typing again clears the last refusal's line. */
		typed() {
			line = null;
		}
	};
}
