<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Button } from '$shared/ui/primitives/button';
	import type { ArticleAuthor } from '$modules/articles/lib/article';

	let { author, locale }: { author: ArticleAuthor; locale: SupportedLocale } = $props();

	const options = $derived({ locale });
</script>

<!-- 🔴 U-57.4 (the prototype 06, Π9): the author's card — the initial in its 56 circle, «Γράφτηκε από», the name (a link
     to the profile) and the accent «Κλείστε ραντεβού» to the same profile; both ONLY with the slug the backend gives a
     doctor the marketplace shows. In the aside from 1128, at the end of the text below it. -->
<section
	aria-label={m.article_written_by({}, options)}
	data-testid="article-author"
	class="flex flex-col rounded-lg border border-border bg-card p-card"
>
	<div class="flex flex-row items-center gap-3.5">
		<span
			aria-hidden="true"
			class="grid size-tile shrink-0 place-items-center rounded-full bg-muted text-title-lg text-muted-foreground"
		>
			{author.initial}
		</span>
		<div class="flex min-w-0 flex-col">
			<span class="text-label-lg font-normal text-muted-foreground">
				{m.article_written_by({}, options)}
			</span>
			{#if author.href}
				<a
					href={author.href}
					data-testid="article-author-name"
					class="inline-flex min-h-touch min-w-touch items-center self-start rounded-sm text-body-lg font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
					>{author.name}</a
				>
			{:else}
				<span class="text-body-lg font-semibold text-foreground">{author.name}</span>
			{/if}
		</div>
	</div>
	{#if author.href}
		<Button
			href={author.href}
			label={m.article_author_book({}, options)}
			tone="accent"
			radius="full"
			textClass="text-body-md"
			class="mt-5 w-full"
			data-testid="article-author-book"
		/>
	{/if}
</section>
