<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { getSearchDockOptional } from '$shared/state/search-dock';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import { buildLanguageOptions, buildLegalLinks } from '../lib/frame';
	import SettingsDialog from './settings-dialog.svelte';

	const dock = getSearchDockOptional();
	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const basePath = $derived(deLocalizeHref(page.url.pathname));
	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
	// MINOR-5 (r1): the results' own address in the language (their search kept), as the frame's settings.
	const samePageIn = (locale: SupportedLocale) =>
		resolve((dock?.languageHref?.(locale) ?? localizeHref(basePath, { locale })) as Pathname);
	const links = $derived(buildLegalLinks(messageOptions, localizedHref));
	const languageOptions = $derived(buildLanguageOptions(currentLocale, samePageIn));
	let settingsOpen = $state(false);
</script>

<!-- §7.2 of the wave record: the results have no footer — their list ends with Airbnb's thin line instead, the
     footer's own words and addresses: «© 2026 eDoctor · Απόρρητο · Όροι · Cookies · 🌐 Ελληνικά (GR)», the language
     opening «Ρυθμίσεις» as the footer's does (U-16.1). -->
<div
	data-slot="results-legal-line"
	data-testid="results-legal-line"
	class="mt-section flex flex-row flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-border pt-5 pb-2 text-label-lg text-muted-foreground"
>
	<span>{m.footer_rights({}, messageOptions)}</span>
	{#each links as link (link.href)}
		<a
			href={link.href}
			class="inline-flex min-h-touch min-w-touch items-center rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
		>
			{link.label}
		</a>
	{/each}
	<button
		type="button"
		data-testid="results-legal-language"
		onclick={() => (settingsOpen = true)}
		class="inline-flex min-h-touch min-w-touch flex-row items-center gap-1.5 rounded-sm outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
	>
		<Ionicon name="globe-outline" class="icon-sm" />
		{m.footer_language_current({}, messageOptions)}
	</button>
</div>
<SettingsDialog bind:open={settingsOpen} {languageOptions} {messageOptions} />
