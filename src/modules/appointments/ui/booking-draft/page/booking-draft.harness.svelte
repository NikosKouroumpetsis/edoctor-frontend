<script lang="ts">
	import { untrack } from 'svelte';
	import { setSession, type Session } from '$shared/state/session';
	import BookingDraftHost from './index.svelte';
	import Probe from './booking-draft-probe.harness.svelte';
	import type { BookingDraft } from '../hooks/booking-draft.svelte';

	let {
		session,
		page = 'booking',
		onDraft
	}: {
		session?: Session;
		/** The page on show: the booking, or another page of the site (the doctor's profile). */
		page?: 'booking' | 'profile';
		onDraft?: (draft: BookingDraft) => void;
	} = $props();

	untrack(() => {
		if (session) setSession(session);
	});
</script>

<!-- 🔴 U-112.2: the root layout's host and one page under it at a time (`#key`, as a route change makes one). -->
<BookingDraftHost>
	{#key page}
		<Probe {page} {onDraft} />
	{/key}
</BookingDraftHost>
