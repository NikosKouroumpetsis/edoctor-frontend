<script lang="ts">
	import { untrack } from 'svelte';
	import { getAppointmentsMemory, type AppointmentsMemory } from '$modules/appointments/ui/memory';
	import { getBookingDraft, type BookingDraft } from '../hooks/booking-draft.svelte';

	let {
		page,
		onDraft,
		onMemory
	}: {
		page: 'booking' | 'profile';
		onDraft?: (draft: BookingDraft) => void;
		onMemory?: (memory: AppointmentsMemory) => void;
	} = $props();

	const draft = getBookingDraft();
	const memory = getAppointmentsMemory();
	untrack(() => {
		onDraft?.(draft);
		onMemory?.(memory);
	});
</script>

{#if page === 'booking'}
	<label>
		Σημείωση
		<textarea
			class="min-h-touch w-full"
			value={draft.note}
			oninput={(event) => (draft.note = event.currentTarget.value)}
		></textarea>
	</label>
{:else}
	<p>Προφίλ γιατρού</p>
{/if}
