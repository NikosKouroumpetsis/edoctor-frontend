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

	/** U-66.1 Π8: the doctor's reply under a review of the list: who, when, and its words. */
	export type ReviewCardReply = {
		lead: string;
		author: string;
		dateLabel: string;
		body: string;
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
		/** The list's reply of the doctor, already approved by the server. */
		reply?: ReviewCardReply;
		/** The list's «Εμφάνιση περισσότερων», for a body cut at four lines. */
		expandLabel?: string;
		/** The list's search words: they stand out, and nothing is cut while they are searched (U-66.1 Π6). */
		query?: string;
		/** The rail's «Εμφάνιση περισσότερων», shown once the body is cut (`onMore`). */
		moreLabel?: string;
		onMore?: () => void;
		testId?: string;
		testIds?: Partial<Record<ReviewCardPart, string>>;
	};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { ExpandableText } from '$shared/ui/molecules/expandable-text';
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
		reply,
		expandLabel = '',
		query = '',
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

<!-- The application's review (M-15): the initial in a faint circle, the name and the date, the stars, the body. The
     window's list (🔴 U-66.1 Π7, Π8) has no frame: the initial of 48, the name, «★★★★★ · Πριν από 3 ημέρες», the words
     cut at four lines, and the doctor's reply indented with its thin line on the left. -->
{#if !isRail}
	<div
		data-slot="review-card"
		data-layout={layout}
		data-testid={testId}
		class={cn('flex w-full flex-col', className)}
		{...restProps}
	>
		<div class="flex flex-row items-center gap-3">
			<span
				aria-hidden="true"
				data-slot="review-card-initial"
				class="flex size-avatar-lg shrink-0 items-center justify-center rounded-full bg-foreground/8"
			>
				<span class="text-title-xs leading-tight font-semibold text-foreground"
					>{authorInitial}</span
				>
			</span>
			<p class="min-w-0 text-body-md font-semibold wrap-anywhere text-foreground">{authorName}</p>
		</div>
		<div class="mt-3 flex flex-row flex-wrap items-center gap-x-1.5 gap-y-1">
			<Rating
				variant="stars"
				starSize="xs"
				value={rating}
				aria-label={ratingLabel}
				class="gap-0.5"
			/>
			<span aria-hidden="true" class="text-body-sm text-muted-foreground">·</span>
			<Text variant="caption" as="span">{dateLabel}</Text>
		</div>
		{#if body}
			<ExpandableText
				text={body}
				moreLabel={expandLabel}
				{query}
				whole={Boolean(query)}
				textClass="text-body-sm leading-relaxed tablet:text-body-lg tablet:leading-normal"
				testId={testIds.body}
				class="mt-2"
			/>
		{/if}
		{#if aspects}
			<p data-testid={testIds.aspects} class="mt-3 text-body-sm text-muted-foreground">{aspects}</p>
		{/if}
		{#if reply}
			<div data-slot="review-card-reply" class="mt-4 border-l-2 border-border pl-4">
				<p class="text-body-sm wrap-anywhere text-muted-foreground">
					{reply.lead}
					<span class="font-semibold text-foreground">{reply.author}</span>
					{#if reply.dateLabel}· {reply.dateLabel}{/if}
				</p>
				<ExpandableText
					text={reply.body}
					moreLabel={expandLabel}
					textClass="text-body-sm leading-relaxed text-foreground/88 tablet:text-body-lg tablet:leading-normal"
					class="mt-1"
				/>
			</div>
		{/if}
	</div>
{:else}
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
				<span class="text-body-sm leading-tight font-semibold text-foreground">{authorInitial}</span
				>
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
{/if}
