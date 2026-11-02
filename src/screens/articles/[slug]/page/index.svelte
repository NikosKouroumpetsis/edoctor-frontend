<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import PlaceholderPage from '$modules/shell/ui/placeholder-page';
	import { m } from '$paraglide/messages.js';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
</script>

<!-- One article (wave 1.5, screen 6): the placeholder at its final address (`/articles/[slug]`). -->
<PlaceholderPage
	eyebrow={m.nav_articles({}, messageOptions)}
	title={m.article_page_title({}, messageOptions)}
	body={m.placeholder_page_body({}, messageOptions)}
/>
