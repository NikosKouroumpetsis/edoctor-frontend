<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';
	import LanguageSwitcher from '$shared/ui/molecules/language-switcher';
	import ThemeToggle from '$shared/ui/molecules/theme-toggle';
	import FacebookIcon from '~icons/lucide/facebook';
	import InstagramIcon from '~icons/lucide/instagram';
	import TwitterIcon from '~icons/lucide/twitter';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);

	const linkClass =
		'text-body-sm text-muted-foreground transition-colors hover:text-foreground hover:underline outline-none focus-visible:text-foreground';
	const socialClass =
		'grid size-9 place-items-center rounded-full border border-border/70 text-muted-foreground transition-colors hover:border-border hover:text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50';

	const socialLinks = [
		{ label: 'Facebook', icon: FacebookIcon },
		{ label: 'Instagram', icon: InstagramIcon },
		{ label: 'X', icon: TwitterIcon }
	];
</script>

<footer class="mt-12 border-t border-border bg-card pb-[88px] lg:pb-0">
	<div class="container-page py-12">
		<div class="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3">
			<div class="flex flex-col gap-3">
				<h2 class="text-label-lg font-semibold text-foreground">
					{m.footer_support_title({}, messageOptions)}
				</h2>
				<button type="button" class={linkClass}>{m.footer_help({}, messageOptions)}</button>
				<button type="button" class={linkClass}>{m.footer_contact({}, messageOptions)}</button>
				<button type="button" class={linkClass}>{m.footer_safety({}, messageOptions)}</button>
			</div>

			<div class="flex flex-col gap-3">
				<h2 class="text-label-lg font-semibold text-foreground">
					{m.footer_company_title({}, messageOptions)}
				</h2>
				<a href={localizedHref('/doctors')} class={linkClass}>{m.nav_doctors({}, messageOptions)}</a
				>
				<a href={localizedHref('/clinics')} class={linkClass}>{m.nav_clinics({}, messageOptions)}</a
				>
				<a href={localizedHref('/plans')} class={linkClass}>{m.nav_plans({}, messageOptions)}</a>
			</div>

			<div class="flex flex-col gap-3">
				<h2 class="text-label-lg font-semibold text-foreground">
					{m.footer_legal_title({}, messageOptions)}
				</h2>
				<button type="button" class={linkClass}>{m.footer_terms({}, messageOptions)}</button>
				<button type="button" class={linkClass}>{m.footer_privacy({}, messageOptions)}</button>
				<button type="button" class={linkClass}>{m.footer_cookies({}, messageOptions)}</button>
			</div>
		</div>
	</div>

	<div class="border-t border-border/70">
		<div
			class="container-page flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between"
		>
			<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-muted-foreground">
				<span>{m.footer_rights({}, messageOptions)}</span>
				<span aria-hidden="true" class="hidden sm:inline">·</span>
				<button type="button" class={linkClass}>{m.footer_terms({}, messageOptions)}</button>
				<span aria-hidden="true">·</span>
				<button type="button" class={linkClass}>{m.footer_privacy({}, messageOptions)}</button>
				<span aria-hidden="true">·</span>
				<button type="button" class={linkClass}>{m.footer_cookies({}, messageOptions)}</button>
			</div>

			<div class="flex items-center gap-2">
				<LanguageSwitcher />
				<ThemeToggle />
				<ul class="ml-1 flex items-center gap-2">
					{#each socialLinks as social (social.label)}
						{@const Icon = social.icon}
						<li>
							<button type="button" aria-label={social.label} class={socialClass}>
								<Icon class="icon-sm" />
							</button>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	</div>
</footer>
