<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import { getPageLocale } from '$shared/preferences/i18n';
	import RoutePlaceholder from '$shared/ui/templates/route-placeholder';

	let { eyebrow, title, body }: { eyebrow: string; title: string; body: string } = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
</script>

<!-- A page that is not built yet: the generic placeholder with this product's way back and tab title. -->
<RoutePlaceholder
	{eyebrow}
	{title}
	{body}
	backHref={resolve(localizeHref('/', { locale: currentLocale }) as Pathname)}
	backLabel={m.back_home({}, messageOptions)}
	documentTitle={`${title} | ${m.brand_name({}, messageOptions)}`}
/>
