<script lang="ts">
	import type { ResolvedPathname } from '$app/types';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';
	import { MediaBadge } from '$shared/ui/primitives/media-badge';
	import type { ArticleListCard } from '$modules/articles/lib/article-list';

	let {
		article,
		href,
		readLabel
	}: {
		article: ArticleListCard;
		href: ResolvedPathname;
		/** «Διαβάστε το άρθρο». */
		readLabel: string;
	} = $props();

	let broken = $state(false);
</script>

<!-- 🔴 U-57.2 (the prototype 06, Π2, Ε1 of U-57.5): the newest article, big — ONE link, as the card. From 744 the 16:9
     photo on the left and the words on the right (1fr/1fr, 32 apart; 7fr/5fr, 48 apart from 1128): the kind's badge,
     the title (22 · 28 from 1128), three lines of the short description, «Από … · ημέρα · N΄ ανάγνωσης» and the dark
     pill «Διαβάστε το άρθρο». Never while searching. 🔴 U-63.2: below 744 too, as the prototype's 375 — the photo, the
     text 14 under it, the description 8 and the line 10 under the title, the dark pill on the whole width 18 under. -->
<a
	{href}
	data-testid="articles-featured"
	class="group grid min-h-touch w-full grid-cols-1 gap-3.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 tablet:grid-cols-2 tablet:items-center tablet:gap-section laptop:grid-cols-[7fr_5fr] laptop:gap-section-lg"
>
	<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
		{#if article.imageUrl && !broken}
			<RevealingPhoto
				url={article.imageUrl}
				alt={article.imageAlt}
				eager
				onError={() => (broken = true)}
			/>
		{:else}
			<span class="grid size-full place-items-center">
				<Ionicon name="document-text-outline" class="icon-xl text-muted-foreground" />
			</span>
		{/if}
		<MediaBadge label={article.typeLabel} />
	</div>
	<div class="flex min-w-0 flex-col">
		<h2
			class="text-heading-sm text-foreground laptop:text-heading-lg can-hover:group-hover:underline"
		>
			{article.title}
		</h2>
		{#if article.excerpt}
			<p
				class="mt-2 line-clamp-3 text-body-md text-muted-foreground tablet:mt-3 tablet:text-body-lg"
			>
				{article.excerpt}
			</p>
		{/if}
		{#if article.featuredMeta}
			<p class="mt-2.5 text-label-lg font-normal text-muted-foreground tablet:mt-3">
				{article.featuredMeta}
			</p>
		{/if}
		<span
			class="mt-4.5 inline-flex min-h-control-md w-full items-center justify-center rounded-full bg-secondary px-6 text-body-md font-semibold text-secondary-foreground transition-colors duration-standard ease-standard tablet:mt-6 tablet:w-fit can-hover:group-hover:bg-secondary/90"
		>
			{readLabel}
		</span>
	</div>
</a>
