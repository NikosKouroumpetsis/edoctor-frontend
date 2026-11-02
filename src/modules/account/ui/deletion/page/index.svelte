<script lang="ts">
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { getSupportEmail } from '$shared/config/support';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { Banner } from '$shared/ui/molecules/banner';
	import { LinkRows } from '$shared/ui/molecules/link-rows';
	import { DocumentPage } from '$shared/ui/templates/document-page';
	import { deletionSectionIds } from '$modules/account/lib/deletion';
	import AppSteps from '../components/app-steps.svelte';
	import SupportRequest from '../components/support-request.svelte';
	import RetentionOverview from '../components/retention-overview.svelte';
	import type { DeletionPageProps } from '../types';

	let { homeHref, legalHref, otherRows, onAnchor, canonicalUrl, alternateUrls }: DeletionPageProps =
		$props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const supportEmail = getSupportEmail();

	// Π4: the four H2s, in order, at their anchors.
	const toc = $derived(
		deletionSectionIds.map((id) => ({
			id,
			label: {
				'from-the-app': m.account_deletion_app_title,
				'without-the-app': m.account_deletion_support_title,
				'deleted-at-once': m.account_deletion_removed_title,
				'what-we-keep': m.account_deletion_retained_title
			}[id]({}, messageOptions)
		}))
	);
	// The legal texts' H2 (22/600, 36 above but the first, 12 under), where an anchor stops.
	const headingClass =
		'mb-3 text-heading-sm text-foreground scroll-mt-document tablet:scroll-mt-card-sticky-top';
</script>

<!-- MINOR-7 of r1 (U-28.4, common v2): the title, the description, the canonical address, its languages and the OG. -->
<svelte:head>
	<title>{m.account_deletion_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.account_deletion_meta_description({}, messageOptions)} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="el" href={alternateUrls.el} />
	<link rel="alternate" hreflang="en" href={alternateUrls.en} />
	<link rel="alternate" hreflang="x-default" href={alternateUrls.el} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.account_deletion_meta_title({}, messageOptions)} />
	<meta
		property="og:description"
		content={m.account_deletion_meta_description({}, messageOptions)}
	/>
	<meta property="og:url" content={canonicalUrl} />
</svelte:head>

<!-- 🔴 U-62.1 (wave 1.5, screen 10, the prototype 10): the public deletion page on the legal texts' template —
     «Αρχική › Νομικά › Διαγραφή λογαριασμού», «Νομικά», the h1, the introduction; the `Banner` info «Η διαγραφή είναι
     οριστική: …» (the introduction's second sentence, MOVED, never twice); the sections as H2s of the text, no cards;
     «Σε αυτό το κείμενο»; «Άλλα νομικά κείμενα» with the FAQ's question; «↑». No version, no share, no sign-in card.
     The words are the `account_deletion_*` keys, unchanged. -->
{#snippet notices()}
	<Banner
		title={m.account_deletion_final_title({}, messageOptions)}
		description={m.account_deletion_final_body({}, messageOptions)}
		inline
		role="note"
		class="px-5"
		data-testid="account-deletion-final"
	/>
{/snippet}

{#snippet cards()}
	<LinkRows
		title={m.legal_others_title({}, messageOptions)}
		rows={otherRows}
		testId="account-deletion-others"
	/>
{/snippet}

<main>
	<DocumentPage
		breadcrumbs={[
			{ label: m.document_home({}, messageOptions), href: homeHref },
			{ label: m.legal_eyebrow({}, messageOptions), href: legalHref },
			{ label: m.footer_account_deletion({}, messageOptions) }
		]}
		breadcrumbsLabel={m.document_breadcrumbs_label({}, messageOptions)}
		eyebrow={m.legal_eyebrow({}, messageOptions)}
		title={m.account_deletion_title({}, messageOptions)}
		lead={m.account_deletion_intro({}, messageOptions)}
		{notices}
		{toc}
		tocTitle={m.document_toc_text({}, messageOptions)}
		{cards}
		asideLabel={m.legal_others_title({}, messageOptions)}
		backHref={legalHref}
		backLabel={m.document_back({}, messageOptions)}
		backToTopLabel={m.document_back_to_top({}, messageOptions)}
		{onAnchor}
		testId="account-deletion-page"
	>
		<div class="text-document-body text-foreground [&>section+section]:mt-reading-gap-sm">
			<AppSteps {messageOptions} {headingClass} />
			<SupportRequest {messageOptions} {supportEmail} {headingClass} />
			<RetentionOverview {messageOptions} {supportEmail} {headingClass} />
		</div>
	</DocumentPage>
</main>
