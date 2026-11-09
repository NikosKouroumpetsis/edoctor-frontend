<script lang="ts">
	import { setBookingDraft, useBookingDraft } from '../hooks/booking-draft.svelte';
	import type { BookingDraftHostProps } from '../types';

	let { children }: BookingDraftHostProps = $props();

	// 🔴 U-112.2: the booking's draft lives above every page of the site, one per page tree (the root layout's).
	setBookingDraft(useBookingDraft());
</script>

<!-- 🔴 U-112.2 (P-W3 §3.2.8): the booking in progress, kept while the reader goes to a «Αλλαγή» screen and back, to the
     doctor's page and back, or anywhere else on the site. It draws nothing. -->
{@render children()}
