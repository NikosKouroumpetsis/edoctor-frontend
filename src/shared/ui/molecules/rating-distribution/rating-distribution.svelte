<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IoniconName } from '$shared/ui/icons/ionicon';

	/** One star of the distribution: its `share` (0–1) and its `star` and `count`, printed as given. */
	export type RatingBucket = { star: number | string; share: number; count: number | string };
	/** One category column: its glyph, its words and its score, formatted by the caller. */
	export type RatingCategory = { id: string; title: string; score: string; icon: IoniconName };
	/**
	 * The padding of the surface the band runs edge to edge in (the application's `bleed`, a number): `gutter-sm` —
	 * the web's modal screen (24) — or `zone` — a page with the zone gutter (24 · 32 from 950 · 48 from 1440).
	 */
	export type RatingDistributionBleed = 'none' | 'gutter-sm' | 'zone';

	// The band escapes the caller's padding and puts it back, so its content stays level with the text around it.
	const bleedClasses: Record<RatingDistributionBleed, string> = {
		none: '',
		'gutter-sm': '-mx-gutter-sm px-gutter-sm',
		zone: '-mx-gutter-sm px-gutter-sm split:-mx-gutter-md split:px-gutter-md desktop:-mx-gutter-lg desktop:px-gutter-lg'
	};

	export type RatingDistributionProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		title: string;
		buckets: readonly RatingBucket[];
		categories: readonly RatingCategory[];
		bleed?: RatingDistributionBleed;
		/** The name of the scrolling row of categories, already localized (it takes the keyboard's focus). */
		categoriesLabel: string;
		testId?: string;
		/** `<prefix>-bar-<star>`, `-bar-count-<star>`, `-categories`, `-category-<id>`, `-category-separator`. */
		testIdPrefix?: string;
	};
</script>

<script lang="ts">
	import { useId } from '$shared/lib/headless';
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { Progress } from '$shared/ui/primitives/progress';
	import { Separator } from '$shared/ui/primitives/separator';
	import { Text } from '$shared/ui/primitives/text';

	let {
		title,
		buckets,
		categories,
		bleed = 'none',
		categoriesLabel,
		testId,
		testIdPrefix,
		class: className,
		...restProps
	}: RatingDistributionProps = $props();

	const testIdOf = (part: string) => (testIdPrefix ? `${testIdPrefix}-${part}` : undefined);
	// Each bar is named by its star (a progress bar needs a name), its count read after it.
	const baseId = useId(undefined, 'rating-distribution');
	const starIdOf = (star: number | string) => `${baseId}-star-${star}`;
</script>

<!-- The application's ratings band (M-16): one accent bar per star beside its star and count, then the categories
     as scrollable columns behind a hairline each. -->
<div
	data-slot="rating-distribution"
	data-testid={testId}
	class={cn('flex flex-row items-stretch bg-muted/40 py-4', bleedClasses[bleed], className)}
	{...restProps}
>
	<div class="flex w-ratings-col shrink-0 flex-col gap-3">
		<p class="text-body-sm font-semibold text-muted-foreground">{title}</p>
		<div class="flex flex-col gap-1.5">
			{#each buckets as bucket (bucket.star)}
				<div data-testid={testIdOf(`bar-${bucket.star}`)} class="flex flex-row items-center gap-2">
					<Text variant="caption" as="span" id={starIdOf(bucket.star)} class="w-3 text-right"
						>{bucket.star}</Text
					>
					<div class="flex-1">
						<Progress
							max={1}
							size="sm"
							tone="accent"
							value={bucket.share}
							aria-labelledby={starIdOf(bucket.star)}
						/>
					</div>
					<Text
						variant="caption"
						as="span"
						class="min-w-6 truncate text-right"
						data-testid={testIdOf(`bar-count-${bucket.star}`)}>{bucket.count}</Text
					>
				</div>
			{/each}
		</div>
	</div>

	{#if categories.length > 0}
		<!-- The row scrolls, so it takes the keyboard's focus (axe `scrollable-region-focusable`): no item of it does. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			role="group"
			aria-label={categoriesLabel}
			tabindex="0"
			data-slot="rating-distribution-categories"
			data-testid={testIdOf('categories')}
			class="scrollbar-none min-w-0 flex-1 overflow-x-auto overscroll-x-contain rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			<div class="flex w-max flex-row items-stretch pr-3">
				{#each categories as category (category.id)}
					<div class="flex flex-row items-stretch">
						<div class="flex items-center justify-center self-stretch px-4">
							<Separator
								orientation="vertical"
								spacing="none"
								data-testid={testIdOf('category-separator')}
							/>
						</div>
						<div
							data-testid={testIdOf(`category-${category.id}`)}
							class="flex w-ratings-col-sm shrink-0 flex-col gap-1"
						>
							<p class="text-body-sm font-semibold text-muted-foreground">{category.title}</p>
							<p class="text-body-md font-semibold text-foreground">{category.score}</p>
							<div class="pt-3">
								<Ionicon name={category.icon} class="icon-lg text-foreground" />
							</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
