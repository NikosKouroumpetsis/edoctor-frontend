import type {
	NotificationChannel,
	NotificationPreferenceCategory,
	NotificationPreferencesView
} from '$shared/lib/api-client';
import { httpSessionGet, httpSessionPut } from '$shared/lib/http';
import { personalQueryMeta } from '$shared/query';

const PATH = '/notification/preferences/me';
// U-84.4: the two categories of the messages: a patient's, and a doctor's on an account that is one.
const MESSAGE_CATEGORIES: readonly NotificationPreferenceCategory[] = [
	'MESSAGES',
	'DOCTOR_MESSAGES'
];

export const messagePreferencesKey = ['messages', 'preferences'] as const;

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

/** The sheet's two switches: read when it opens, never before. */
export function messagePreferencesQuery(enabled: boolean) {
	return {
		queryKey: messagePreferencesKey,
		queryFn: ({ signal }: { signal?: AbortSignal }) =>
			httpSessionGet<NotificationPreferencesView>(PATH, { signal }).then(mapPreferences),
		enabled,
		retry: false,
		meta: personalQueryMeta
	};
}

/** A patch: only the cells of this switch, the rest of the centre keeps its values. */
export function updateMessagePreference(
	target: MessageSwitch,
	enabled: boolean
): Promise<MessagePreferences> {
	return httpSessionPut<NotificationPreferencesView>(PATH, {
		body: { cells: target.cells.map((cell) => ({ ...cell, enabled })) }
	}).then(mapPreferences);
}
