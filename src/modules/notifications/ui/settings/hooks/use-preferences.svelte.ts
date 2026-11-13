import { createQuery, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type { SupportedLocale } from '$shared/preferences/i18n/locales';
import {
	notificationPreferencesQuery,
	readNotificationPreferenceFailure,
	saveNotificationPreference,
	type NotificationPreferenceChange,
	type NotificationPreferenceFailure
} from '$modules/notifications/api/preferences';
import {
	applyNotificationChanges,
	buildNotificationGroups
} from '$modules/notifications/lib/preferences';
import type { NotificationPendingSwitch, NotificationSettingsView } from '../types';

/**
 * Screen 60 (record §5.5): the account's centre — read in the browser for a member only (U-80.1 Ε6: the page's server
 * knows nobody), gone at a sign-out — as the page's three groups, and its switches. 🔴 D-W45-24: every press is ONE
 * write of that one cell; the switch moves at the press and holds its new place while its writes are out, then the
 * server's answer takes over; a refused write puts it back and calls `onFailed`.
 */
export function useNotificationPreferences(options: {
	enabled: () => boolean;
	locale: () => SupportedLocale;
	offline: () => boolean;
	onFailed: (failure: NotificationPreferenceFailure) => void;
}) {
	const client = useQueryClient();
	const read = createQuery(() => ({
		...notificationPreferencesQuery(),
		enabled: browser && options.enabled()
	}));
	let pending = $state<Record<string, NotificationPendingSwitch>>({});

	const facts = $derived(
		options.enabled() && read.data
			? applyNotificationChanges(read.data, Object.values(pending))
			: null
	);
	const groups = $derived(
		facts ? buildNotificationGroups(facts, { locale: options.locale() }) : []
	);
	const view = $derived.by((): NotificationSettingsView => {
		// An answer with no kind to show (a broken one) is told as a failure, never as an empty page.
		if (facts) return groups.length > 0 ? 'ready' : 'failed';
		if (read.isError || options.offline()) return 'failed';
		return 'loading';
	});

	/** One write of a cell came back: the cell is the server's again once none of its writes is still out. */
	function settle(cell: string) {
		const entry = pending[cell];
		if (!entry) return;
		pending =
			entry.writes > 1
				? { ...pending, [cell]: { ...entry, writes: entry.writes - 1 } }
				: Object.fromEntries(Object.entries(pending).filter(([key]) => key !== cell));
	}

	return {
		get view() {
			return view;
		},
		/** The three groups with what is on right now, the reader's own presses included. */
		get groups() {
			return groups;
		},
		toggle(change: NotificationPreferenceChange) {
			const cell = `${change.category}:${change.channel}`;
			pending = { ...pending, [cell]: { ...change, writes: (pending[cell]?.writes ?? 0) + 1 } };
			saveNotificationPreference(client, change)
				.catch((error: unknown) => options.onFailed(readNotificationPreferenceFailure(error)))
				.finally(() => settle(cell));
		},
		/** «Δοκιμάστε ξανά». */
		retry() {
			if (options.enabled()) void read.refetch();
		}
	};
}
