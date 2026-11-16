<script lang="ts">
	import { online } from 'svelte/reactivity/window';
	import { m } from '$paraglide/messages.js';
	import NotificationInbox from '$modules/notifications/ui/inbox';
	import { useDoctorNotificationsScreen } from '../hooks';
	import type { DoctorNotificationsScreenProps } from '../types';

	let { data }: DoctorNotificationsScreenProps = $props();

	const screen = useDoctorNotificationsScreen(() => data);
	const options = $derived({ locale: screen.locale });
	const offline = $derived(online.current === false);
</script>

<svelte:head>
	<!-- 🔴 U-65.6: the tab's title names no notification — it stays in the history. -->
	<title>{m.notifications_inbox_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- 🔴 Wave 5.1 · screen 75 «Ειδοποιήσεις» of the doctor (D-W51-89 … 91; 88 §75; `sw.js` `ntfPage`, `NT`): the approved
     63 as it was built, inside the doctor's frame («Μενού» the current tab), reading ONLY the doctor's side — from 950 the
     three choices on the left and the list in the middle of the right column (U-167), 744–949 one column, below 744 the
     application's page with «←» to «Μενού» and the capsule kept. The browser reads the list (U-80.1 Ε6). -->
<main data-testid="doctor-notifications-screen" class="w-full bg-card">
	<NotificationInbox
		side="doctor"
		locale={screen.locale}
		filter={screen.address.filter}
		links={screen.links}
		{offline}
	/>
</main>
