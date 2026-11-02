<script lang="ts">
	import { RichText } from '$shared/ui/molecules/rich-text';
	import DocumentPage from './document-page.svelte';
	import type { DocumentPageTocEntry } from './document-page.svelte';

	let {
		toc = [],
		backToTopLabel,
		phone = 'web',
		withCards = false,
		onAnchor
	}: {
		toc?: DocumentPageTocEntry[];
		backToTopLabel?: string;
		phone?: 'web' | 'app';
		withCards?: boolean;
		onAnchor?: (id: string) => void;
	} = $props();
</script>

{#snippet cards()}
	<p data-testid="harness-card">Μια κάρτα</p>
{/snippet}

<DocumentPage
	breadcrumbs={[
		{ label: 'Αρχική', href: '/' },
		{ label: 'Νομικά', href: '/legal' },
		{ label: 'Όροι χρήσης' }
	]}
	breadcrumbsLabel="Διαδρομή"
	eyebrow="Νομικά"
	title="Όροι χρήσης"
	{toc}
	tocTitle="Σε αυτό το κείμενο"
	cards={withCards ? cards : undefined}
	asideLabel="Άλλα κείμενα"
	backHref="/legal"
	backLabel="Πίσω"
	{backToTopLabel}
	{phone}
	{onAnchor}
	testId="document"
>
	<RichText
		document={{
			content: toc.map((entry) => ({
				type: 'heading',
				attrs: { level: 2, anchor: entry.id },
				text: entry.label
			}))
		}}
	/>
</DocumentPage>
