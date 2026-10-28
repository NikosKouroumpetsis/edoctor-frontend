<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { cardShellClasses } from '$shared/ui/primitives/card';

	let {
		title,
		supporting,
		testId
	}: {
		/** How many results the list holds, in the caller's words («128 αποτελέσματα», S-31.2). */
		title: string;
		supporting?: string | null;
		testId?: string;
	} = $props();
</script>

<!-- The application's count card (M-40): the count over an optional muted line. A polite live region, so a count
     that changes with new criteria is read once, whole. -->
<div
	data-slot="results-count"
	data-testid={testId}
	aria-live="polite"
	aria-atomic="true"
	class={cn(cardShellClasses, 'gap-2 p-5')}
>
	<p class="text-title-md font-semibold text-foreground">{title}</p>
	{#if supporting}
		<p class="text-body-sm text-muted-foreground">{supporting}</p>
	{/if}
</div>
