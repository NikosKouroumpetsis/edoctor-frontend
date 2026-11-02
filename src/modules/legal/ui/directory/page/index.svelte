<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { PageBar } from '$shared/ui/organisms/page-bar';
	import type { LegalDirectoryProps } from '../types';

	let { rows, locale, backHref, canonicalUrl, alternateUrls }: LegalDirectoryProps = $props();

	const options = $derived({ locale });
	const title = $derived(m.legal_eyebrow({}, options));
</script>

<svelte:head>
	<title>{m.legal_index_meta_title({}, options)}</title>
	<meta name="description" content={m.legal_index_body({}, options)} />
	<link rel="canonical" href={canonicalUrl} />
	<link rel="alternate" hreflang="el" href={alternateUrls.el} />
	<link rel="alternate" hreflang="en" href={alternateUrls.en} />
	<link rel="alternate" hreflang="x-default" href={alternateUrls.el} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={m.legal_index_meta_title({}, options)} />
	<meta property="og:description" content={m.legal_index_body({}, options)} />
	<meta property="og:url" content={canonicalUrl} />
</svelte:head>

<!-- 🔴 U-59.3 Ε2 (wave 1.5, screen 7, the prototype 07 `?v=index`): the small «Νομικά» page the breadcrumbs' middle step
     opens — the application's legal list (U-59.3 Ε1: «Νομικά»), its line, the three texts and, on the web, «Διαγραφή
     λογαριασμού»: rows of 48 (17, «›»), 8 apart, in a column of 568. Below 744 the application's bar with «‹». -->
<div data-testid="legal-directory" class="pb-section-lg">
	<PageBar
		{backHref}
		backLabel={m.document_back({}, options)}
		look="app"
		testId="legal-directory-bar"
	/>
	<div class="px-gutter-sm tablet:px-profile-gutter">
		<div class="mx-auto w-full max-w-dialog pt-4 tablet:pt-reading-gap">
			<h1 class="text-heading-md text-foreground tablet:text-display-md">{title}</h1>
			<p class="mt-4 text-body-lg text-muted-foreground">{m.legal_index_body({}, options)}</p>
			<ul class="mt-section flex flex-col gap-2">
				{#each rows as row (row.key)}
					<li>
						<a
							href={row.href}
							data-testid="legal-directory-row"
							class="flex min-h-touch w-full flex-row items-center gap-2 py-2 text-title-xs font-normal text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 can-hover:hover:underline"
						>
							<span class="min-w-0 flex-1">{row.label}</span>
							<Ionicon name="chevron-forward" class="icon-md shrink-0 text-muted-foreground" />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
