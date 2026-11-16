<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { setDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';
	import { setInboxBadge, type InboxBadge } from '$shared/state/inbox-badge';
	import { setNotificationBadge, type NotificationBadge } from '$shared/state/notification-badge';
	import { setSession, type Session } from '$shared/state/session';
	import DoctorFrame from './index.svelte';

	let {
		session,
		standing,
		inbox,
		notifications,
		children
	}: {
		session: Session;
		standing: DoctorStanding;
		inbox?: InboxBadge;
		notifications?: NotificationBadge;
		children: Snippet;
	} = $props();

	untrack(() => {
		setSession(session);
		setDoctorStanding(standing);
		if (inbox) setInboxBadge(inbox);
		if (notifications) setNotificationBadge(notifications);
	});
</script>

<!-- Tests only: the doctor's frame under the layout's session, standing and dots. -->
<DoctorFrame>
	{@render children()}
</DoctorFrame>
