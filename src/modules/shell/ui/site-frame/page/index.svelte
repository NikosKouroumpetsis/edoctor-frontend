<script lang="ts">
	import { onMount, untrack, type Snippet } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, locales, localizeHref } from '$paraglide/runtime';
	import { getSupportEmail } from '$shared/config/support';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { theme } from '$shared/preferences/theme';
	import { getInboxBadgeOptional } from '$shared/state/inbox-badge';
	import { SearchDock, setSearchDock } from '$shared/state/search-dock';
	import { getSessionOptional } from '$shared/state/session';
	import { setSiteDialogs, SiteDialogs } from '$shared/state/site-dialogs';
	import { Ionicon } from '$shared/ui/icons/ionicon';
	import AppShell from '$shared/ui/organisms/app-shell';
	import { AppHeader } from '$shared/ui/organisms/app-header';
	import { BottomNav } from '$shared/ui/organisms/bottom-nav';
	import { SiteFooter } from '$shared/ui/organisms/site-footer';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import ConsentPrompt from '$modules/shell/ui/consent-prompt';
	import AccountMenu from '../components/account-menu.svelte';
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
		hidesFooterOnPhone,
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
	// The frame's windows and the toast, one per page tree (context, SSR-safe): a page asks, the frame draws.
	const dialogs = setSiteDialogs(new SiteDialogs());
	const toasts = setToasts(new ToastState());
	// The session lives on the layout's auth host (U-80.1); without it (a test of the frame alone) a guest.
	const session = getSessionOptional();
	const isMember = $derived(session?.isMember ?? false);
	// 🔴 R-2: a sign-out the server did not carry out: the member is still signed in here, and must know it.
	let signOutFailures = untrack(() => session?.signOutFailures ?? 0);
	$effect(() => {
		const failures = session?.signOutFailures ?? 0;
		if (failures === signOutFailures) return;
		signOutFailures = failures;
		untrack(() =>
			toasts.show({ tone: 'danger', message: m.auth_sign_out_failed({}, messageOptions) })
		);
	});
	const initial = $derived(session?.member?.firstName?.trim().slice(0, 1).toUpperCase() ?? null);
	// 🔴 U-84 Π5: the messages module's one read; the frame only draws it. A guest's is always none.
	const inbox = getInboxBadgeOptional();
	const hasUnread = $derived(isMember && (inbox?.hasUnread ?? false));
	const accountEntries = $derived(
		buildAccountEntries(messageOptions, localizedHref, isMember, hasUnread)
	);
	const capsuleBadge = $derived(
		hasUnread && inbox
			? {
					badge: inbox.label,
					label: m.bottom_nav_unread({ count: inbox.count }, messageOptions)
				}
			: null
	);

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
					{initial}
					{hasUnread}
					onSettings={() => dialogs.openSettings()}
					onSignIn={session ? () => session.requireSignIn() : undefined}
					onSignOut={() => session?.signOut()}
				/>
			{/snippet}
		</AppHeader>
	{/snippet}

	{@render children()}

	{#snippet footer()}
		<!-- §7.2: the results end with their own thin legal line, no footer. -->
		{#if showsSiteFooter(basePath)}
			{#if hidesFooterOnPhone(basePath)}
				<!-- U-81.1, Ε2: the application's own pages below 744 end without it. -->
				<div data-testid="footer-from-tablet" class="hidden tablet:block">
					{@render siteFooter()}
				</div>
			{:else}
				{@render siteFooter()}
			{/if}
		{/if}
	{/snippet}

	{#snippet bottomNav()}
		{#if showsBottomNav(basePath, page.status)}
			<BottomNav
				aria-label={m.bottom_navigation({}, messageOptions)}
				items={buildBottomNavItems(messageOptions, localizedHref, basePath, capsuleBadge)}
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
				onclick={() => dialogs.openSettings()}
				class="inline-flex min-h-touch min-w-touch flex-row items-center gap-2.5 rounded-sm text-body-sm font-semibold text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<Ionicon name="globe-outline" class="icon-md" />
				{m.footer_language_current({}, messageOptions)}
			</button>
			<SocialLinks />
		{/snippet}
	</SiteFooter>
{/snippet}

<SettingsDialog bind:open={dialogs.settingsOpen} {languageOptions} {messageOptions} />
<ConsentPrompt />
<Toaster {toasts} />

<!-- Every language version of this page, for crawlers (hidden from people and assistive tech). -->
<div style="display:none">
	{#each locales as locale (locale)}
		<a href={samePageIn(locale)} aria-hidden="true" tabindex="-1">{locale}</a>
	{/each}
</div>
