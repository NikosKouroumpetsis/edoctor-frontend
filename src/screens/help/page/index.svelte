<script lang="ts">
	import HelpCenter from '$modules/help/ui/center';
	import HelpfulVote from '$modules/helpful/ui/vote';
	import { helpfulFaqTarget } from '$modules/helpful/lib/vote';
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
	>
		{#snippet helpful(anchor)}
			{@const target = helpfulFaqTarget(anchor)}
			{#if target}
				<HelpfulVote {target} size="sm" locale={screen.locale} />
			{/if}
		{/snippet}
	</HelpCenter>
</main>
