<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { setDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';
	import { setInboxBadge, type InboxBadge } from '$shared/state/inbox-badge';
	import { setNotificationBadge, type NotificationBadge } from '$shared/state/notification-badge';
	import { setSession, type Session } from '$shared/state/session';
	import type { SiteDialogs } from '$shared/state/site-dialogs';
	import SiteFrame from './index.svelte';
	import Reader from './session-reader.harness.svelte';

	let {
		session,
		inbox,
		notifications,
		standing,
		children
	}: {
		session: Session;
		inbox?: InboxBadge;
		notifications?: NotificationBadge;
		/** Wave 5.1 · screen 64: the doctor standing the layout's host gives (its one read). */
		standing?: DoctorStanding;
		children: Snippet;
	} = $props();

	setSession(untrack(() => session));
	untrack(() => {
		if (inbox) setInboxBadge(inbox);
		if (notifications) setNotificationBadge(notifications);
		if (standing) setDoctorStanding(standing);
	});
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false, gcTime: Infinity } }
	});

	let reader = $state<SiteDialogs | null>(null);
	export const dialogs = () => reader as SiteDialogs;
</script>

<QueryClientProvider {client}>
	<SiteFrame>
		{@render children()}
		<Reader onRead={(found) => (reader = found)} />
	</SiteFrame>
</QueryClientProvider>
