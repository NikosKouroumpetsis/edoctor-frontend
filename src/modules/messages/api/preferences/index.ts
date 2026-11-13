import type { QueryClient } from '@tanstack/svelte-query';
import type {
	NotificationChannel,
	NotificationPreferenceCategory,
	NotificationPreferencesView
} from '$shared/lib/api-client';
import {
	getNotificationPreferences,
	notificationPreferencesKey,
	previewNotificationPreferences,
	saveNotificationPreferences
} from '$shared/lib/notification-preferences';
import { personalQueryMeta } from '$shared/query';

// U-84.4: the two categories of the messages: a patient's, and a doctor's on an account that is one.
const MESSAGE_CATEGORIES: readonly NotificationPreferenceCategory[] = [
	'MESSAGES',
	'DOCTOR_MESSAGES'
];

/**
 * Wave 4.5 (card w45-w3): the centre's ONE place in the cache, shared with «Ειδοποιήσεις» of the account's settings
 * (`$shared/lib/notification-preferences`) — a switch flipped there is this sheet's at once, and the other way round.
 */
export const messagePreferencesKey = notificationPreferencesKey;

/** A switch of «Ρυθμίσεις μηνυμάτων»: on, and the cells it writes; `null` where the account has none to decide. */
export type MessageSwitch = {
	enabled: boolean;
	cells: readonly { category: NotificationPreferenceCategory; channel: NotificationChannel }[];
};
export type MessagePreferences = { push: MessageSwitch | null; email: MessageSwitch | null };

/** One switch for what is one thing to a person: every category of the messages the account holds, on that channel. */
function switchOf(
	view: NotificationPreferencesView,
	channel: NotificationChannel
): MessageSwitch | null {
	const cells = view.sections
		.flatMap((section) => section.categories)
		.filter((entry) => MESSAGE_CATEGORIES.includes(entry.category))
		.flatMap((entry) =>
			entry.cells
				.filter((cell) => cell.channel === channel && cell.mode === 'TOGGLE')
				.map((cell) => ({ category: entry.category, channel, enabled: cell.enabled === true }))
		);
	if (cells.length === 0) return null;
	return {
		enabled: cells.some((cell) => cell.enabled),
		cells: cells.map(({ category, channel: on }) => ({ category, channel: on }))
	};
}

function mapPreferences(view: NotificationPreferencesView): MessagePreferences {
	return { push: switchOf(view, 'PUSH'), email: switchOf(view, 'EMAIL') };
}

const cellsOf = (target: MessageSwitch, enabled: boolean) =>
	target.cells.map((cell) => ({ ...cell, enabled }));

/** The sheet's two switches: read when it opens, never before; 🔴 U-84: personal, gone at a sign-out. */
export function messagePreferencesQuery(enabled: boolean) {
	return {
		queryKey: messagePreferencesKey,
		queryFn: ({ signal }: { signal?: AbortSignal }) => getNotificationPreferences(signal),
		select: mapPreferences,
		enabled,
		retry: false,
		meta: personalQueryMeta
	};
}

/** The switch in its new place at the press; it answers the way back, for a write the server refuses. */
export function previewMessagePreference(
	client: QueryClient,
	target: MessageSwitch,
	enabled: boolean
): () => void {
	return previewNotificationPreferences(client, cellsOf(target, enabled));
}

/** A patch: only the cells of this switch, the rest of the centre keeps its values; the answer goes to the cache. */
export function updateMessagePreference(
	client: QueryClient,
	target: MessageSwitch,
	enabled: boolean
): Promise<void> {
	return saveNotificationPreferences(client, cellsOf(target, enabled));
}
