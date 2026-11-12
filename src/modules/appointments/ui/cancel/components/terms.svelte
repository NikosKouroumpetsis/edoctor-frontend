<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import type { CancelTermsLine } from '$modules/appointments/lib/cancel';

	let { title, lines }: { title: string; lines: CancelTermsLine[] } = $props();
</script>

<!-- `appt.css:339-345` · «Προθεσμία ακύρωσης» (record §9.2, P-B4 §13.3.2): the quiet band of the 51's terms, each line its
     strong words and the muted ones under them («Έως Τετάρτη 11 Νοεμβρίου, 12:30 · Ακυρώνετε από εδώ.», «Μετά · Μόνο
     τηλεφωνικά με το ιατρείο · 210 321 0101»), a thin line between. -->
<section data-testid="appointment-cancel-terms" class="mb-4 rounded-md bg-foreground/5 px-4 py-3.5">
	<h3 class="mb-1 text-label-md font-medium text-muted-foreground">{title}</h3>
	{#each lines as line, index (index)}
		<div
			class={cn('grid gap-0.5 py-2 text-body-sm last:pb-0', index > 0 && 'border-t border-line')}
		>
			<p class="font-semibold text-foreground">{line.title}</p>
			<p class="text-muted-foreground">{line.body}</p>
		</div>
	{/each}
</section>
