<script lang="ts">
	import { setAppointmentsMemory, useAppointmentsMemory } from '$modules/appointments/ui/memory';
	import { setBookingDraft, useBookingDraft } from '../hooks/booking-draft.svelte';
	import type { BookingDraftHostProps } from '../types';

	let { children }: BookingDraftHostProps = $props();

	// 🔴 U-112.2: the booking's draft lives above every page of the site, one per page tree (the root layout's).
	setBookingDraft(useBookingDraft());
	// 🔴 D-W4-33: so does what the patient's pages say right after a write — the 54 leads to the appointment's page.
	setAppointmentsMemory(useAppointmentsMemory());
</script>

<!-- 🔴 U-112.2 (P-W3 §3.2.8): the booking in progress, kept while the reader goes to a «Αλλαγή» screen and back, to the
     doctor's page and back, or anywhere else on the site; and (wave 4.0, D-W4-33) the appointments' memory of a write.
     It draws nothing. -->
{@render children()}
