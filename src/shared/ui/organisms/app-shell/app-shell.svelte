<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { Button } from '$shared/ui/primitives/button';
	import LanguageSwitcher from '$shared/ui/molecules/language-switcher';
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';
	import BottomNav from '$shared/ui/organisms/bottom-nav';
	import SiteFooter from '$shared/ui/organisms/site-footer';
	import { m } from '$paraglide/messages.js';
	import { deLocalizeHref, locales, localizeHref } from '$paraglide/runtime';

	let { children }: { children: Snippet } = $props();

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const basePath = $derived(deLocalizeHref(page.url.pathname));

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);

	const localizedCurrentHref = (locale: (typeof locales)[number]) =>
		resolve(localizeHref(basePath, { locale }) as Pathname);
</script>

<div class="flex min-h-dvh flex-col bg-background text-foreground">
	<header
		class="sticky top-0 z-50 border-b border-border/80 bg-background/92 backdrop-blur supports-backdrop-filter:bg-background/75"
	>
		<div class="container-page flex h-16 items-center gap-4">
			<a
				href={localizedHref('/')}
				class="flex shrink-0 items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			>
				<span
					class="grid size-9 place-items-center rounded-md bg-primary text-body-sm font-semibold text-primary-foreground shadow-xs"
				>
					e+
				</span>
				<span class="text-body-lg font-semibold">{m.brand_name({}, messageOptions)}</span>
			</a>

			<nav
				class="ml-4 hidden items-center gap-1 lg:flex"
				aria-label={m.primary_navigation({}, messageOptions)}
			>
				<a
					href={localizedHref('/doctors')}
					class="rounded-md px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					{m.nav_doctors({}, messageOptions)}
				</a>
				<a
					href={localizedHref('/clinics')}
					class="rounded-md px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					{m.nav_clinics({}, messageOptions)}
				</a>
				<a
					href={localizedHref('/plans')}
					class="rounded-md px-3 py-2 text-body-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					{m.nav_plans({}, messageOptions)}
				</a>
			</nav>

			<div class="ml-auto flex items-center gap-2">
				<LanguageSwitcher />
				<ThemeToggle />
				<Button
					href={localizedHref('/login')}
					variant="outline"
					size="sm"
					class="hidden sm:inline-flex"
				>
					{m.nav_login({}, messageOptions)}
				</Button>
			</div>
		</div>
	</header>

	<div class="flex-1">
		{@render children()}
	</div>

	<SiteFooter />
	<BottomNav />
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizedCurrentHref(locale)}>{locale}</a>
	{/each}
</div>
