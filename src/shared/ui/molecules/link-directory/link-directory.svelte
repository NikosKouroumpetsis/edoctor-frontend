<script lang="ts" module>
	/** One link of the directory: its words, a muted line under them, and the page (already resolved). */
	export type LinkDirectoryLink = { label: string; description?: string; href: string };

	/** One tab: its name and its links. */
	export type LinkDirectoryTab = { id: string; label: string; links: LinkDirectoryLink[] };

	export type LinkDirectoryProps = {
		/** The heading over the tabs, already localized. */
		title: string;
		/** The heading's tag (the level is the page's). */
		headingAs?: string;
		tabs: LinkDirectoryTab[];
		/** The links shown per tab before «more»; every link without it. */
		initialCount?: number;
		/** The words of the button that shows the rest (required with `initialCount`). */
		moreLabel?: string;
		/** `<id>`, `<id>-tab-<tab>`, `<id>-panel`, `<id>-more` (the caller's test ids). */
		testId?: string;
		class?: string;
	};

	// A tab is a 48 target; the chosen one is underlined (2) in the text colour, the others muted (Airbnb's footer).
	const tabClass =
		'-mb-px inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center border-b-2 border-transparent text-body-sm whitespace-nowrap text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset aria-selected:border-foreground aria-selected:font-semibold aria-selected:text-foreground';
	// A link of the grid: its name over the muted line, the whole of it the target.
	const linkClass =
		'flex min-h-touch min-w-touch flex-col justify-center rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
	// Airbnb's (measured, fin1): «more» is as wide as its cell at most — one line where it fits, two where it does not,
	// the chevron after the words. One line at every width overflowed the page (360–1128: the button 190, the cell ~150).
	const moreClass =
		'inline-flex min-h-touch min-w-touch max-w-full flex-row items-center gap-1 self-start rounded-sm text-left text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50';
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { handleRovingKeydown, useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		title,
		headingAs = 'h2',
		tabs,
		initialCount,
		moreLabel,
		testId,
		class: className
	}: LinkDirectoryProps = $props();

	const uid = useId(undefined, 'link-directory');
	const idOf = (part: string) => (testId ? `${testId}-${part}` : undefined);
	let selected = $state<string | null>(null);
	const current = $derived(tabs.find((tab) => tab.id === selected) ?? tabs[0]);
	// «More» opens the rest of the tab that shows; another tab starts short again.
	let expanded = $state<string | null>(null);
	const limit = $derived(
		initialCount !== undefined && moreLabel && expanded !== current?.id
			? initialCount
			: Number.POSITIVE_INFINITY
	);
	const shown = $derived(current ? current.links.slice(0, limit) : []);
	const hasMore = $derived(Boolean(current) && current.links.length > shown.length);
	let tabList = $state<HTMLElement | null>(null);
	let grid = $state<HTMLElement | null>(null);

	function choose(id: string) {
		selected = id;
	}

	// Automatic activation (the APG tabs pattern, as the kit's `Tabs`): the arrows, Home and End move the focus and
	// choose the tab they reach.
	function onkeydown(event: KeyboardEvent) {
		if (!tabList) return;
		const reached = handleRovingKeydown(event, tabList, { orientation: 'horizontal' });
		const id = reached?.dataset.tabId;
		if (id) choose(id);
	}

	async function showMore() {
		if (!current) return;
		const first = shown.length;
		expanded = current.id;
		await tick();
		// The focus goes to the first link that appeared, never to the page's start (the button is gone).
		grid?.querySelectorAll<HTMLElement>('[data-slot="link-directory-link"]')[first]?.focus();
	}
</script>

<!-- Airbnb's «popular searches» (U-16.9): a heading, tabs underlined when chosen, then a grid of links (the name
     over a muted line) in 2 columns on the phone, 4 from 744 and 6 from 1128, and «more» for the rest. -->
<section
	data-slot="link-directory"
	data-testid={testId}
	aria-labelledby={`${uid}-title`}
	class={cn('flex flex-col', className)}
>
	<svelte:element
		this={headingAs}
		id={`${uid}-title`}
		class="mb-3 text-heading-sm font-semibold text-foreground">{title}</svelte:element
	>
	<div
		bind:this={tabList}
		role="tablist"
		aria-labelledby={`${uid}-title`}
		tabindex={-1}
		{onkeydown}
		data-slot="link-directory-tabs"
		class="scrollbar-none flex flex-row gap-6 overflow-x-auto border-b border-border outline-none"
	>
		{#each tabs as tab (tab.id)}
			{@const isCurrent = tab.id === current?.id}
			<button
				type="button"
				role="tab"
				id={`${uid}-tab-${tab.id}`}
				aria-selected={isCurrent}
				aria-controls={`${uid}-panel`}
				tabindex={isCurrent ? 0 : -1}
				data-roving-item
				data-tab-id={tab.id}
				data-testid={idOf(`tab-${tab.id}`)}
				onclick={() => choose(tab.id)}
				class={tabClass}>{tab.label}</button
			>
		{/each}
	</div>
	{#if current}
		<div
			id={`${uid}-panel`}
			role="tabpanel"
			aria-labelledby={`${uid}-tab-${current.id}`}
			data-testid={idOf('panel')}
			class="flex flex-col gap-2 pt-6 pb-section"
		>
			<ul
				bind:this={grid}
				data-slot="link-directory-grid"
				class="grid grid-cols-2 gap-x-6 gap-y-2 tablet:grid-cols-4 laptop:grid-cols-6"
			>
				{#each shown as link, index (`${index}:${link.href}`)}
					<li class="flex min-w-0 flex-col">
						<a href={link.href} data-slot="link-directory-link" class={linkClass}>
							<span class="text-body-sm font-semibold text-foreground">{link.label}</span>
							{#if link.description}
								<span class="truncate text-body-sm text-muted-foreground">{link.description}</span>
							{/if}
						</a>
					</li>
				{/each}
				<!-- Airbnb's: «more» is the grid's last cell, in the place of the next link. -->
				{#if hasMore && moreLabel}
					<li data-slot="link-directory-more" class="flex min-w-0 flex-col justify-center">
						<button type="button" data-testid={idOf('more')} onclick={showMore} class={moreClass}>
							<span data-slot="link-directory-more-label" class="min-w-0">{moreLabel}</span>
							<Ionicon name="chevron-down" class="icon-sm shrink-0" />
						</button>
					</li>
				{/if}
			</ul>
		</div>
	{/if}
</section>
