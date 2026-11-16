<script lang="ts" module>
	/** One row of the box: its strong words and the muted ones under them, both the caller's. */
	export type TermsBoxLine = { title: string; body: string };
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';

	let {
		title,
		lines,
		testId,
		class: className
	}: {
		/** Its name, small and muted, already localized. */
		title: string;
		lines: readonly TermsBoxLine[];
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- `appt.css:339-345` `.a-terms` (shared since wave 5.1, D-W51-62: the 53's «Προθεσμία ακύρωσης» and the 71's «Τώρα»):
     the quiet band, its name 12/500 muted, each row its strong words and the muted ones under them («Έως Τετάρτη 11
     Νοεμβρίου, 12:30 · Ακυρώνετε από εδώ.», ««Ολοκληρώθηκε» · Γράφτηκε αυτόματα …»), a thin line between. Every word a
     text node. -->
<section
	data-slot="terms-box"
	data-testid={testId}
	class={cn('rounded-md bg-foreground/5 px-4 py-3.5', className)}
>
	<h3 class="mb-1 text-label-md font-medium text-muted-foreground">{title}</h3>
	{#each lines as line, index (index)}
		<div
			data-slot="terms-box-line"
			class={cn('grid gap-0.5 py-2 text-body-sm last:pb-0', index > 0 && 'border-t border-line')}
		>
			<p class="font-semibold text-foreground">{line.title}</p>
			<p class="text-muted-foreground">{line.body}</p>
		</div>
	{/each}
</section>
