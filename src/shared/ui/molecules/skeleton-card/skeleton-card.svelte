<script lang="ts" module>
	export type CardLayout = 'carousel' | 'list';
	/** A card's width and its photo's height, as classes (the zone is CSS: a step larger from the tablet). */
	export type CardSizeClasses = { mediaClass: string; widthClass: string };

	const cardSizes: Record<CardLayout, CardSizeClasses> = {
		carousel: {
			mediaClass: 'h-card-rail-media tablet:h-card-rail-media-lg',
			widthClass: 'w-card-rail-w tablet:w-card-rail-w-lg'
		},
		list: {
			mediaClass: 'h-card-list-media tablet:h-card-list-media-lg',
			widthClass: 'w-full'
		}
	};

	/**
	 * 🔴 D13: the ONE size map of a media card in a rail (`carousel`) and in a list (`list`), a step larger from the
	 * tablet: the card (`<MediaCard imageClass={mediaClass} class={widthClass}>`) and its placeholder both read it, so
	 * a placeholder is always the size of what replaces it. The zone is CSS, so the server draws the right one.
	 */
	export function cardSizeOf(layout: CardLayout): CardSizeClasses {
		return cardSizes[layout];
	}
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { SkeletonLines } from '$shared/ui/molecules/skeleton-lines';
	import { Skeleton } from '$shared/ui/primitives/skeleton';

	let { layout = 'carousel', testId }: { layout?: CardLayout; testId?: string } = $props();

	const size = $derived(cardSizeOf(layout));
</script>

<!-- The application's card placeholder in the card's own size: the photo block, four lines and a row of three short
     facts. It keeps its width in a row (the application's views never shrink). Decorative. -->
<div
	data-slot="skeleton-card"
	data-testid={testId}
	aria-hidden="true"
	class={cn('flex shrink-0 flex-col gap-2.5', size.widthClass)}
>
	<Skeleton class={cn('w-full rounded-xl', size.mediaClass)} />
	<SkeletonLines
		lines={[
			{ height: 'h-6', width: 'w-4/5' },
			{ height: 'h-5', width: 'w-3/5' },
			{ width: 'w-2/3' },
			{ width: 'w-1/2' }
		]}
	>
		<SkeletonLines
			class="flex-row flex-wrap items-center gap-3 pt-1"
			lines={[{ width: 'w-1/3' }, { width: 'w-1/5' }, { width: 'w-1/5' }]}
		/>
	</SkeletonLines>
</div>
