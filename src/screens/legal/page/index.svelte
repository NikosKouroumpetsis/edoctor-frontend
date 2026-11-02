<script lang="ts">
	import LegalDirectory from '$modules/legal/ui/directory';
	import { useLegalDirectoryScreen } from '../hooks';

	const screen = useLegalDirectoryScreen();
</script>

<!-- The «Νομικά» page (wave 1.5, screen 7, U-59.3 Ε2): where the breadcrumbs' «Νομικά» leads. -->
<main class="bg-card">
	<LegalDirectory
		rows={screen.rows}
		locale={screen.locale}
		backHref={screen.backHref}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
	/>
</main>
