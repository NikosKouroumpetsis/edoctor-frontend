<script lang="ts">
	import { Textarea } from '$shared/ui/primitives/textarea';
	import { BOOKING_PATIENT_NOTE_MAX_LENGTH } from '$modules/appointments/config';

	let {
		label,
		placeholder,
		value,
		counter,
		error,
		onInput
	}: {
		/** «Σημείωση για τον γιατρό (προαιρετικό)». */
		label: string;
		placeholder: string;
		value: string;
		/** «0/500». */
		counter: string;
		/** The server refused the note: its words under it. */
		error: string | null;
		onInput: (value: string) => void;
	} = $props();

	const id = $props.id();
</script>

<!-- Record §3.2: the note, at least 104 high, «0/500» under it. 🔴 U-65.6: the field stops at 500 and the page cuts a paste
     past it (`clampBookingNote`); what was written is shown back only as a text node. -->
<section data-slot="checkout-note" class="flex flex-col">
	<h2 class="mb-3 text-body-lg font-semibold text-foreground">
		<label for={id}>{label}</label>
	</h2>
	<Textarea
		{id}
		{value}
		{placeholder}
		size="lg"
		maxlength={BOOKING_PATIENT_NOTE_MAX_LENGTH}
		invalid={Boolean(error)}
		aria-describedby={`${id}-counter`}
		class="min-h-checkout-note"
		oninput={(event) => onInput(event.currentTarget.value)}
	/>
	<p id={`${id}-counter`} class="mt-1.5 text-end text-label-md text-muted-foreground">{counter}</p>
	{#if error}
		<p role="alert" class="mt-1 text-label-lg font-medium text-danger-text">{error}</p>
	{/if}
</section>
