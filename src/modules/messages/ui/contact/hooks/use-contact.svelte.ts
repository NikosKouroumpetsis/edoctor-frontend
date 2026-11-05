import { untrack } from 'svelte';
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import { goto } from '$app/navigation';
import { m } from '$paraglide/messages.js';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	doctorContactQuery,
	refreshInbox,
	startConversation,
	writeFirstMessageNote
} from '$modules/messages/api/conversations';
import { newClientMessageId } from '$modules/messages/lib/client-id';
import { readMessagingRefusal } from '$modules/messages/lib/refusals';
import type { ContactOptions } from '../types';

/**
 * 🔴 U-84.6 (screen 18): the press of «Επικοινωνήστε με τον γιατρό». The button needs nothing from the server to be drawn:
 * only its press asks (D-103), and only for a member, a guest signing in first (19, U-80.1 Ε4). Then: a conversation that
 * exists opens; a doctor who accepts none says so, with no field; else the #18. Its draft lives in this rune alone
 * (U-65.6): a refusal keeps it, a session that ended keeps it, a sign-out takes it. It lives at the screen, so what happens
 * to the profile beneath it (a member's read draws it anew) does not touch it.
 */
export function useContactDoctor(options: ContactOptions) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const words = () => ({ locale: options.locale() });

	let open = $state(false);
	let accepting = $state(true);
	let asking = $state(false);
	let discarding = $state(false);
	let draft = $state('');
	let line = $state<string | null>(null);
	// The same words keep their id, so «Αποστολή» pressed again after a failure never doubles.
	let attempt: { body: string; clientMessageId: string } | null = null;

	const toast = (message: string, danger = false) =>
		toasts?.show({ message, lift: options.lift, ...(danger ? { tone: 'danger' as const } : {}) });

	function forget() {
		open = false;
		accepting = true;
		discarding = false;
		draft = '';
		line = null;
		attempt = null;
	}

	async function press() {
		const doctor = options.doctor();
		if (!doctor || asking) return;
		if (!session?.isMember) {
			session?.requireSignIn({ action: 'contact', onSignedIn: () => void press() });
			return;
		}
		asking = true;
		try {
			const contact = await client.fetchQuery(doctorContactQuery(doctor.id));
			if (contact.conversationId) {
				// The screen's address, already resolved (a module knows no route).
				// eslint-disable-next-line svelte/no-navigation-without-resolve
				await goto(options.conversationHref(contact.conversationId));
				return;
			}
			if (!contact.acceptsNewConversations) {
				accepting = false;
				open = true;
				return;
			}
			// An account with no patient's profile writes to nobody: it says so, as the favourites' hearts, and it is no error.
			if (session.member?.hasPatientProfile === false) {
				toast(m.messages_toast_patients_only({}, words()));
				return;
			}
			accepting = true;
			open = true;
		} catch (error) {
			const refusal = readMessagingRefusal(error);
			if (refusal === 'session') {
				session.expire({ action: 'contact', onSignedIn: () => void press() });
			} else if (refusal === 'not-patient') {
				toast(m.messages_toast_patients_only({}, words()));
			} else {
				toast(m.messages_toast_contact_failed({}, words()), true);
			}
		} finally {
			asking = false;
		}
	}

	const sending = createMutation(() => ({
		// Without a network it fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: (input: { doctorId: string; body: string; clientMessageId: string }) =>
			startConversation(input),
		onSuccess: (answer) => {
			const doctor = options.doctor();
			writeFirstMessageNote(client, answer.conversationId, {
				name: doctor?.sentenceName ?? '',
				when: doctor?.responseWhen ?? null
			});
			refreshInbox(client);
			forget();
			// The screen's address, already resolved; it holds the id and no word of the message (U-84).
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			void goto(options.conversationHref(answer.conversationId));
		},
		onError: (error) => {
			const refusal = readMessagingRefusal(error);
			switch (refusal) {
				case 'session':
					// 🔴 U-84: the session ended under the page: the words stay; the sign-in asks again, and the #18 comes back.
					open = false;
					session?.expire({
						action: 'contact',
						onSignedIn: () => {
							open = true;
						}
					});
					return;
				case 'not-patient':
					toast(m.messages_toast_patients_only({}, words()));
					forget();
					return;
				case 'closed':
					accepting = false;
					return;
				case 'new-limit':
					line = m.messages_compose_new_limit({}, words());
					return;
				case 'send-limit':
					line = m.messages_rate({}, words());
					return;
				case 'duplicate':
					line = m.messages_duplicate({}, words());
					return;
				case 'blocked':
					line = m.messages_blocked_by({}, words());
					return;
				case 'pre-reply':
					line = m.messages_gate({ count: 3 }, words());
					return;
				case 'too-long':
					line = m.messages_too_long({}, words());
					return;
				case 'empty':
					line = m.messages_compose_empty({}, words());
					return;
				default:
					line = m.messages_compose_network({}, words());
			}
		}
	}));

	// U-80.1 Ε4: a press that went through `/login` or a provider's redirect goes on here, once.
	$effect(() => {
		if (session?.isMember && session.takeResumed('contact')) untrack(() => void press());
	});

	// R-9: the screen stays from one doctor's profile to another's, and so would this: the words of one doctor never reach
	// another's window (they may be about one's health).
	let doctorId = untrack(() => options.doctor()?.id);
	$effect(() => {
		const id = options.doctor()?.id;
		if (!id || id === doctorId) return;
		const another = doctorId !== undefined;
		doctorId = id;
		if (another) untrack(forget);
	});

	// 🔴 U-65.6: a sign-out or another account takes the draft with it.
	let seen = untrack(() => session?.forgotten ?? 0);
	$effect(() => {
		const forgotten = session?.forgotten ?? 0;
		if (forgotten === seen) return;
		seen = forgotten;
		untrack(forget);
	});

	return {
		get open() {
			return open;
		},
		get accepting() {
			return accepting;
		},
		/** The press is asking the server. */
		get asking() {
			return asking;
		},
		get discarding() {
			return discarding;
		},
		get sending() {
			return sending.isPending;
		},
		get draft() {
			return draft;
		},
		set draft(next: string) {
			draft = next;
			line = null;
		},
		get line() {
			return line;
		},
		press: () => void press(),
		send() {
			const doctor = options.doctor();
			const body = draft.trim();
			if (!doctor || !body || sending.isPending) return;
			if (!attempt || attempt.body !== body) {
				attempt = { body, clientMessageId: newClientMessageId() };
			}
			line = null;
			sending.mutate({ doctorId: doctor.id, ...attempt });
		},
		/** × , Escape, the backdrop: with words in the field it asks first (Π3). */
		requestClose() {
			if (accepting && draft.trim().length > 0) {
				discarding = true;
				return;
			}
			open = false;
		},
		keepWriting() {
			discarding = false;
		},
		discard: forget
	};
}

export type ContactFlow = ReturnType<typeof useContactDoctor>;
