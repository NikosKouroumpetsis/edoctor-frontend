<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';
	import { NotificationBadge, setNotificationBadge } from '$shared/state/notification-badge';
	import { getSessionOptional } from '$shared/state/session';
	import {
		notificationUnreadCountQuery,
		readNotificationInboxFailure
	} from '$modules/notifications/api/inbox';
	import type { NotificationsUnreadHostProps } from '../types';

	let { children }: NotificationsUnreadHostProps = $props();

	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);

	// 🔴 D-W45-17 · D-W45-49: «how many are new», only for a member — a guest, and a session not known yet, ask the
	// server NOTHING (`enabled` goes false at a sign-out too). No timer: it is asked when the member arrives, whenever
	// the page comes back to the front, and every «read» answers its new value into the same place.
	const unread = createQuery(() => ({
		...notificationUnreadCountQuery(),
		enabled: browser && isMember
	}));

	// A session that has ended shows here first: the page asks who it is, and learns it knows nobody.
	$effect(() => {
		if (isMember && readNotificationInboxFailure(unread.error) === 'session') {
			void session?.retryRead();
		}
	});

	setNotificationBadge(new NotificationBadge({ count: () => (isMember ? (unread.data ?? 0) : 0) }));
</script>

<!-- Screen 63 (record §5.1, §5.8): the ONE read behind every dot of «a new notification», for the whole site — the
     frame's menu and the «Προφίλ»'s bell draw it and know nothing of this module; the list reads the same place. -->
{@render children()}
