<script lang="ts">
	import { untrack } from 'svelte';
	import { setDoctorStanding, type DoctorStanding } from '$shared/state/doctor-standing';
	import { setNotificationBadge, type NotificationBadge } from '$shared/state/notification-badge';
	import { setSession, type Session } from '$shared/state/session';
	import DoctorMenu from './index.svelte';

	let {
		session,
		standing,
		notifications,
		bell = false,
		locale = 'el'
	}: {
		session: Session;
		standing: DoctorStanding;
		notifications?: NotificationBadge;
		/** Hands the title row something for its end (the screen hands the bell of screen 63). */
		bell?: boolean;
		locale?: 'el' | 'en';
	} = $props();

	untrack(() => {
		setSession(session);
		setDoctorStanding(standing);
		if (notifications) setNotificationBadge(notifications);
	});
</script>

{#snippet headerAction()}
	<button type="button" data-testid="handed-bell" class="min-h-touch min-w-touch">bell</button>
{/snippet}

<!-- Tests only: «Μενού» under the layout's session, standing and dots. -->
<DoctorMenu {locale} headerAction={bell ? headerAction : undefined} />
