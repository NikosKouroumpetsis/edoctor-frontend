<script lang="ts" module>
	/** One row: its id, the muted label and the value, both the caller's words. */
	export type KeyValueItem = { id: string; label: string; value: string };
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { cardShellClasses } from '$shared/ui/primitives/card';

	let {
		items,
		title,
		testId
	}: {
		items: readonly KeyValueItem[];
		title?: string;
		testId?: string;
	} = $props();
</script>

<!-- The application's criteria card (M-40): an optional title over one row per item, the label at the start, the
     value at the end on ONE line, cut with an ellipsis; on the web the rows are a description list. -->
<div data-slot="key-value-list" data-testid={testId} class={cn(cardShellClasses, 'gap-4 p-5')}>
	{#if title}
		<p class="text-title-sm font-semibold text-foreground">{title}</p>
	{/if}

	<dl class="flex flex-col gap-3">
		{#each items as item (item.id)}
			<div class="flex flex-row items-center justify-between gap-4">
				<dt class="shrink-0 text-body-sm font-semibold text-muted-foreground">{item.label}</dt>
				<dd class="min-w-0 flex-1 truncate text-right text-body-md font-semibold text-foreground">
					{item.value}
				</dd>
			</div>
		{/each}
	</dl>
</div>
