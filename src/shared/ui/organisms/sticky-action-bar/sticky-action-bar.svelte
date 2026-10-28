<script lang="ts" module>
	/** The call to action: a button with `onclick`, or a link with `href` (already resolved by the caller). */
	export type StickyActionBarCta = {
		label: string;
		onclick?: () => void;
		href?: string;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { containerWidthClasses, type ContainerWidth } from '$shared/ui/molecules/container';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		summary,
		price,
		supporting,
		notice = null,
		cta,
		loading = false,
		width = 'content',
		height = $bindable(0),
		ctaTestId,
		class: className,
		...restProps
	}: Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		/** The first line, muted (the visit's kind). */
		summary: string;
		/** The fee line (a `PriceLabel`). */
		price?: Snippet;
		/** The last line, one line (the next free slot). */
		supporting?: string;
		/** Replaces the last line (up to 3 lines) and refuses the call to action. */
		notice?: string | null;
		cta: StickyActionBarCta;
		/** Skeleton lines and a skeleton pill while the page loads. */
		loading?: boolean;
		/** The row's cap (`content`, the application's). */
		width?: ContainerWidth;
		/** The bar's measured height (it grows with zoom and long words), the room the page end keeps below 950. */
		height?: number;
		ctaTestId?: string;
	} = $props();
</script>

<!-- Below 950 the bar is pinned to the bottom edge (M-07) and this keeps its room at the page end: the shared
     `bar-booking` height, or the measured one when the bar grew. -->
<div
	data-slot="sticky-action-bar-room"
	aria-hidden="true"
	class="min-h-bar-booking split:hidden"
	style:height={height ? `${height}px` : undefined}
></div>

<!-- One bar, two places by CSS: pinned below 950; from 950 the card the two-column page keeps in its sticky aside. -->
<div
	bind:clientHeight={height}
	data-slot="sticky-action-bar"
	class={cn(
		'fixed inset-x-0 bottom-0 z-30 border-t border-border/20 bg-card',
		'split:static split:z-auto split:rounded-xl split:border split:border-border/60 split:shadow-soft',
		className
	)}
	{...restProps}
>
	<div
		data-slot="sticky-action-bar-row"
		class={cn(
			'mx-auto flex w-full flex-row flex-wrap items-center gap-4 px-6 pt-4 pb-safe-area-sticky tablet:pb-6 split:p-card',
			containerWidthClasses.phone[width]
		)}
	>
		<div
			data-slot="sticky-action-bar-summary"
			aria-busy={loading || undefined}
			class="flex min-w-2/5 flex-1 flex-col gap-0.5"
		>
			{#if loading}
				<Skeleton class="h-4 w-1/2 rounded-full" />
				<Skeleton class="h-5 w-2/3 rounded-full" />
				<Skeleton class="h-4 w-5/6 rounded-full" />
			{:else}
				<p class="truncate text-body-sm text-muted-foreground">{summary}</p>
				{@render price?.()}
				{#if notice}
					<p
						data-slot="sticky-action-bar-notice"
						class="line-clamp-3 text-body-sm text-foreground/80"
					>
						{notice}
					</p>
				{:else if supporting}
					<p class="truncate text-body-sm text-foreground/80">{supporting}</p>
				{/if}
			{/if}
		</div>

		{#if loading}
			<Skeleton
				data-slot="sticky-action-bar-cta-loading"
				class="h-control-md w-cta-w rounded-full tablet:h-control-lg tablet:w-cta-w-lg split:w-full"
			/>
		{:else}
			<Button
				tone="accent"
				radius="full"
				bordered={false}
				label={cta.label}
				href={cta.href}
				onclick={cta.onclick}
				disabled={Boolean(notice) || cta.disabled}
				data-testid={ctaTestId}
				class="ml-auto min-w-cta-w px-cta-inline py-4 tablet:min-w-cta-w-lg split:ml-0 split:w-full"
				textClass="text-body-lg max-tablet:leading-tight tablet:text-title-sm"
			/>
		{/if}
	</div>
</div>
