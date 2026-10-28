<script lang="ts" module>
	/** One block under the title: a muted label over its body, in the caller's words. */
	export type OfferingBlock = { id: string; label: string; body: string; testId?: string };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';

	let {
		title,
		price,
		priceCaption,
		priceTestId,
		blocks = [],
		testId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		title: string;
		/** The price itself (a `PriceLabel` with `placement="offer"`), formatted by the caller (S-31.2). */
		price: Snippet;
		/** The line over the price («Από», «Τιμή»), already localized. */
		priceCaption: string;
		priceTestId?: string;
		blocks?: readonly OfferingBlock[];
		testId?: string;
	} = $props();
</script>

<!-- The application's priced card (M-26): the title beside a soft pill (at most 2/5 of the row) holding the caption
     over the price, then each block; no blocks draw no block area. -->
<div
	data-slot="offering-card"
	data-testid={testId}
	class={cn('flex flex-col gap-2.5 rounded-lg bg-card px-4 py-4', className)}
	{...restProps}
>
	<div class="flex flex-row items-start justify-between gap-4">
		<p class="flex-1 text-title-sm font-semibold text-foreground">{title}</p>
		<div
			data-slot="offering-card-price"
			data-testid={priceTestId}
			class="flex max-w-2/5 min-w-price-min-w flex-col items-end rounded-lg bg-foreground/5 px-3 py-2"
		>
			<span class="text-label-md font-semibold text-muted-foreground">{priceCaption}</span>
			{@render price()}
		</div>
	</div>

	{#if blocks.length > 0}
		<div class="flex flex-col gap-2.5">
			{#each blocks as block (block.id)}
				<div data-testid={block.testId} class="flex flex-col gap-1.5">
					<p class="text-label-md font-semibold text-muted-foreground">{block.label}</p>
					<p class="text-body-sm text-foreground/88">{block.body}</p>
				</div>
			{/each}
		</div>
	{/if}
</div>
