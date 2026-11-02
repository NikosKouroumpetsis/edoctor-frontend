<script lang="ts">
	import HelpCenter from '$modules/help/ui/center';
	import { useHelpScreen } from '../hooks';
	import type { HelpScreenProps } from '../types';

	let { data }: HelpScreenProps = $props();

	const screen = useHelpScreen();
</script>

<!-- The help centre and its FAQ (wave 1.5, screen 8, U-60.1): the CMS page `faq` in the help module's page. -->
<main class="bg-card">
	<HelpCenter
		faq={data.faq}
		locale={screen.locale}
		helpHref={screen.helpHref}
		backHref={screen.backHref}
		internalHref={screen.internalHref}
		supportEmail={screen.supportEmail}
		onRetry={screen.onRetry}
		canonicalUrl={screen.canonicalUrl}
		alternateUrls={screen.alternateUrls}
	/>
</main>
