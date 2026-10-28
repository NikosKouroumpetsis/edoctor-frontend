<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	/** `rail` (260 wide, the body cut at three lines) or `list` (full width, the whole body and the aspects). */
	export type ReviewCardLayout = 'rail' | 'list';
	/** The parts a caller can name for its tests (the application's `testIDs`; the web measures without a twin). */
	export type ReviewCardPart = 'aspects' | 'body' | 'bodyBlock' | 'cta' | 'ctaSlot';

	// Rail cards rest at `review-card-min-h` and grow with the text; the list's are as tall as their content.
	const layoutClasses: Record<ReviewCardLayout, string> = {
		rail: 'min-h-review-card-min-h w-review-card-w',
		list: 'w-full'
	};

	export type ReviewCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
		authorName: string;
		/** The letters in the faint circle. */
		authorInitial: string;
		/** Formatted by the caller («Μάρτιος 2026», S-32.9). */
		dateLabel: string;
		/** How many of the five stars are filled. */
		rating: number;
		/** The stars' name («5 στα 5»), already localized; without it they are decorative. */
		ratingLabel?: string;
		body: string;
		/** The list's line of what the review praises, already joined by the caller. */
		aspects?: string;
		layout?: ReviewCardLayout;
		/** The rail's «Εμφάνιση περισσότερων», shown once the body is cut (`onMore`). */
		moreLabel?: string;
		onMore?: () => void;
		testId?: string;
		testIds?: Partial<Record<ReviewCardPart, string>>;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Rating } from '$shared/ui/primitives/rating';
	import { Text } from '$shared/ui/primitives/text';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		authorName,
		authorInitial,
		dateLabel,
		rating,
		ratingLabel,
		body,
		aspects,
		layout = 'rail',
		moreLabel,
		onMore,
		testId,
		testIds = {},
		class: className,
		...restProps
	}: ReviewCardProps = $props();

	const isRail = $derived(layout === 'rail');
	let bodyElement = $state<HTMLElement | null>(null);
	let clipped = $state(false);
	const canShowMore = $derived(isRail && clipped);

	// The rail cuts the body at three lines: it is clipped when its text is taller than the three it shows. Measured
	// again when its box changes (a width, a zoom), the words do, or a font arrives — the clamped box keeps its three
	// lines when the text grows past them; the application measures a hidden twin instead.
	$effect(() => {
		const element = bodyElement;
		void body;
		if (!element || !isRail) {
			clipped = false;
			return;
		}
		const measure = () => {
			clipped = element.scrollHeight > element.clientHeight + 1;
		};
		measure();
		const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		observer?.observe(element);
		const fonts = 'fonts' in document ? document.fonts : undefined;
		fonts?.addEventListener('loadingdone', measure);
		return () => {
			observer?.disconnect();
			fonts?.removeEventListener('loadingdone', measure);
		};
	});
</script>

<!-- The application's review (M-15): the initial in a faint circle, the name and the date, the stars, the body. -->
<div
	data-slot="review-card"
	data-layout={layout}
	data-testid={testId}
	class={cn(
		'flex flex-col gap-4 rounded-lg bg-card/95 px-4 py-4',
		layoutClasses[layout],
		className
	)}
	{...restProps}
>
	<div class="flex flex-row items-start gap-3">
		<span
			aria-hidden="true"
			data-slot="review-card-initial"
			class="flex size-avatar-md shrink-0 items-center justify-center rounded-full bg-foreground/8"
		>
			<span class="text-body-sm leading-tight font-semibold text-foreground">{authorInitial}</span>
		</span>
		<div class="flex flex-1 flex-col gap-1">
			<p class="text-body-md font-semibold text-foreground">{authorName}</p>
			<Text variant="caption">{dateLabel}</Text>
		</div>
	</div>

	<Rating variant="stars" value={rating} aria-label={ratingLabel} />

	<div data-testid={testIds.bodyBlock}>
		<p
			bind:this={bodyElement}
			data-testid={testIds.body}
			class={cn(
				'text-body-sm leading-relaxed whitespace-pre-line text-foreground/88',
				isRail && 'line-clamp-3'
			)}
		>
			{body}
		</p>
		{#if isRail}
			<div data-testid={testIds.ctaSlot} class="flex min-h-touch flex-col justify-center">
				{#if canShowMore && moreLabel}
					<TextButton
						label={moreLabel}
						underline
						onclick={() => onMore?.()}
						data-testid={testIds.cta}
					/>
				{/if}
			</div>
		{/if}
	</div>

	{#if !isRail && aspects}
		<p data-testid={testIds.aspects} class="text-body-sm text-muted-foreground">{aspects}</p>
	{/if}
</div>
