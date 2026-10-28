<script lang="ts" module>
	import type { HTMLAttributes } from 'svelte/elements';

	type ThumbnailCardAction =
		| { actionLabel: string; onAction: () => void; actionHref?: undefined }
		| { actionLabel: string; actionHref: string; onAction?: undefined }
		| { actionLabel?: undefined; onAction?: undefined; actionHref?: undefined };

	export type ThumbnailCardProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'title'> &
		ThumbnailCardAction & {
			imageUrl: string;
			/** The photo's height (a `media` name, `h-article-group-media`); the card's `class` sets its width. */
			imageClass: string;
			/** The photo's text alternative; decorative (`''`) when the title already says it. */
			imageAlt?: string;
			title: string;
			/** The tag of the title (the look stays the same): `p`, or a heading level of the page. */
			titleAs?: string;
			description?: string;
			loading?: 'lazy' | 'eager';
		};
</script>

<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { TextButton } from '$shared/ui/primitives/text-button';

	let {
		imageUrl,
		imageClass,
		imageAlt = '',
		title,
		titleAs = 'p',
		description,
		actionLabel,
		onAction,
		actionHref,
		loading = 'lazy',
		class: className,
		...restProps
	}: ThumbnailCardProps = $props();

	// 🔴 U-03.11: a photo that does not load leaves the muted box as the application always drew it (no
	// silhouette here, unlike `MediaCard`, S-32.13); the browser's broken-image mark is hidden.
	let failedUrl = $state<string | null>(null);
	const failed = $derived(failedUrl === imageUrl);
</script>

<div data-slot="thumbnail-card" class={cn('flex flex-col gap-3', className)} {...restProps}>
	<div
		data-slot="thumbnail-card-media"
		data-failed={failed ? 'true' : 'false'}
		class={cn('w-full overflow-hidden rounded-xl bg-muted', imageClass)}
	>
		<img
			src={imageUrl}
			alt={imageAlt}
			{loading}
			decoding="async"
			onerror={() => (failedUrl = imageUrl)}
			class={cn('block size-full object-cover', failed && 'invisible')}
		/>
	</div>

	<div class="flex flex-col gap-2 px-0.5">
		<div class="flex flex-col gap-1.5">
			<svelte:element
				this={titleAs}
				class="line-clamp-2 text-body-sm leading-tight font-semibold text-foreground"
				>{title}</svelte:element
			>
			{#if description !== undefined}
				<p class="line-clamp-3 text-label-md leading-normal text-muted-foreground">
					{description}
				</p>
			{/if}
		</div>

		{#if actionLabel !== undefined}
			<TextButton
				label={actionLabel}
				href={actionHref}
				onclick={actionHref ? undefined : () => onAction?.()}
				textClass="text-label-md"
				underline
				class="self-start"
			/>
		{/if}
	</div>
</div>
