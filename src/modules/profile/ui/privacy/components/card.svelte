<script lang="ts">
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		title,
		line,
		href,
		testId
	}: {
		title: string;
		/** The line under the title; `null` while it is not known yet (it waits in place). */
		line: string | null;
		/** The screen's address, already resolved. */
		href: string;
		testId: string;
	} = $props();
</script>

<!-- A card-row of «Απόρρητο» (record §5.7, `62-privacy/priv.css:3-6` `.v-card`): the 12 corner and the `line-2` rim, the
     title 15 / 600, its line 14 muted, «›» — a link, 48 high at least. No colour under the pointer (U-100). -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	data-testid={testId}
	class="flex min-h-touch w-full flex-row items-center justify-between gap-4 rounded-md border border-line-2 px-4.5 py-4 text-start transition-opacity duration-standard ease-standard outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70"
>
	<span class="grid min-w-0 gap-0.5">
		<span class="text-body-md font-semibold text-foreground">{title}</span>
		{#if line === null}
			<span aria-hidden="true" data-testid={`${testId}-line-loading`} class="block py-0.5">
				<Skeleton class="h-4 w-1/2 rounded-sm" />
			</span>
		{:else}
			<span data-testid={`${testId}-line`} class="text-body-sm text-muted-foreground">{line}</span>
		{/if}
	</span>
	<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
