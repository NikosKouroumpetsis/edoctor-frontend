<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { getNotificationBadgeOptional } from '$shared/state/notification-badge';
	import type { NotificationBellProps } from '../types';
	import RoundLink from './round-link.svelte';

	let { locale, href }: NotificationBellProps = $props();

	const options = $derived({ locale });
	// 🔴 D-W45-17: the site's ONE read of «something is new» (the notifications' host); the bell only draws it.
	const badge = getNotificationBadgeOptional();
	const hasNew = $derived(badge?.hasNew ?? false);
</script>

<!-- 🔴 Record §5.1 (U-164, D-W45-17, D-W45-59): the bell at the end of a member's «Προφίλ» title — the way to the list
     below 744, where the web is the application (U-81.2). From 744 the page has NO bell: the way there is the menu at
     the top right. Named «Ειδοποιήσεις», «Ειδοποιήσεις, νέες» with its dot while something is new. -->
<span class="tablet:hidden">
	<RoundLink
		{href}
		icon="notifications-outline"
		label={hasNew
			? m.notifications_inbox_bell_unread({}, options)
			: m.notifications_inbox_bell_label({}, options)}
		dot={hasNew}
		testId="profile-bell"
	/>
</span>
