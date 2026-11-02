<script lang="ts">
	import { cn } from '$shared/lib/utils';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';
	import { MediaCard } from '$shared/ui/organisms/media-card';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import type { ArticleCardProps } from '../types';

	let { article, href, variant = 'rail', readLabel, testId }: ArticleCardProps = $props();

	const list = $derived(variant === 'list');
	const grid = $derived(variant === 'grid');
	const framed = $derived(variant === 'framed');
	// The photo the browser could not load: the muted frame with its glyph instead (S-32.13).
	let broken = $state<string | null>(null);
	const photo = $derived(article.imageUrl && broken !== article.imageUrl ? article.imageUrl : null);
	const frame = $derived(
		cn('rounded-lg', framed ? 'h-article-list-media tablet:aspect-4/3 tablet:h-auto' : 'aspect-4/3')
	);
</script>

<!-- U-20: an article — the whole card one link, the 4:3 photo, the title on two lines at most, then «author · reading
     time». Without a photo (or when it does not load) the application's muted frame with a page glyph, never a
     doctor's silhouette (U-03.11). 🔴 U-57.2 / U-63.2: the list's card (`list`) is the prototype 06 v3's at EVERY width —
     no frame, no shadow, no «Διαβάστε»: the photo with the kind's badge, the title 16/600, two lines of the short
     description, «author · reading time»; «Περισσότερα άρθρα» (`grid`) the same from 744 and the home's card below it,
     as the application's rail. `framed` (the application's framed list card below 744, U-58.1 of round 1) is kept,
     unused (U-63.1, U-30.2). 🔴 MINOR-2 of r1: the photo is a `RevealingPhoto` — shown without JavaScript. -->
{#snippet photoMedia()}
	<div data-slot="media-card-frame" class={cn('relative w-full overflow-hidden bg-muted', frame)}>
		<RevealingPhoto
			url={photo ?? ''}
			alt=""
			onError={(url) => (broken = url)}
			testId="article-card-photo"
		/>
	</div>
{/snippet}

<MediaCard
	{href}
	linkLabel={article.title}
	imageUrl={null}
	imageClass={frame}
	media={photo ? photoMedia : undefined}
	data-testid={testId ?? (variant === 'rail' ? 'home-article-card' : 'article-card')}
	data-variant={variant}
	class={cn(
		'w-full gap-2.5',
		framed && 'max-tablet:rounded-xl max-tablet:bg-card max-tablet:p-3 max-tablet:shadow-raised'
	)}
>
	{#snippet photoFallback()}
		<Ionicon
			name="document-text-outline"
			data-slot="home-article-card-placeholder"
			class="icon-xl text-muted-foreground"
		/>
	{/snippet}
	{#snippet badge()}
		{#if (list || grid || framed) && article.typeLabel}
			<MediaBadge
				label={article.typeLabel}
				data-testid="article-card-type"
				class={grid ? 'max-tablet:hidden' : undefined}
			/>
		{/if}
	{/snippet}
	<div
		data-slot="article-card-words"
		class={cn('flex flex-col', framed && 'max-tablet:px-1 max-tablet:pt-1')}
	>
		<p
			class={cn(
				'line-clamp-2 font-semibold text-foreground',
				variant === 'rail' && 'text-body-sm',
				grid && 'text-body-sm tablet:text-body-lg',
				list && 'text-body-lg',
				framed && 'text-body-lg max-tablet:leading-tight'
			)}
		>
			{article.title}
		</p>
		{#if framed && article.listMeta}
			<p
				data-slot="article-card-list-meta"
				class="mt-1.5 line-clamp-1 text-label-md text-muted-foreground tablet:hidden"
			>
				{article.listMeta}
			</p>
		{/if}
		{#if (list || grid || framed) && article.excerpt}
			<p
				class={cn(
					'line-clamp-2 text-body-sm text-muted-foreground',
					framed ? 'mt-1.5 tablet:-mt-1' : '-mt-1',
					grid && 'max-tablet:hidden'
				)}
			>
				{article.excerpt}
			</p>
		{/if}
		{#if article.meta}
			<p
				data-slot="article-card-meta"
				class={cn(
					'line-clamp-2 text-label-lg leading-tight font-normal text-muted-foreground',
					framed && 'max-tablet:hidden'
				)}
			>
				{article.meta}
			</p>
		{/if}
		{#if framed && readLabel}
			<span
				data-slot="article-card-read"
				class="mt-1.5 inline-flex min-h-touch items-center self-start text-label-lg font-semibold text-foreground underline tablet:hidden"
			>
				{readLabel}
			</span>
		{/if}
	</div>
</MediaCard>
