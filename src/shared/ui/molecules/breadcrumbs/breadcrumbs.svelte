<script lang="ts" module>
	/** One step: a link, or the words alone (the page itself: no `href`). */
	export type BreadcrumbsCrumb = { label: string; href?: string };
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';

	let {
		crumbs,
		label,
		testId,
		class: className
	}: {
		crumbs: readonly BreadcrumbsCrumb[];
		/** The landmark's name (the caller's words). */
		label: string;
		testId?: string;
		class?: string;
	} = $props();
</script>

<!-- The text pages' breadcrumbs (U-57.4): 12/16, 28 under the bar, from 744 only; the last step is the page itself. -->
<nav
	aria-label={label}
	data-slot="breadcrumbs"
	data-testid={testId}
	class={cn('hidden pt-reading-crumbs tablet:block', className)}
>
	<ol class="flex flex-row flex-wrap items-center gap-x-2 text-label-md font-normal">
		{#each crumbs as crumb, index (index)}
			<li class="inline-flex flex-row items-center gap-2">
				{#if index > 0}
					<Ionicon name="chevron-forward" class="icon-xs shrink-0 text-muted-foreground" />
				{/if}
				{#if crumb.href}
					<a
						href={crumb.href}
						class="-my-4 inline-flex min-h-touch min-w-touch items-center text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
						>{crumb.label}</a
					>
				{:else}
					<span
						aria-current={index === crumbs.length - 1 ? 'page' : undefined}
						class="text-muted-foreground">{crumb.label}</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
