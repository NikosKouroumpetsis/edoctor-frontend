<script lang="ts" module>
	/** One line of the box: its label (muted) and its value — bold, or struck through for what it was. */
	export type DiffBoxRow = { id: string; label: string; value: string; struck?: boolean };
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		rows,
		note = null,
		testId,
		class: className
	}: {
		/** The lines, each its label and its value, already localized. */
		rows: readonly DiffBoxRow[];
		/** What a press will do, under a thin line (muted). */
		note?: string | null;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- `appt.css:281-286` (`.a-diff`, the approved 52; shared since D-W51-51): a framed box of labelled values, the label
     muted on the left and its value on the right — bold, or struck through for what it was — and what will happen under
     a thin line. Every word a text node (U-65.6). -->
<div
	data-slot="diff-box"
	data-testid={testId}
	class={cn(
		'mt-5 rounded-md border border-line-2 px-4 py-3.5 text-body-sm text-foreground',
		className
	)}
>
	{#each rows as row (row.id)}
		<p data-row={row.id} class="flex flex-row justify-between gap-4 py-0.5">
			<span class="shrink-0 text-muted-foreground">{row.label}</span>
			{#if row.struck}
				<s class="text-end text-muted-foreground">{row.value}</s>
			{:else}
				<span class="text-end font-semibold">{row.value}</span>
			{/if}
		</p>
	{/each}
	{#if note}
		<p class="mt-2.5 border-t border-line pt-2.5 text-label-lg font-normal text-muted-foreground">
			{note}
		</p>
	{/if}
</div>
