<script lang="ts">
	import LegalDocument from '$modules/legal/ui/document';
	import { useLegalScreen } from '../hooks';
	import type { LegalScreenProps } from '../types';

	let { data }: LegalScreenProps = $props();

	const screen = useLegalScreen(
		() => data.slug,
		() => data.document.canonicalUrl
	);
</script>

<!-- The legal pages (wave 1.5, screen 7, U-59.1): the CMS's text in the legal module's page, whole on the server. -->
<main class="bg-card">
	<LegalDocument
		document={data.document}
		edition={data.edition}
		locale={screen.locale}
		homeHref={screen.homeHref}
		legalHref={screen.legalHref}
		upcomingHref={screen.upcomingHref}
		currentHref={screen.currentHref}
		otherRows={screen.otherRows}
		internalHref={screen.internalHref}
		onAnchor={screen.onAnchor}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
	/>
</main>
