import type { QueryClient } from '@tanstack/svelte-query';
import type {
	NotificationChannel,
	NotificationPreferenceCategory,
	NotificationPreferencesView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';

const PATH = '/notification/preferences/me';

/**
 * 🔴 Wave 4.5 · screen 60 (card w45-w3): the centre of one account (`GET` / `PUT /notification/preferences/me`, D-132)
 * has TWO readers on the site — «Ρυθμίσεις μηνυμάτων» of the inbox and «Ειδοποιήσεις» of the account's settings — and a
 * module never imports another. So its ONE read, its ONE write and its ONE place in TanStack's cache live here: a
 * switch flipped on either page is the other's at once. The cache keeps the server's answer as it came; each module's
 * `api/` builds its own query on this key and this read — with its `select` (its own facts, the only thing that
 * leaves its `api/`) and the sign-out's mark said in its own file (🔴 U-84, U-65.6: `meta: personalQueryMeta`).
 */
export const notificationPreferencesKey = ['notification-preferences'] as const;

/** One switch of the centre in its new place: a `TOGGLE` cell named by its kind and its channel. */
export type NotificationPreferenceCellWrite = {
	category: NotificationPreferenceCategory;
	channel: NotificationChannel;
	enabled: boolean;
};

/** The read, with the cookies (`GET /notification/preferences/me`): the server's answer, for a module's `queryFn`. */
export function getNotificationPreferences(
	signal?: AbortSignal
): Promise<NotificationPreferencesView> {
	return httpSessionGet<NotificationPreferencesView>(PATH, { signal });
}

/**
 * The write — a patch: only the cells it names change, the rest of the centre keeps its values — and the server's
 * answer put back where every reader finds it. The key is marked first, so an answer that lands after a sign-out is
 * still the sign-out's to take (review w3-w2 R1 MAJOR-1, the inbox's N-4).
 */
export async function saveNotificationPreferences(
	client: QueryClient,
	cells: readonly NotificationPreferenceCellWrite[]
): Promise<void> {
	const view = await httpSessionPut<NotificationPreferencesView>(PATH, { body: { cells } });
	client.setQueryDefaults(notificationPreferencesKey, { meta: personalQueryMeta });
	client.setQueryData<NotificationPreferencesView>(notificationPreferencesKey, view);
}

/**
 * The cells in their new place BEFORE the server answers, for a page that shows a press at once from the cache: it
 * answers the way back (what was read before), for a write the server refuses. Only a `TOGGLE` cell moves; with
 * nothing read yet nothing is written and the way back does nothing.
 */
export function previewNotificationPreferences(
	client: QueryClient,
	cells: readonly NotificationPreferenceCellWrite[]
): () => void {
	const before = client.getQueryData<NotificationPreferencesView>(notificationPreferencesKey);
	if (!before) return () => undefined;
	const moved = new Map(cells.map((cell) => [`${cell.category}:${cell.channel}`, cell.enabled]));
	client.setQueryDefaults(notificationPreferencesKey, { meta: personalQueryMeta });
	client.setQueryData<NotificationPreferencesView>(notificationPreferencesKey, {
		...before,
		sections: before.sections.map((section) => ({
			...section,
			categories: section.categories.map((entry) => ({
				...entry,
				cells: entry.cells.map((cell) => {
					const enabled = moved.get(`${entry.category}:${cell.channel}`);
					return enabled !== undefined && cell.mode === 'TOGGLE' ? { ...cell, enabled } : cell;
				})
			}))
		}))
	});
	return () => {
		client.setQueryData<NotificationPreferencesView>(notificationPreferencesKey, before);
	};
}
