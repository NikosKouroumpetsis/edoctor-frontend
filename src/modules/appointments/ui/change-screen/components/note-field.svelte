<script lang="ts" module>
	export type NoteFieldHeight = 'note' | 'short' | 'review';

	// Whole classes per height (Tailwind reads only written classes); `short` keeps the `Textarea`'s own `lg` (96).
	const heightClasses: Record<NoteFieldHeight, string | undefined> = {
		note: 'min-h-checkout-note',
		short: undefined,
		review: 'min-h-review-comment'
	};
</script>

<script lang="ts">
	import { Textarea } from '$shared/ui/primitives/textarea';
	import { BOOKING_PATIENT_NOTE_MAX_LENGTH } from '$modules/appointments/config';

	let {
		label,
		labelAs = 'h2',
		placeholder,
		value,
		counter,
		error,
		help,
		maxLength = BOOKING_PATIENT_NOTE_MAX_LENGTH,
		height = 'note',
		onInput,
		testId
	}: {
		/** «Σημείωση για τον γιατρό (προαιρετικό)», «Θέλετε να προσθέσετε κάτι; (προαιρετικό)». */
		label: string;
		/** The label as a heading (`h3` under a right column's `h2`), or only for a screen reader (screen 52's note, whose title says it). */
		labelAs?: 'h2' | 'h3' | 'hidden';
		placeholder: string;
		value: string;
		/** «0/500». */
		counter: string;
		/** The server refused the note: its words under it. */
		error: string | null;
		/** A muted line under the counter («Ο γιατρός τη βλέπει όταν ανοίγει το ραντεβού.»). */
		help?: string;
		/** The server's bound (D-W4-36.8: UTF-16 units, as the browser's `maxlength` counts): the note's 500 by default. */
		maxLength?: number;
		/**
		 * `note` screen 30's field, at least 104 (`checkout-note`); `short` the prototype's `.a-area.short` (`appt.css:352`,
		 * screen 53's words): 96, the `Textarea`'s own `lg` (`textarea-xl`); `review` its `.a-area` (`appt.css:303`, screen
		 * 54's review): 136 (`review-comment`).
		 */
		height?: NoteFieldHeight;
		onInput: (value: string) => void;
		testId?: string;
	} = $props();

	const id = $props.id();
</script>

<!-- Record §3.2, §8.2, §9.2, §10.2: the note, at least 104 high (96 for the 53's words, 136 for the 54's review), «0/500»
     under it. 🔴 U-65.6: the field stops at its bound and the page cuts a paste past it; what was written is shown back
     only as a text node. -->
<section data-slot="checkout-note" class="flex flex-col">
	{#if labelAs === 'hidden'}
		<label for={id} class="sr-only">{label}</label>
	{:else}
		<svelte:element this={labelAs} class="mb-3 text-body-lg font-semibold text-foreground">
			<label for={id}>{label}</label>
		</svelte:element>
	{/if}
	<Textarea
		{id}
		{value}
		{placeholder}
		size="lg"
		maxlength={maxLength}
		invalid={Boolean(error)}
		aria-describedby={help ? `${id}-counter ${id}-help` : `${id}-counter`}
		class={heightClasses[height]}
		data-testid={testId}
		oninput={(event) => onInput(event.currentTarget.value)}
	/>
	<p id={`${id}-counter`} class="mt-1.5 text-end text-label-md text-muted-foreground">{counter}</p>
	{#if error}
		<p role="alert" class="mt-1 text-label-lg font-medium text-danger-text">{error}</p>
	{/if}
	{#if help}
		<p id={`${id}-help`} class="mt-1 text-label-lg font-normal text-muted-foreground">{help}</p>
	{/if}
</section>
