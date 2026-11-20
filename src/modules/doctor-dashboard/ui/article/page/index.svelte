<script lang="ts">
	import type { Editor as TiptapEditor } from '@tiptap/core';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { ActionBar } from '$shared/ui/molecules/action-bar';
	import { InlineNotice } from '$shared/ui/molecules/inline-notice';
	import { NoteField } from '$shared/ui/molecules/note-field';
	import { NoticeCard } from '$shared/ui/molecules/notice-card';
	import { RadioRows } from '$shared/ui/molecules/radio-rows';
	import { TextField } from '$shared/ui/molecules/text-field';
	import { Button } from '$shared/ui/primitives/button';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { Skeleton } from '$shared/ui/primitives/skeleton';
	import {
		DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH,
		DOCTOR_ARTICLE_TITLE_MAX_LENGTH
	} from '$modules/doctor-dashboard/config';
	import { doctorArticleKindOptions } from '$modules/doctor-dashboard/lib/articles';
	import { doctorArticlesPath } from '$modules/doctor-dashboard/lib/paths';
	import Cover from '../components/cover.svelte';
	import DeleteDialog from '../components/delete-dialog.svelte';
	import Note from '../components/note.svelte';
	import Preview from '../components/preview.svelte';
	import { useDoctorArticle } from '../hooks';
	import type { DoctorArticleProps } from '../types';

	let {
		locale,
		articleId,
		onEditorReady
	}: DoctorArticleProps & {
		/** Tests only: the editor once it exists. */
		onEditorReady?: (editor: TiptapEditor) => void;
	} = $props();

	const options = $derived({ locale });
	const href = (path: string) => resolve(localizeHref(path, { locale }) as Pathname);
	// «‹», «Άκυρο» and every write that ends go back to «Τα άρθρα μου» in the page's language.
	const listHref = $derived(href(doctorArticlesPath));
	const leave = () => void goto(listHref);
	const page = useDoctorArticle({
		locale: () => locale,
		articleId: () => articleId,
		onDone: leave
	});
	const kinds = $derived(doctorArticleKindOptions(locale));
	const title = $derived(
		articleId === null
			? m.doctor_my_article_title_new({}, options)
			: m.doctor_my_article_title_change({}, options)
	);
	const kindHeadId = 'doctor-article-kind-head';
	const textErrorId = 'doctor-article-text-error';
	const published = $derived(page.article?.status === 'PUBLISHED');
	// 🔴 The editor and its library load with an article's page alone (`import()`, `map-view`'s precedent): the list and
	// every other page of the doctor never carry them.
	const editorModule = import('../components/editor.svelte');
</script>

<!-- 🔴 Wave 5.2 · screen 85, ONE article (U-221, U-222, D-W52-103; `64-switch/sw.js` `arEditPage`): a PAGE (U-102), ONE
     column of 720 in the middle (U-215), «‹» to the list only below 744 (`sw.css:550`, U-217) — «Νέο άρθρο» / «Αλλαγή
     άρθρου», the state over it, «Είδος» in rows (U-112), «Τίτλος» ≤ 200, «Σύντομη περιγραφή» ≤ 300, the cover, «Κείμενο»
     with «Μη γράφετε στοιχεία ασθενών» and the editor, «Προεπισκόπηση», «Αποθήκευση πρόχειρου» (only before the first
     publication), «Διαγραφή άρθρου» (asked first), and «Άκυρο · Αποστολή για έλεγχο» at the bottom (pinned below 744).
     Greek alone, no choice of a language (U-207.3). Every word a text node (U-65.6); no colour under the pointer (U-100). -->
<main
	data-testid="doctor-article"
	data-view={page.view}
	class="mx-auto flex w-full max-w-document-wide flex-col px-gutter-sm pt-3 pb-page-bar tablet:pt-section tablet:pb-section"
>
	{#if page.view === 'form' && page.preview}
		<Preview
			{locale}
			live={published && !page.article?.hasPendingRevision}
			kind={page.values.kind}
			title={page.values.title}
			description={page.values.description}
			content={page.values.content}
			cover={page.cover}
			imageUrl={(id) => page.imageUrl(id)}
			onClose={() => page.closePreview()}
		/>
	{/if}
	<div hidden={page.view === 'form' && page.preview}>
		<IconButton
			icon="chevron-back"
			appearance="tint"
			surface="soft"
			size="sm"
			iconSize="md"
			aria-label={m.doctor_my_profile_back({}, options)}
			href={listHref}
			data-testid="doctor-article-back"
			class="mb-3 flex tablet:hidden"
		/>
		<h1 class="text-heading-lg font-semibold text-foreground tablet:text-heading-xl">{title}</h1>

		{#if page.view === 'loading'}
			<div
				data-testid="doctor-article-loading"
				aria-busy="true"
				aria-label={title}
				class="mt-4 grid gap-3"
			>
				<Skeleton class="h-control-lg w-full rounded-md" />
				<Skeleton class="h-control-lg w-full rounded-md" />
				<Skeleton class="h-article-editor w-full rounded-lg" />
			</div>
		{:else if page.view === 'failed'}
			<div class="mt-4">
				<InlineNotice
					variant="danger"
					message={m.doctor_dashboard_load_error({}, options)}
					actionLabel={m.doctor_dashboard_retry({}, options)}
					onAction={() => page.retry()}
					testId="doctor-article-error"
					actionTestId="doctor-article-retry"
				/>
			</div>
		{:else if page.view === 'gone'}
			<div class="mt-4">
				<NoticeCard
					tone="warm"
					role="alert"
					title={m.doctor_my_article_gone({}, options)}
					testId="doctor-article-gone"
				/>
			</div>
		{:else if page.seeded}
			{#if page.note}
				<Note note={page.note} />
			{/if}

			<!-- `sw.css:527`, `:626` `.w-slh`: a section's quiet name, 15/600 muted, 24 over it and 8 under it. -->
			<h2 id={kindHeadId} class="mt-6 mb-2 text-body-md font-semibold text-muted-foreground">
				{m.doctor_my_article_kind({}, options)}
			</h2>
			<RadioRows
				labelledby={kindHeadId}
				value={page.values.kind}
				options={kinds}
				onChange={(kind) => page.setKind(kind === 'HEALTH_ADVICE' ? 'HEALTH_ADVICE' : 'ARTICLE')}
				frame="always"
				notePlace="under"
				testId="doctor-article-kind"
			/>

			<div class="mt-6">
				<TextField
					bind:value={() => page.values.title, (typed) => page.setTitle(typed)}
					label={m.doctor_my_article_title_label({}, options)}
					error={page.errors.title}
					size="lg"
					autocomplete="off"
					maxlength={DOCTOR_ARTICLE_TITLE_MAX_LENGTH}
					data-testid="doctor-article-title"
				/>
			</div>

			<div class="mt-6">
				<NoteField
					label={m.doctor_my_article_description({}, options)}
					labelAs="h2"
					labelLook="section"
					placeholder={m.doctor_my_article_description_placeholder({}, options)}
					value={page.values.description}
					counter={m.doctor_my_service_count(
						{
							count: page.values.description.length,
							limit: DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH
						},
						options
					)}
					error={page.errors.description ?? null}
					help={m.doctor_my_article_description_help({}, options)}
					maxLength={DOCTOR_ARTICLE_SHORT_DESCRIPTION_MAX_LENGTH}
					onInput={(typed) => page.setDescription(typed)}
					testId="doctor-article-description"
				/>
			</div>

			<Cover
				{locale}
				url={page.cover}
				error={page.coverError}
				onPick={(file) => void page.pickCover(file)}
				onRemove={() => page.removeCover()}
			/>

			<h2 class="mt-6 mb-2 text-body-md font-semibold text-muted-foreground">
				{m.doctor_my_article_text({}, options)}
			</h2>
			<p data-testid="doctor-article-privacy" class="mt-1 text-body-sm text-muted-foreground">
				{m.doctor_my_article_text_lead({}, options)}
			</p>
			{#await editorModule}
				<Skeleton class="mt-3 h-article-editor w-full rounded-lg" />
			{:then { default: Editor }}
				<Editor
					{locale}
					content={page.values.content}
					imageUrl={(id) => page.imageUrl(id)}
					invalid={Boolean(page.errors.text)}
					describedBy={page.errors.text ? textErrorId : undefined}
					onChange={(doc) => page.setContent(doc)}
					onUpload={(file) => page.upload(file)}
					onReady={onEditorReady}
				/>
			{:catch}
				<!-- The editor's code did not arrive (the connection): the page says so; the rest of the form stays. -->
				<div class="mt-3">
					<InlineNotice
						variant="danger"
						message={m.doctor_dashboard_load_error({}, options)}
						testId="doctor-article-editor-failed"
					/>
				</div>
			{/await}
			{#if page.errors.text}
				<p
					id={textErrorId}
					role="alert"
					data-testid="doctor-article-text-error"
					class="mt-2 text-label-lg font-medium text-danger-text"
				>
					{page.errors.text}
				</p>
			{/if}

			<div class="mt-6 grid gap-3">
				<Button
					label={m.doctor_my_article_preview({}, options)}
					tone="outline"
					radius="full"
					hover={false}
					onclick={() => {
						page.openPreview();
						window.scrollTo?.(0, 0);
					}}
					data-testid="doctor-article-preview-open"
				/>
				{#if page.canDraft}
					<Button
						label={m.doctor_my_article_save({}, options)}
						tone="outline"
						radius="full"
						hover={false}
						loading={page.writing}
						onclick={() => page.submit('save')}
						data-testid="doctor-article-save"
					/>
				{/if}
			</div>
			{#if articleId !== null}
				<button
					type="button"
					data-testid="doctor-article-delete"
					onclick={() => page.ask()}
					class="mt-5 inline-flex min-h-touch min-w-touch items-center self-start text-body-md font-semibold text-accent outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					{m.doctor_my_article_delete({}, options)}
				</button>
			{/if}
			{#if page.failure}
				<p
					role="alert"
					data-testid="doctor-article-failure"
					class="mt-4 text-label-lg font-medium text-danger-text"
				>
					{page.failure}
				</p>
			{/if}

			<div
				data-testid="doctor-article-bar"
				class="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card tablet:static tablet:mt-6"
			>
				<ActionBar
					preset="plain"
					secondaryLabel={m.doctor_photos_cancel({}, options)}
					onSecondaryClick={leave}
					secondaryTestId="doctor-article-cancel"
					primaryLabel={m.doctor_my_article_send({}, options)}
					onPrimaryClick={() => page.submit('send')}
					primaryLoading={page.writing}
					primaryShape="pill"
					primaryTestId="doctor-article-send"
					hover={false}
					class="tablet:px-0 tablet:pt-6 tablet:pb-0"
				/>
			</div>
		{/if}
	</div>
</main>

<DeleteDialog
	open={page.asking}
	{locale}
	{published}
	deleting={page.deleting}
	failure={page.deleteFailure}
	onConfirm={() => page.remove()}
	onCancel={() => page.dismiss()}
/>
