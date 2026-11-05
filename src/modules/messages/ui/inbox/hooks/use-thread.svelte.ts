import { untrack } from 'svelte';
import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { m } from '$paraglide/messages.js';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import { readServerNow } from '$shared/lib/server-clock';
import { ApiError } from '$shared/lib/http';
import { getSessionOptional } from '$shared/state/session';
import { getToastsOptional } from '$shared/ui/molecules/toast';
import {
	appendToThread,
	downloadConversationCopy,
	loadOlderMessages,
	markConversationRead,
	patchConversation,
	patchThreadState,
	readCachedUnread,
	readFirstMessageNote,
	refreshInbox,
	reportMessage,
	sendThreadMessage,
	setConversationArchived,
	setConversationBlocked,
	threadQuery
} from '$modules/messages/api/conversations';
import { newClientMessageId } from '$modules/messages/lib/client-id';
import { readMessagingRefusal } from '$modules/messages/lib/refusals';
import { conversationCopyName, saveTextFile } from '$modules/messages/lib/save-file';
import { messageDay } from '$modules/messages/lib/time';
import type { ThreadEntry } from '$modules/messages/lib/thread';
import type { MessageReportReason } from '$modules/messages/types';
import type { LocalMessage, ThreadMemory } from '$modules/messages/ui/inbox-memory';
import { usePageShown } from './use-page-shown.svelte';

/**
 * U-84 Π2: one open conversation: its read and its poll (5 s, only for a member and only while the page shows), what is
 * sent, what is read, and its actions. Nothing here reaches an address, a storage or a log but the request itself.
 */
export function useThread(options: {
	conversationId: () => string;
	locale: () => SupportedLocale;
	memory: () => ThreadMemory;
	enabled: () => boolean;
	onArchived: () => void;
}) {
	const client = useQueryClient();
	const session = getSessionOptional();
	const toasts = getToastsOptional();
	const shown = usePageShown();
	const memory = $derived(options.memory());

	const conversationId = $derived(options.conversationId());
	const locale = $derived(options.locale());
	const words = $derived({ locale });

	const query = createQuery(() => threadQuery(client, conversationId, locale, options.enabled()));
	const data = $derived(options.enabled() ? query.data : undefined);

	const gone = $derived(query.error instanceof ApiError && query.error.status === 404);
	const failed = $derived(!gone && query.isError && data === undefined);

	// What the server has, then what is still leaving this page.
	const entries = $derived.by((): ThreadEntry[] => {
		const stored = (data?.items ?? []).map(
			(message): ThreadEntry => ({
				key: message.clientMessageId ?? message.id,
				id: message.id,
				body: message.body,
				mine: message.mine,
				at: Date.parse(message.sentAt),
				status: 'sent'
			})
		);
		const storedKeys = stored.map((entry) => entry.key);
		const leaving = memory
			.localOf(conversationId)
			.filter((message) => !storedKeys.includes(message.clientMessageId))
			.map(
				(message): ThreadEntry => ({
					key: message.clientMessageId,
					id: null,
					body: message.body,
					mine: true,
					at: message.at,
					status: message.status
				})
			);
		return [...stored, ...leaving];
	});

	const newestReceived = $derived(data?.items.findLast((message) => !message.mine)?.id ?? null);
	const lastReceived = $derived(entries.findLast((entry) => !entry.mine && entry.id) ?? null);

	const readMutation = createMutation(() => ({
		mutationFn: (upToMessageId: string) => markConversationRead(conversationId, upToMessageId),
		onSuccess: (answer) => {
			patchConversation(client, conversationId, { unreadCount: answer.unreadCount });
			refreshInbox(client);
		}
	}));

	// Read only what someone can see: the open conversation of a page that shows. Opening one with nothing unread writes
	// nothing; what arrives after it does.
	let marked: string | null = null;
	let firstLook = true;
	$effect(() => {
		const id = newestReceived;
		if (!id || !shown.current || id === marked) return;
		untrack(() => {
			marked = id;
			const unread = readCachedUnread(client, conversationId);
			const nothingNew = firstLook && unread === 0;
			firstLook = false;
			if (!nothingNew) readMutation.mutate(id);
		});
	});

	const sendMutation = createMutation(() => ({
		// Without a network the send fails at once and says so, rather than waiting for one unseen.
		networkMode: 'always' as const,
		mutationFn: (message: LocalMessage) =>
			sendThreadMessage(conversationId, {
				clientMessageId: message.clientMessageId,
				body: message.body
			}),
		// On the mutation, not on the call: two sends in a row both hear their answers.
		onSuccess: (answer, message) => {
			appendToThread(client, conversationId, locale, answer.message);
			memory.drop(message.clientMessageId);
			refreshInbox(client);
		},
		onError: (error, message) => refused(message, error)
	}));

	function refused(message: LocalMessage, error: unknown) {
		const refusal = readMessagingRefusal(error);
		switch (refusal) {
			case 'session':
				// 🔴 U-84: the session ended under the page: the words stay in the field and it asks for the sign-in again.
				memory.takeBack(message.clientMessageId, null);
				session?.expire();
				return;
			case 'send-limit':
				memory.takeBack(message.clientMessageId, m.messages_rate({}, words));
				return;
			case 'duplicate':
				memory.takeBack(message.clientMessageId, m.messages_duplicate({}, words));
				return;
			case 'too-long':
				memory.takeBack(message.clientMessageId, m.messages_too_long({}, words));
				return;
			case 'empty':
				memory.takeBack(message.clientMessageId, m.messages_compose_empty({}, words));
				return;
			case 'blocked':
			case 'pre-reply':
			case 'closed':
				// The conversation's own state says it, in the place of the field.
				memory.takeBack(message.clientMessageId, null);
				void query.refetch();
				return;
			default:
				memory.setStatus(message.clientMessageId, 'failed');
		}
	}

	function deliver(message: LocalMessage) {
		memory.setStatus(message.clientMessageId, 'pending');
		sendMutation.mutate(message);
	}

	const olderMutation = createMutation(() => ({
		mutationFn: () => loadOlderMessages(client, conversationId, locale)
	}));

	const archiveMutation = createMutation(() => ({
		mutationFn: (archived: boolean) => setConversationArchived(conversationId, archived),
		onSuccess: (answer) => {
			patchThreadState(client, conversationId, locale, { archived: answer.archived });
			refreshInbox(client);
			toasts?.show({
				message: answer.archived
					? m.messages_toast_archived({}, words)
					: m.messages_toast_unarchived({}, words)
			});
			options.onArchived();
		},
		onError: (error, archived) => {
			if (!sessionEnded(error, () => archiveMutation.mutate(archived))) failedToast();
		}
	}));

	const blockMutation = createMutation(() => ({
		mutationFn: (blocked: boolean) => setConversationBlocked(conversationId, blocked),
		onSuccess: (answer) => {
			patchThreadState(client, conversationId, locale, {
				blockedByMe: answer.blockedByMe,
				blockedByOther: answer.blockedByOther
			});
			refreshInbox(client);
		},
		onError: (error, blocked) => {
			if (!sessionEnded(error, () => blockMutation.mutate(blocked))) failedToast();
		}
	}));

	const reportMutation = createMutation(() => ({
		mutationFn: (input: { messageId: string; reason: MessageReportReason }) =>
			reportMessage(input.messageId, input.reason),
		onSuccess: () => toasts?.show({ message: m.messages_toast_reported({}, words) }),
		onError: (error, input) => {
			if (sessionEnded(error, () => reportMutation.mutate(input))) return;
			const refusal = readMessagingRefusal(error);
			if (refusal === 'already-reported') {
				toasts?.show({ message: m.messages_toast_already_reported({}, words) });
			} else if (refusal === 'report-limit') {
				toasts?.show({ tone: 'danger', message: m.messages_toast_report_limit({}, words) });
			} else failedToast();
		}
	}));

	const copyMutation = createMutation(() => ({
		mutationFn: () => downloadConversationCopy(conversationId),
		onSuccess: (file) => {
			saveTextFile(file, conversationCopyName(messageDay(readServerNow())));
			toasts?.show({ message: m.messages_toast_copied({}, words) });
		},
		onError: (error) => {
			if (sessionEnded(error, () => copyMutation.mutate())) return;
			if (readMessagingRefusal(error) === 'export-limit') {
				toasts?.show({ tone: 'danger', message: m.messages_toast_copy_limit({}, words) });
			} else failedToast();
		}
	}));

	function failedToast() {
		toasts?.show({ tone: 'danger', message: m.messages_toast_failed({}, words) });
	}

	/** R-5: an action refused with `401`: the session has ended: the sign-in opens, and the action goes on after it. */
	function sessionEnded(error: unknown, again: () => void): boolean {
		if (readMessagingRefusal(error) !== 'session') return false;
		session?.expire({ onSignedIn: again });
		return true;
	}

	return {
		get conversation() {
			return data;
		},
		get loading() {
			return options.enabled() && data === undefined && !failed && !gone;
		},
		get failed() {
			return failed;
		},
		get gone() {
			return gone;
		},
		get entries() {
			return entries;
		},
		get hasOlder() {
			return data?.hasMore ?? false;
		},
		get loadingOlder() {
			return olderMutation.isPending;
		},
		/** The last message received: what «Αναφορά» of the menu points at. */
		get lastReceived() {
			return lastReceived;
		},
		/** The note of the #18, while the doctor has not answered yet. */
		get firstNote() {
			if (data?.side !== 'patient' || newestReceived) return undefined;
			return readFirstMessageNote(client, conversationId);
		},
		retry: () => void query.refetch(),
		loadOlder: () => olderMutation.mutateAsync(),
		send() {
			const body = memory.draft.trim();
			if (!body) return;
			memory.draft = '';
			memory.line = null;
			const message: LocalMessage = {
				clientMessageId: newClientMessageId(),
				body,
				at: readServerNow(),
				status: 'pending'
			};
			memory.addLocal(message);
			deliver(message);
		},
		/** «Δοκιμάστε ξανά»: the same id, so the server keeps one. */
		resend(clientMessageId: string) {
			const message = memory
				.localOf(conversationId)
				.find((entry) => entry.clientMessageId === clientMessageId);
			if (message) deliver(message);
		},
		setArchived: (archived: boolean) => archiveMutation.mutate(archived),
		setBlocked: (blocked: boolean) => blockMutation.mutate(blocked),
		report: (messageId: string, reason: MessageReportReason) =>
			reportMutation.mutate({ messageId, reason }),
		copy: () => copyMutation.mutate()
	};
}

export type ThreadController = ReturnType<typeof useThread>;
