<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, locales, localizeHref } from '$paraglide/runtime';
	import { getPageLocale, type SupportedLocale } from '$shared/preferences/i18n';
	import AppShell from '$shared/ui/organisms/app-shell';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { BottomNav } from '$shared/ui/organisms/bottom-nav';
	import { SiteFooter } from '$shared/ui/organisms/site-footer';
	import { Button } from '$shared/ui/primitives/button';
	import BrandLink from '../components/brand-link.svelte';
	import PreferenceControls from '../components/preference-controls.svelte';
	import PrimaryNav from '../components/primary-nav.svelte';
	import SocialLinks from '../components/social-links.svelte';
	import {
		buildBottomNavItems,
		buildFooterColumns,
		buildLanguageOptions,
		buildLegalLinks
	} from '../lib/frame';

	let { children }: { children: Snippet } = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const basePath = $derived(deLocalizeHref(page.url.pathname));

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
	const samePageIn = (locale: SupportedLocale) =>
		resolve(localizeHref(basePath, { locale }) as Pathname);

	const languageOptions = $derived(buildLanguageOptions(currentLocale, samePageIn));
</script>

<!-- The eDoctor frame of every page: the generic shell (U-03.8) with this product's mark, links and words. -->
<AppShell>
	{#snippet header()}
		<AppHeader>
			{#snippet brand()}
				<BrandLink href={localizedHref('/')} {messageOptions} />
			{/snippet}
			{#snippet nav()}
				<PrimaryNav href={localizedHref} {messageOptions} />
			{/snippet}
			{#snippet actions()}
				<PreferenceControls {languageOptions} {messageOptions} />
				<Button
					href={localizedHref('/login')}
					label={m.nav_login({}, messageOptions)}
					tone="outline"
					class="hidden @form:inline-flex"
				/>
			{/snippet}
		</AppHeader>
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<SiteFooter
			columns={buildFooterColumns(messageOptions, localizedHref)}
			legalNote={m.footer_rights({}, messageOptions)}
			legalLinks={buildLegalLinks(messageOptions)}
			reserveBottomNav="laptop"
		>
			{#snippet actions()}
				<PreferenceControls {languageOptions} {messageOptions} />
				<SocialLinks />
			{/snippet}
		</SiteFooter>
	{/snippet}

	{#snippet bottomNav()}
		<BottomNav
			aria-label={m.bottom_navigation({}, messageOptions)}
			items={buildBottomNavItems(messageOptions, localizedHref, basePath === '/')}
			hideFrom="laptop"
		/>
	{/snippet}
</AppShell>

<!-- Every language version of this page, for crawlers (hidden from people and assistive tech). -->
<div style="display:none">
	{#each locales as locale (locale)}
		<a href={samePageIn(locale)} aria-hidden="true" tabindex="-1">{locale}</a>
	{/each}
</div>
