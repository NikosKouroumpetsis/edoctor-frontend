<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		value,
		title,
		body,
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The big number, formatted by the caller («12», S-31.2). */
		value: string;
		title: string;
		body?: string;
		testId?: string;
	} = $props();
</script>

<!-- The application's highlight (M-30): one big number over its title and a muted body, centred. -->
<div
	data-slot="stat-highlight"
	data-testid={testId}
	class={cn('flex flex-col items-center gap-2', className)}
	{...restProps}
>
	<p class="text-display-xl font-semibold text-foreground">{value}</p>
	<p class="text-heading-md leading-tight font-semibold text-foreground">{title}</p>
	{#if body !== undefined}
		<p class="px-5 text-center text-body-sm text-muted-foreground">{body}</p>
	{/if}
</div>
