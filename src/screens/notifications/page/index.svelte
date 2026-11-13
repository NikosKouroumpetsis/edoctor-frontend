<script lang="ts">
	import { online } from 'svelte/reactivity/window';
	import { m } from '$paraglide/messages.js';
	import NotificationInbox from '$modules/notifications/ui/inbox';
	import { useNotificationsScreen } from '../hooks';
	import type { NotificationsScreenProps } from '../types';

	let { data }: NotificationsScreenProps = $props();

	const screen = useNotificationsScreen(() => data);
	const options = $derived({ locale: screen.locale });
	const offline = $derived(online.current === false);
</script>

<svelte:head>
	<!-- 🔴 U-65.6: the tab's title names no notification — it stays in the history. -->
	<title>{m.notifications_inbox_title({}, options)} | {m.brand_name({}, options)}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- Wave 4.5 · screen 63 «Ειδοποιήσεις», the list (record §5.8, D-W45-49): the notifications module's page with the
     addresses of the other modules' screens a line opens. From 950 two columns that fill the screen, so no footer, and a
     pushed page below 744, so no capsule (the frame, `NOTIFICATIONS_PAGES`). The page's server draws no person's fact
     (U-80.1 Ε6): the browser reads the list. -->
<main data-testid="notifications-screen" class="min-h-dvh bg-card tablet:min-h-page split:min-h-0">
	<NotificationInbox
		locale={screen.locale}
		filter={screen.address.filter}
		links={screen.links}
		{offline}
	/>
</main>
