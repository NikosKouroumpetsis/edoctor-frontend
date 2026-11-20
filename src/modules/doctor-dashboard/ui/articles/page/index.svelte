<script lang="ts">
	import PlusIcon from '~icons/lucide/plus';
	import { m } from '$paraglide/messages.js';
	import { EmptyState } from '$shared/ui/molecules/empty-state';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import Row from '../components/row.svelte';
	import { useDoctorArticles } from '../hooks';
	import type { DoctorArticlesProps } from '../types';

	let { locale, links }: DoctorArticlesProps = $props();

	const options = $derived({ locale });
	const articles = useDoctorArticles({ locale: () => locale });
</script>

{#snippet penGlyph()}
	<StateGlyph name="create-outline" />
{/snippet}
{#snippet errorGlyph()}
	<StateGlyph name="cloud-offline-outline" />
{/snippet}
{#snippet plus()}
	<PlusIcon class="icon-sm" />
{/snippet}
{#snippet newArticle()}
	<!-- «+ Νέο άρθρο»: a page of its own (U-102), already resolved in the page's language. -->
	<Button
		label={m.doctor_my_articles_new({}, options)}
		tone="contrast"
		bordered={false}
		radius="full"
		hover={false}
		leading={plus}
		href={links.newArticle}
		textClass="text-body-md"
		class="mt-5 self-start"
		data-testid="doctor-articles-new"
	/>
{/snippet}

<!-- 🔴 Wave 5.2 · screen 85 «Τα άρθρα μου» (U-221, U-222, D-W52-102; `64-switch/sw.js` `artPage`): ONE column of 720 in the
     middle of the screen (U-215), «‹» to «Μενού» only below 950 (U-217) — the title and its line, «+ Νέο άρθρο», the
     doctor's articles newest first, each its state («Πρόχειρο» · «Σε έλεγχο» · «Δημοσιευμένο» / «Η αλλαγή σας ελέγχεται»
     · «Δεν δημοσιεύτηκε»), with «Εμφάνιση παλαιότερων»; none yet ⇒ «Δεν έχετε γράψει ακόμη άρθρα». Every word a text node
     (U-65.6); no colour under the pointer (U-100). -->
<main
	data-testid="doctor-articles"
	data-view={articles.view}
	class="mx-auto flex w-full max-w-document-wide flex-col px-gutter-sm pt-3 pb-section tablet:pt-section"
>
	<IconButton
		icon="chevron-back"
		appearance="tint"
		surface="soft"
		size="sm"
		iconSize="md"
		aria-label={m.doctor_my_profile_back({}, options)}
		href={links.menu}
		data-testid="doctor-articles-back"
		class="mb-3 flex split:hidden"
	/>
	<h1 class="text-heading-lg font-semibold text-foreground tablet:text-heading-xl">
		{m.doctor_my_articles_title({}, options)}
	</h1>

	{#if articles.view === 'loading'}
		<div
			data-testid="doctor-articles-loading"
			aria-busy="true"
			aria-label={m.doctor_my_articles_title({}, options)}
			class="mt-4 grid gap-3"
		>
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
			<Skeleton class="h-row-lg w-full rounded-md" />
		</div>
	{:else if articles.view === 'failed'}
		<EmptyState
			titleAs="h2"
			title={m.doctor_dashboard_load_error({}, options)}
			actionLabel={m.doctor_dashboard_retry({}, options)}
			onActionPress={() => articles.retry()}
			actionTone="contrast"
			icon={errorGlyph}
			class="pt-section-lg"
			testId="doctor-articles-failed"
			actionTestId="doctor-articles-retry"
		/>
	{:else if articles.view === 'empty'}
		<div data-testid="doctor-articles-empty" class="flex flex-col items-center pt-section-lg">
			<EmptyState
				titleAs="h2"
				title={m.doctor_my_articles_empty_title({}, options)}
				description={m.doctor_my_articles_empty_body({}, options)}
				icon={penGlyph}
			/>
			<div class="flex flex-row justify-center">{@render newArticle()}</div>
		</div>
	{:else}
		<p class="mt-1 text-body-md text-muted-foreground">
			{m.doctor_my_articles_lead({}, options)}
		</p>
		{@render newArticle()}
		<ul
			data-testid="doctor-articles-list"
			aria-label={m.doctor_my_articles_title({}, options)}
			class="mt-6"
		>
			{#each articles.rows as row (row.id)}
				<Row {row} href={links.article(row.id)} />
			{/each}
		</ul>
		{#if articles.hasMore}
			<div class="mt-6 flex flex-row justify-center">
				<Button
					label={m.doctor_my_reviews_more({}, options)}
					tone="outline"
					radius="md"
					hover={false}
					textClass="text-body-md"
					loading={articles.loadingMore}
					onclick={() => articles.loadMore()}
					data-testid="doctor-articles-more"
				/>
			</div>
		{/if}
	{/if}
</main>
