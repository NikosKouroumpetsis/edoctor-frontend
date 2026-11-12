<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import RadioRows, { type RadioRowsFrame } from './radio-rows.svelte';

	let {
		title,
		about,
		value,
		options,
		onChange,
		headingAs = 'h2',
		frame = 'phone'
	}: {
		/** «Είναι το πρώτο σας ραντεβού με Dr. …;»: the group's name. */
		title: string;
		/** Screen 52: «Η απάντηση αφορά: {name}.» under it. */
		about?: string;
		value: 'yes' | 'no';
		options: { value: 'yes' | 'no'; label: string }[];
		onChange: (value: 'yes' | 'no') => void;
		/** `h3` under a right column's own `h2` (screen 52). */
		headingAs?: 'h2' | 'h3';
		frame?: RadioRowsFrame;
	} = $props();

	const headingId = $props.id();
</script>

<!-- Ε2 = Α (U-104.3, record §3.2, §8.2): «Είναι το πρώτο σας ραντεβού…;» 16/600, then «Ναι / Όχι» as rows of the whole
     width (56), the radio on the right, in a frame of the 12 corner below 744 (none from 744, in the booking's panel;
     always on screen 52). The group is named by its heading; the arrows move the choice. No colour under the pointer
     (U-100). -->
<section data-slot="booking-first-visit" class="flex flex-col">
	<svelte:element
		this={headingAs}
		id={headingId}
		class={cn('text-body-lg font-semibold text-foreground', about ? 'mb-1' : 'mb-3')}
	>
		{title}
	</svelte:element>
	{#if about}
		<p class="mb-3 text-label-lg font-normal text-muted-foreground">{about}</p>
	{/if}
	<RadioRows
		labelledby={headingId}
		{value}
		{options}
		onChange={(next) => {
			if (next === 'yes' || next === 'no') onChange(next);
		}}
		{frame}
	/>
</section>
