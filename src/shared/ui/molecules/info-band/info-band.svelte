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
		/** The first line in bold, the others muted, each its own line. */
		lines: readonly string[];
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- A quiet band of terms (the approved `appt.css` `.a-policy`; shared since wave 5.1, D-W51-37): the faint fill, the 12
     corner, 16 inside — its name 12/500 muted, the first line 14/600, the rest 14 muted. Every word a text node. -->
<section
	data-slot="info-band"
	data-testid={testId}
	class={cn('rounded-md bg-foreground/5 p-4', className)}
>
	<h3 class="text-label-md font-medium text-muted-foreground">{title}</h3>
	{#each lines as line, index (index)}
		<p
			class={index === 0
				? 'mt-1.5 text-body-sm font-semibold text-foreground'
				: 'text-body-sm text-muted-foreground'}
		>
			{line}
		</p>
	{/each}
</section>
