<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { buildRichText, richTextToc, type RichTextDoc } from '$shared/lib/rich-text';
	import { Banner } from '$shared/ui/molecules/banner';
	import { RichText } from '$shared/ui/molecules/rich-text';
	import { Button } from '$shared/ui/primitives/button';
	import { DocumentPage } from '$shared/ui/templates/document-page';

	const paragraph = (text: string) => ({ type: 'paragraph', text });
	const body: RichTextDoc = {
		type: 'doc',
		content: [
			paragraph('Μια σύντομη εισαγωγή, πριν από την πρώτη ενότητα του κειμένου.'),
			{ type: 'heading', attrs: { level: 2, anchor: 'ti-isxyei' }, text: 'Τι ισχύει' },
			paragraph('Ένα κείμενο σε στήλη 600, εύκολο να διαβαστεί σε κάθε πλάτος της οθόνης.'),
			{ type: 'heading', attrs: { level: 2 }, text: 'Πώς λειτουργεί' },
			{
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [paragraph('Πρώτο σημείο της λίστας.')] },
					{ type: 'listItem', content: [paragraph('Δεύτερο σημείο της λίστας.')] }
				]
			},
			{ type: 'heading', attrs: { level: 2 }, text: 'Τι κρατάμε' },
			paragraph('Η τελευταία ενότητα του σώματος.')
		]
	};
	const toc = richTextToc(buildRichText(body).headings);
	const crumbs = [
		{ label: 'Αρχική', href: '#' },
		{ label: 'Ενότητα', href: '#' },
		{ label: 'Η σελίδα' }
	];

	const { Story } = defineMeta({
		title: 'Templates/DocumentPage',
		component: DocumentPage,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' }
	});
</script>

{#snippet card()}
	<div class="flex flex-col gap-4 rounded-lg border border-border bg-card p-card">
		<p class="text-body-lg text-foreground">Μια κάρτα στη στήλη δίπλα στο κείμενο, από 1128.</p>
		<Button label="Ενέργεια" tone="accent" radius="full" href="#" class="w-full" />
	</div>
{/snippet}

{#snippet metaLine()}Συγγραφέας · 2 Νοε 2026 · 5΄ ανάγνωσης{/snippet}
{#snippet versionLine()}Έκδοση 1.0.2 · Ισχύει από 1 Νοεμβρίου 2026{/snippet}

<Story name="Article">
	{#snippet template()}
		<DocumentPage
			breadcrumbs={crumbs}
			breadcrumbsLabel="Διαδρομή"
			title="Ένας τίτλος σε δύο γραμμές όταν χρειάζεται"
			subtitle="Ο υπότιτλος: η σύντομη περιγραφή του κειμένου."
			meta={metaLine}
			{toc}
			tocTitle="Σε αυτό το άρθρο"
			cards={card}
			backHref="#"
			backLabel="Πίσω"
		>
			<RichText document={body} variant="article" />
		</DocumentPage>
	{/snippet}
</Story>

<Story name="Legal text with a notice">
	{#snippet template()}
		<DocumentPage
			breadcrumbs={crumbs}
			breadcrumbsLabel="Διαδρομή"
			eyebrow="Νομικά"
			title="Ένα νομικό κείμενο"
			meta={versionLine}
			languageNote="Το κείμενο είναι διαθέσιμο μόνο στα Ελληνικά."
			{toc}
			tocTitle="Σε αυτό το κείμενο"
			cards={card}
			backHref="#"
			backLabel="Πίσω"
			backToTopLabel="Επιστροφή στην κορυφή"
			phone="app"
		>
			{#snippet notices()}
				<Banner
					title="Νέα έκδοση 1.1.0 — ισχύει από 1 Δεκεμβρίου 2026"
					actionLabel="Δείτε τη νέα έκδοση"
					actionHref="#"
					class="px-5"
				/>
			{/snippet}
			<RichText document={body} variant="legal" />
		</DocumentPage>
	{/snippet}
</Story>

<Story name="An introduction and one heading (no ToC)">
	{#snippet template()}
		<DocumentPage
			breadcrumbs={crumbs}
			breadcrumbsLabel="Διαδρομή"
			eyebrow="Νομικά"
			title="Μια σελίδα με εισαγωγή"
			lead="Η εισαγωγή κάτω από τον τίτλο, στο μέγεθος του σώματος."
			toc={toc.slice(0, 1)}
			tocTitle="Σε αυτό το κείμενο"
		>
			{#snippet notices()}
				<Banner title="Μια σημαντική φράση:" description="το υπόλοιπο της πρότασης." inline />
			{/snippet}
			<RichText document={body} variant="document" />
		</DocumentPage>
	{/snippet}
</Story>

<Story name="Phone" globals={{ viewport: { value: 'z375' } }}>
	{#snippet template()}
		<DocumentPage
			title="Ένας τίτλος σε δύο γραμμές όταν χρειάζεται"
			meta={metaLine}
			{toc}
			tocTitle="Σε αυτό το άρθρο"
			backHref="#"
			backLabel="Πίσω"
		>
			<RichText document={body} variant="article" />
		</DocumentPage>
	{/snippet}
</Story>
