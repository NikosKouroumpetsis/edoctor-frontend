<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, locales, localizeHref } from '$paraglide/runtime';
	import { getSupportEmail } from '$shared/config/support';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { theme } from '$shared/preferences/theme';
	import { SearchDock, setSearchDock } from '$shared/state/search-dock';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import AppShell from '$shared/ui/organisms/app-shell';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { BottomNav } from '$shared/ui/organisms/bottom-nav';
	import { SiteFooter } from '$shared/ui/organisms/site-footer';
	import ConsentPrompt from '$modules/shell/ui/consent-prompt';
	import AccountMenu from '../components/account-menu.svelte';
	import AccountSheet from '../components/account-sheet.svelte';
	import BrandLink from '../components/brand-link.svelte';
	import CompactSearch from '../components/compact-search.svelte';
	import PrimaryNav from '../components/primary-nav.svelte';
	import SettingsDialog from '../components/settings-dialog.svelte';
	import SocialLinks from '../components/social-links.svelte';
	import {
		buildAccountEntries,
		buildBottomNavItems,
		buildFooterColumns,
		buildLanguageOptions,
		buildLegalLinks,
		isExploreFlow,
		showsBottomNav,
		showsSiteFooter
	} from '../lib/frame';

	let {
		children,
		popularSearches
	}: {
		children: Snippet;
		/** The footer's popular searches (the search module's links, composed by the route layout). */
		popularSearches?: Snippet;
	} = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const basePath = $derived(deLocalizeHref(page.url.pathname));

	// The page's search and the top bar meet here, one per page tree (context, SSR-safe).
	const dock = setSearchDock(new SearchDock());

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);
	// MINOR-5 (r1): the page's own address in a language when it gives one (the results keep their search), else
	// the same path.
	const samePageIn = (locale: SupportedLocale) =>
		resolve((dock.languageHref?.(locale) ?? localizeHref(basePath, { locale })) as Pathname);

	const languageOptions = $derived(buildLanguageOptions(currentLocale, samePageIn));
	let settingsOpen = $state(false);
	let accountSheetOpen = $state(false);
	// The guest's account menu: ONE list for the ☰ menu (from 744) and the «Προφίλ» sheet (below it, U-19.1).
	const accountEntries = $derived(buildAccountEntries(messageOptions, localizedHref));

	// The theme follows the system live while its preference is `system` (the toggle now lives in the settings).
	onMount(() => theme.init());
</script>

<!-- The eDoctor frame of every page (U-19): apple.com's bar from 744 (none on the phone, U-16.3), the glass capsule
     below 744, Airbnb's footer, the settings (language, theme) and the consent card. -->
<AppShell>
	{#snippet header()}
		<AppHeader showFrom="tablet" compactOn={dock.pillShown}>
			{#snippet brand()}
				<BrandLink href={localizedHref('/')} {messageOptions} />
			{/snippet}
			{#snippet nav()}
				<PrimaryNav href={localizedHref} {messageOptions} />
			{/snippet}
			{#snippet compact()}
				<CompactSearch {dock} {messageOptions} />
			{/snippet}
			{#snippet actions()}
				<AccountMenu
					entries={accountEntries}
					{messageOptions}
					onSettings={() => (settingsOpen = true)}
				/>
			{/snippet}
		</AppHeader>
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<!-- §7.2: the results end with their own thin legal line, no footer. -->
		{#if showsSiteFooter(basePath)}
			{@render siteFooter()}
		{/if}
	{/snippet}

	{#snippet bottomNav()}
		{#if showsBottomNav(basePath, page.status)}
			<BottomNav
				aria-label={m.bottom_navigation({}, messageOptions)}
				items={buildBottomNavItems(
					messageOptions,
					localizedHref,
					isExploreFlow(basePath),
					() => (accountSheetOpen = true)
				)}
				hideFrom="tablet"
			/>
		{/if}
	{/snippet}
</AppShell>

{#snippet siteFooter()}
	<SiteFooter
		columns={buildFooterColumns(messageOptions, localizedHref, getSupportEmail())}
		popular={popularSearches}
		legalNote={m.footer_rights({}, messageOptions)}
		legalLinks={buildLegalLinks(messageOptions, localizedHref)}
		reserveBottomNav={showsBottomNav(basePath, page.status) ? 'tablet' : false}
		reservePageBar={showsBottomNav(basePath, page.status) ? false : 'tablet'}
	>
		{#snippet actions()}
			<button
				type="button"
				data-testid="footer-language"
				onclick={() => (settingsOpen = true)}
				class="inline-flex min-h-touch min-w-touch flex-row items-center gap-2.5 rounded-sm text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="globe-outline" class="icon-md" />
				{m.footer_language_current({}, messageOptions)}
			</button>
			<SocialLinks />
		{/snippet}
	</SiteFooter>
{/snippet}

<AccountSheet
	bind:open={accountSheetOpen}
	entries={accountEntries}
	{messageOptions}
	onSettings={() => (settingsOpen = true)}
/>
<SettingsDialog bind:open={settingsOpen} {languageOptions} {messageOptions} />
<ConsentPrompt />

<!-- Every language version of this page, for crawlers (hidden from people and assistive tech). -->
<div style="display:none">
	{#each locales as locale (locale)}
		<a href={samePageIn(locale)} aria-hidden="true" tabindex="-1">{locale}</a>
	{/each}
</div>
