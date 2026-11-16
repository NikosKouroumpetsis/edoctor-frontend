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

	let {
		label,
		labelAs = 'h2',
		placeholder,
		value,
		counter,
		error,
		help,
		maxLength,
		height = 'note',
		onInput,
		testId
	}: {
		/** The field's name, already localized by the caller (U-03.5). */
		label: string;
		/** The label as a heading (`h3` under a right column's `h2`), or only for a screen reader (a title says it). */
		labelAs?: 'h2' | 'h3' | 'hidden';
		placeholder: string;
		value: string;
		/** «0/500», the caller's words. */
		counter: string;
		/** The server refused the words: its words under them. */
		error: string | null;
		/** A muted line under the counter. */
		help?: string;
		/**
		 * The server's bound, the caller's (UTF-16 units, as the browser's `maxlength` counts — the server's own count of
		 * code points then never exceeds it).
		 */
		maxLength: number;
		/**
		 * `note` at least 104 (`checkout-note`); `short` the prototype's `.a-area.short` (`appt.css:352`): 96, the
		 * `Textarea`'s own `lg` (`textarea-xl`); `review` its `.a-area` (`appt.css:303`): 136 (`review-comment`).
		 */
		height?: NoteFieldHeight;
		onInput: (value: string) => void;
		testId?: string;
	} = $props();

	const id = $props.id();
</script>

<!-- Wave 3 / 4 (record §3.2, §8.2, §9.2, §10.2; shared since D-W51-50): the words, at least 104 high (96 for a reason's
     words, 136 for a review), «0/500» under them. 🔴 U-65.6: the field stops at its bound and the page cuts a paste
     past it; what was written is shown back only as a text node. -->
<section data-slot="note-field" class="flex flex-col">
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
