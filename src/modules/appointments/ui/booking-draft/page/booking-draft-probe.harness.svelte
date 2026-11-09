<script lang="ts">
	import { untrack } from 'svelte';
	import { getBookingDraft, type BookingDraft } from '../hooks/booking-draft.svelte';

	let { page, onDraft }: { page: 'booking' | 'profile'; onDraft?: (draft: BookingDraft) => void } =
		$props();

	const draft = getBookingDraft();
	untrack(() => onDraft?.(draft));
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
