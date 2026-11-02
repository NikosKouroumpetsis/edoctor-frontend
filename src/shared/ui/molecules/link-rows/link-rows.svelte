<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** One row: its words (a muted line over them), its page, its glyph and, when it differs, its language. */
	export type LinkRow = {
		key: string;
		label: string;
		href: string;
		icon?: IoniconName;
		eyebrow?: string;
		lang?: string;
	};

	export type LinkRowsProps = {
		/** The muted title over the rows; it names the list. */
		title: string;
		rows: readonly LinkRow[];
		testId?: string;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let { title, rows, testId, class: className }: LinkRowsProps = $props();

	const titleId = $props.id();
</script>

<!-- 🔴 U-59.1 Π6 / U-62.1 Π5 (the prototypes 07 and 10): «Άλλα νομικά κείμενα» — a muted title (14/600) and rows of
     52 between hairlines: the glyph (20), the words (15, a muted line over them when given) and «›». -->
<nav
	aria-labelledby={titleId}
	data-slot="link-rows"
	data-testid={testId}
	class={cn('flex flex-col', className)}
>
	<p id={titleId} class="mb-2 text-body-sm font-semibold text-muted-foreground">{title}</p>
	<ul class="flex flex-col border-t border-border/60">
		{#each rows as row (row.key)}
			<li>
				<a
					href={row.href}
					lang={row.lang}
					data-slot="link-rows-link"
					class="flex min-h-reading-row w-full flex-row items-center gap-3 border-b border-border/60 px-1 py-2.5 text-body-md text-foreground transition-colors duration-label ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset can-hover:hover:bg-background"
				>
					{#if row.icon}
						<Ionicon name={row.icon} class="icon-md shrink-0 text-muted-foreground" />
					{/if}
					<span class="flex min-w-0 flex-1 flex-col">
						{#if row.eyebrow}
							<span class="text-label-lg font-normal text-muted-foreground">{row.eyebrow}</span>
						{/if}
						<span>{row.label}</span>
					</span>
					<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
				</a>
			</li>
		{/each}
	</ul>
</nav>
