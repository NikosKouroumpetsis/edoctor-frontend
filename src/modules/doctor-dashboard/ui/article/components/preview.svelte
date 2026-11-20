<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { cleanArticleTextDoc, type ArticleTextDoc } from '$shared/lib/article-text';
	import { buildArticleRichText } from '$shared/lib/rich-text';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { Picture } from '$shared/ui/icons/picture';
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { Button } from '$shared/ui/primitives/button';
	import type { DoctorArticleKind } from '$modules/doctor-dashboard/api/articles';
	import { doctorArticleKindLabel } from '$modules/doctor-dashboard/lib/articles';

	let {
		locale,
		live,
		kind,
		title,
		description,
		content,
		cover,
		imageUrl,
		onClose
	}: {
		locale: SupportedLocale;
		/** The published article as it is (no change waiting): «Το άρθρο σας, όπως το ανοίγει ένας ασθενής.». */
		live: boolean;
		kind: DoctorArticleKind;
		title: string;
		description: string;
		content: ArticleTextDoc | null;
		cover: string | null;
		imageUrl: (imageId: string) => string | null;
		onClose: () => void;
	} = $props();

	const options = $derived({ locale });
	// A cover that does not load leaves its place, as on the form.
	let failedCover = $state<string | null>(null);
	// 🔴 D-W52-104: the text drawn by the public page's own renderer, from the closed schema (never markup).
	const blocks = $derived.by(() => {
		const doc = cleanArticleTextDoc(content);
		return doc
			? buildArticleRichText(doc, (id) => {
					const url = imageUrl(id);
					return url ? { url, width: null, height: null } : null;
				}).blocks
			: [];
	});
</script>

<!-- 🔴 D-W52-103 (U-221.1 «Προεπισκόπηση όπως η 77», `sw.js` `arPrevPage`): ONE band that stays on top, «Έτσι θα το δουν
     οι ασθενείς», and «Κλείσιμο»; under it the article as its public page draws it — the cover, the kind, the title, the
     short description and the text — ONLY to look at (`inert`: no field, no link, no frame). -->
<section
	data-testid="doctor-article-preview"
	aria-label={m.doctor_my_article_preview_title({}, options)}
>
	<div
		data-testid="doctor-article-preview-band"
		class="sticky top-0 z-20 -mx-gutter-sm border-b border-line bg-background px-gutter-sm py-3.5 tablet:top-bar-top"
	>
		<div class="flex flex-row items-center justify-between gap-3">
			<div class="min-w-0">
				<p class="text-body-md font-semibold text-foreground">
					{m.doctor_my_article_preview_title({}, options)}
				</p>
				<p class="text-label-lg text-muted-foreground">
					{live
						? m.doctor_my_article_preview_live({}, options)
						: m.doctor_my_article_preview_note({}, options)}
				</p>
			</div>
			<Button
				label={m.doctor_my_profile_preview_close({}, options)}
				tone="outline"
				radius="full"
				hover={false}
				onclick={onClose}
				data-testid="doctor-article-preview-close"
				class="shrink-0"
			/>
		</div>
	</div>
	<div data-testid="doctor-article-preview-body" inert class="pt-section">
		{#if cover && failedCover === cover}
			<span
				aria-hidden="true"
				data-testid="doctor-article-preview-cover-missing"
				class="flex aspect-video max-h-cover-max w-full items-center justify-center rounded-lg bg-muted text-line-2"
			>
				<Picture />
			</span>
		{:else if cover}
			<img
				src={cover}
				alt=""
				onerror={() => (failedCover = cover)}
				class="aspect-video w-full rounded-lg bg-muted object-cover"
			/>
		{/if}
		<p class="mt-4 text-label-lg font-semibold text-muted-foreground">
			{doctorArticleKindLabel(kind, locale)}
		</p>
		<h1 class="mt-1.5 text-heading-lg font-semibold wrap-anywhere text-foreground">
			{title.trim() || m.doctor_my_article_preview_untitled({}, options)}
		</h1>
		{#if description.trim()}
			<p class="mt-2 text-body-lg text-foreground">{description}</p>
		{/if}
		<div class="mt-4">
			{#if blocks.length > 0}
				<RichText {blocks} variant="article" userContent testId="doctor-article-preview-text" />
			{:else}
				<p class="text-body-md text-muted-foreground">
					{m.doctor_my_article_preview_empty({}, options)}
				</p>
			{/if}
		</div>
	</div>
</section>
