<script lang="ts" module>
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** The call to action: a button with `onclick`, or a link with `href` (already resolved by the caller). */
	export type StickyActionBarCta = {
		label: string;
		onclick?: (event: MouseEvent) => void;
		href?: string;
		disabled?: boolean;
		/** A glyph before the words (the profile's «📞 Κλήση ιατρείου», wave 1.5). */
		icon?: IoniconName;
	};

	/**
	 * `row` (the default): the lines beside the call to action. `stack` (wave 1.5, U-42.2): the summary is the bar's
	 * statement (two lines at most), the call to action takes the width, the `secondary` snippet (a link) under it.
	 */
	export type StickyActionBarLayout = 'row' | 'stack';

	/**
	 * Where the bar lives: `split` (the default) pinned below 950 and the aside's card from 950; `tablet` (wave 1.5,
	 * the profile) pinned below 744 and nothing from 744, where the page draws its own card.
	 */
	export type StickyActionBarZone = 'split' | 'tablet';

	/**
	 * Where the bar keeps its room: `inline` (the default) a spacer where the bar is drawn; `page` (MINOR-8 of r1, a
	 * page whose footer follows its content) the measured height as `--page-bar-room` on the document, the room the
	 * page's end keeps (`pb-page-bar`), so the bar never covers the footer's end.
	 */
	export type StickyActionBarRoom = 'inline' | 'page';

	const barZoneClasses: Record<StickyActionBarZone, string> = {
		split:
			'split:static split:z-auto split:rounded-xl split:border split:border-border/60 split:shadow-soft',
		tablet: 'tablet:hidden'
	};
	const roomZoneClasses: Record<StickyActionBarZone, string> = {
		split: 'split:hidden',
		tablet: 'tablet:hidden'
	};
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn } from '$shared/lib/utils';
	import { containerWidthClasses, type ContainerWidth } from '$shared/ui/molecules/container';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Button } from '$shared/ui/primitives/button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let {
		summary,
		price,
		supporting,
		notice = null,
		cta,
		layout = 'row',
		zone = 'split',
		room = 'inline',
		supportingAction,
		secondary,
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
		layout?: StickyActionBarLayout;
		zone?: StickyActionBarZone;
		room?: StickyActionBarRoom;
		/** The last line becomes a text button (the profile's time line opens its day-and-time window). */
		supportingAction?: () => void;
		/** `stack`: under the call to action (a link of the caller's). */
		secondary?: Snippet;
		/** Skeleton lines and a skeleton pill while the page loads. */
		loading?: boolean;
		/** The row's cap (`content`, the application's). */
		width?: ContainerWidth;
		/** The bar's measured height (it grows with zoom and long words), the room the page end keeps below 950. */
		height?: number;
		ctaTestId?: string;
	} = $props();

	// `room="page"`: the bar's height is the page end's room while the bar lives (and only then).
	$effect(() => {
		if (room !== 'page' || !height) return;
		const root = document.documentElement;
		root.style.setProperty('--page-bar-room', `${height}px`);
		return () => root.style.removeProperty('--page-bar-room');
	});
</script>

{#snippet ctaIcon()}
	{#if cta.icon}<Ionicon name={cta.icon} class="icon-md" />{/if}
{/snippet}

<!-- Below 950 the bar is pinned to the bottom edge (M-07) and this keeps its room at the page end: the shared
     `bar-booking` height, or the measured one when the bar grew. -->
{#if room === 'inline'}
	<div
		data-slot="sticky-action-bar-room"
		aria-hidden="true"
		class={cn('min-h-bar-booking', roomZoneClasses[zone])}
		style:height={height ? `${height}px` : undefined}
	></div>
{/if}

<!-- One bar, two places by CSS: pinned below 950; from 950 the card the two-column page keeps in its sticky aside. -->
<div
	bind:clientHeight={height}
	data-slot="sticky-action-bar"
	class={cn(
		'fixed inset-x-0 bottom-0 z-30 border-t border-border/20 bg-card',
		barZoneClasses[zone],
		className
	)}
	{...restProps}
>
	<div
		data-slot="sticky-action-bar-row"
		data-layout={layout}
		class={cn(
			'mx-auto flex w-full px-6 pt-4 pb-safe-area-sticky tablet:pb-6 split:p-card',
			layout === 'stack' ? 'flex-col items-stretch gap-3' : 'flex-row flex-wrap items-center gap-4',
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
				{#if layout === 'stack'}
					<p
						data-slot="sticky-action-bar-statement"
						class="line-clamp-2 text-body-md font-semibold text-foreground"
					>
						{summary}
					</p>
				{:else}
					<p class="truncate text-body-sm text-muted-foreground">{summary}</p>
				{/if}
				{@render price?.()}
				{#if notice}
					<p
						data-slot="sticky-action-bar-notice"
						class="line-clamp-3 text-body-sm text-foreground/80"
					>
						{notice}
					</p>
				{:else if supporting && supportingAction}
					<!-- Its words keep the line's height (the 48 box reaches past it, -12 above and below). -->
					<button
						type="button"
						data-slot="sticky-action-bar-supporting"
						onclick={() => supportingAction?.()}
						class="-my-3 inline-flex min-h-touch min-w-touch items-center self-start rounded-sm text-left text-body-sm text-foreground/80 underline outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:decoration-2"
					>
						<span class="line-clamp-1">{supporting}</span>
					</button>
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
				class={layout === 'stack'
					? 'w-full px-cta-inline py-4'
					: 'ml-auto min-w-cta-w px-cta-inline py-4 tablet:min-w-cta-w-lg split:ml-0 split:w-full'}
				textClass="text-body-lg max-tablet:leading-tight tablet:text-title-sm"
				leading={cta.icon ? ctaIcon : undefined}
			/>
			{#if layout === 'stack' && secondary}
				<div
					data-slot="sticky-action-bar-secondary"
					class="flex flex-row flex-wrap items-center justify-center gap-x-5"
				>
					{@render secondary()}
				</div>
			{/if}
		{/if}
	</div>
</div>
