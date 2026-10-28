<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import PlaceholderPage from '$modules/shell/ui/placeholder-page';
	import { m } from '$paraglide/messages.js';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
</script>

<PlaceholderPage
	eyebrow={m.nav_doctors({}, messageOptions)}
	title={m.doctors_page_title({}, messageOptions)}
	body={m.doctors_page_body({}, messageOptions)}
/>
