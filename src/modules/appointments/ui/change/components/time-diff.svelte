<script lang="ts">
	let {
		wasLabel,
		was,
		nextLabel,
		next,
		stays
	}: {
		wasLabel: string;
		was: string;
		nextLabel: string;
		next: string;
		/** What becomes of the state once saved («Το ραντεβού μένει επιβεβαιωμένο…», «Το αίτημα μένει σε αναμονή…»). */
		stays: string;
	} = $props();
</script>

<!-- `appt.css:272-278` · U-136.3: what «Αποθήκευση» will do, said before it is pressed — the hour it was (struck), the hour
     it becomes, and what happens to the state, under a thin line. -->
<div
	data-testid="appointment-time-diff"
	class="mt-5 rounded-md border border-line-2 px-4 py-3.5 text-body-sm text-foreground"
>
	<p class="flex flex-row justify-between gap-4 py-0.5">
		<span class="shrink-0 text-muted-foreground">{wasLabel}</span>
		<s class="text-end text-muted-foreground">{was}</s>
	</p>
	<p class="flex flex-row justify-between gap-4 py-0.5">
		<span class="shrink-0 text-muted-foreground">{nextLabel}</span>
		<span class="text-end font-semibold">{next}</span>
	</p>
	<p class="mt-2.5 border-t border-line pt-2.5 text-label-lg font-normal text-muted-foreground">
		{stays}
	</p>
</div>
