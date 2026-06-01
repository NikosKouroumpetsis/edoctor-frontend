<script lang="ts">
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import RoutePlaceholder from '$shared/ui/templates/route-placeholder';
	import { m } from '$paraglide/messages.js';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
</script>

<RoutePlaceholder
	eyebrow={m.nav_login({}, messageOptions)}
	title={m.login_page_title({}, messageOptions)}
	body={m.login_page_body({}, messageOptions)}
/>
