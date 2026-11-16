<script lang="ts">
	import { StatusPill, type StatusPillValue } from '$shared/ui/molecules/status-pill';

	let {
		pill,
		day,
		time,
		separator,
		sub = null,
		pillTestId,
		titleTestId,
		subTestId
	}: {
		/** The state, already worded by the caller. */
		pill: StatusPillValue;
		/** «Δευτέρα 16 Νοεμβρίου» and «11:00», already localized. */
		day: string;
		time: string;
		/** What joins them on one line from 744 (« · »). */
		separator: string;
		/** How near and how long («Σε 2 ημέρες · Διάρκεια 20 λεπτά»), already worded. */
		sub?: string | null;
		pillTestId?: string;
		titleTestId?: string;
		subTestId?: string;
	} = $props();
</script>

<!-- The head of one dated thing (record §7.2; shared since wave 5.1, D-W51-37): the state's pill, the day and the time
     (28/600; below 744 the time on a line of its own and a day too long for the screen wraps, never cut), then how near
     and how long. Every word a text node (U-65.6). -->
<StatusPill {pill} testId={pillTestId} />
<h2
	data-slot="status-heading"
	data-testid={titleTestId}
	class="mt-2.5 mb-1 flex flex-col text-heading-lg font-semibold text-foreground tablet:block"
>
	<span class="tablet:whitespace-nowrap">{day}</span><span class="hidden tablet:inline"
		>{separator}</span
	><span class="whitespace-nowrap">{time}</span>
</h2>
{#if sub}
	<p data-testid={subTestId} class="mb-5 text-body-md text-muted-foreground">{sub}</p>
{/if}
