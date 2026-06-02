<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import CareModes from '../components/care-modes.svelte';
	import HeroSection from '../components/hero-section.svelte';
	import StatsStrip from '../components/stats-strip.svelte';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
</script>

<svelte:head>
	<title>{m.home_meta_title({}, messageOptions)}</title>
	<meta name="description" content={m.home_meta_description({}, messageOptions)} />
</svelte:head>

<main>
	<HeroSection {messageOptions} {localizedHref} />
	<StatsStrip {messageOptions} />
	<CareModes {messageOptions} />
</main>
