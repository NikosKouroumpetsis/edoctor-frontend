<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import PlaceholderPage from '$modules/shell/ui/placeholder-page';
	import { m } from '$paraglide/messages.js';
	import type { LegalSlug } from '$modules/shell/config/legal';
	import type { LegalScreenProps } from '../types';

	let { slug }: LegalScreenProps = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const titles = $derived<Record<LegalSlug, string>>({
		'terms-of-use': m.footer_terms({}, messageOptions),
		'privacy-policy': m.legal_privacy_title({}, messageOptions),
		'cookies-policy': m.legal_cookies_title({}, messageOptions)
	});
</script>

<!-- The legal pages (wave 1.5, screen 7, CMS): the placeholder at the application's slugs until their discussion. -->
<PlaceholderPage
	eyebrow={m.legal_eyebrow({}, messageOptions)}
	title={titles[slug]}
	body={m.placeholder_page_body({}, messageOptions)}
/>
