<script lang="ts" module>
	/** One entry: its words, under them where, above them when; without a time, the words alone. */
	export type TimelineItem = {
		id: string;
		title: string;
		detail?: string;
		/** «2014 – 2016», and how a screen reader says it («2014 έως 2016»). */
		when?: string;
		whenLabel?: string;
	};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon, type IoniconName } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';

	let {
		icon,
		title,
		items,
		limit = 3,
		moreLabel,
		fewerLabel,
		testId,
		class: className
	}: {
		icon: IoniconName;
		title: string;
		items: readonly TimelineItem[];
		/** How many show before «Εμφάνιση όλων (N)». */
		limit?: number;
		/** The caller's words («Εμφάνιση όλων (4)», «Εμφάνιση λιγότερων»). */
		moreLabel: string;
		fewerLabel: string;
		testId?: string;
		class?: string;
	} = $props();

	let open = $state(false);
	const titleId = useId(undefined, 'timeline-title');
	const moreId = useId(undefined, 'timeline-more');
	const first = $derived(items.slice(0, limit));
	const rest = $derived(items.slice(limit));
	const hasMore = $derived(rest.length > 0);
</script>

{#snippet entry(item: TimelineItem, index: number, list: readonly TimelineItem[], tail: boolean)}
	{@const last = index === list.length - 1 && (tail || !hasMore)}
	{@const fades = !tail && hasMore && index === list.length - 1 && !open}
	<li
		data-testid={testId ? `${testId}-item-${item.id}` : undefined}
		class="relative pb-5 pl-control-sm"
	>
		<span
			aria-hidden="true"
			data-slot="timeline-dot"
			class={cn(
				'absolute top-1.5 left-3 size-2.5 -translate-x-1/2 rounded-full border-2 border-muted-foreground',
				!tail && index === 0 ? 'bg-muted-foreground' : 'bg-card'
			)}
		></span>
		{#if !last}
			<span
				aria-hidden="true"
				data-slot="timeline-line"
				class={cn(
					'absolute top-5 -bottom-1 left-3 w-0.5 -translate-x-1/2 rounded-xs',
					fades ? 'bg-linear-to-b from-border to-transparent' : 'bg-border'
				)}
			></span>
		{/if}
		{#if item.when}
			<span
				aria-label={item.whenLabel}
				class="block text-body-sm font-medium text-muted-foreground tabular-nums">{item.when}</span
			>
		{/if}
		<span
			class={cn(
				'block wrap-anywhere text-foreground',
				item.when ? 'mt-0.5 text-body-lg font-medium' : 'text-body-lg'
			)}>{item.title}</span
		>
		{#if item.detail}
			<span class="mt-0.5 block text-body-sm wrap-anywhere text-muted-foreground"
				>{item.detail}</span
			>
		{/if}
	</li>
{/snippet}

<!-- 🔴 U-73.1 Ε2 (screen 16 Π6): a group of a life's work in time, the newest first and filled: the glyph and its title,
     then at most `limit` entries on a line; the others open in their place, CSS only (U-12). Their words are text
     (U-65.6). An entry without a year is the words alone, at the group's end. -->
<section
	aria-labelledby={titleId}
	data-slot="timeline"
	data-testid={testId}
	class={cn('flex flex-col', className)}
>
	<h3
		id={titleId}
		class="flex flex-row items-center gap-4 text-title-sm font-semibold text-foreground"
	>
		<Ionicon name={icon} class="icon-lg shrink-0" />
		{title}
	</h3>
	<ol class="mt-4">
		{#each first as item, index (item.id)}
			{@render entry(item, index, first, false)}
		{/each}
	</ol>
	{#if hasMore}
		<div
			id={moreId}
			data-state={open ? 'open' : 'closed'}
			class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-sheet ease-standard data-[state=open]:grid-rows-[1fr]"
		>
			<div class="min-h-0 overflow-hidden">
				<ol inert={!open} data-testid={testId ? `${testId}-more` : undefined}>
					{#each rest as item, index (item.id)}
						{@render entry(item, index, rest, true)}
					{/each}
				</ol>
			</div>
		</div>
		<Button
			tone="muted"
			bordered={false}
			label={open ? fewerLabel : moreLabel}
			aria-expanded={open}
			aria-controls={moreId}
			onclick={() => (open = !open)}
			data-testid={testId ? `${testId}-toggle` : undefined}
			class="mt-1 ml-control-sm self-stretch tablet:self-start [&>span]:flex-row-reverse"
		>
			{#snippet leading()}
				<Ionicon
					name="chevron-down"
					class={cn(
						'icon-md shrink-0 transition-transform duration-accordion ease-accordion',
						open && 'rotate-180'
					)}
				/>
			{/snippet}
		</Button>
	{/if}
</section>
