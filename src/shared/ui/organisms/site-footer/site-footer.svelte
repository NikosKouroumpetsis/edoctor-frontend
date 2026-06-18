<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';
	import { localizeHref } from '$paraglide/runtime';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });

	const localizedHref = (path: string) =>
		resolve(localizeHref(path, { locale: currentLocale }) as Pathname);

	const linkClass =
		'text-body-sm text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:text-foreground';
</script>

<footer class="mt-12 border-t border-border bg-card pb-[88px] lg:pb-0">
	<div class="container-page py-12">
		<div class="flex flex-col gap-10 lg:flex-row lg:justify-between">
			<div class="max-w-sm">
				<a
					href={localizedHref('/')}
					class="flex w-fit items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<span
						class="grid size-9 place-items-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
					>
						e+
					</span>
					<span class="text-base font-semibold">{m.brand_name({}, messageOptions)}</span>
				</a>
				<p class="mt-4 text-body-sm leading-6 text-muted-foreground">
					{m.footer_tagline({}, messageOptions)}
				</p>
			</div>

			<div class="grid grid-cols-2 gap-8 sm:grid-cols-3">
				<div class="flex flex-col gap-3">
					<h2 class="text-label-lg font-semibold tracking-wide text-foreground">
						{m.footer_support_title({}, messageOptions)}
					</h2>
					<button type="button" class={linkClass}>{m.footer_help({}, messageOptions)}</button>
					<button type="button" class={linkClass}>{m.footer_contact({}, messageOptions)}</button>
					<button type="button" class={linkClass}>{m.footer_safety({}, messageOptions)}</button>
				</div>

				<div class="flex flex-col gap-3">
					<h2 class="text-label-lg font-semibold tracking-wide text-foreground">
						{m.footer_company_title({}, messageOptions)}
					</h2>
					<a href={localizedHref('/doctors')} class={linkClass}
						>{m.nav_doctors({}, messageOptions)}</a
					>
					<a href={localizedHref('/clinics')} class={linkClass}
						>{m.nav_clinics({}, messageOptions)}</a
					>
					<a href={localizedHref('/plans')} class={linkClass}>{m.nav_plans({}, messageOptions)}</a>
				</div>

				<div class="flex flex-col gap-3">
					<h2 class="text-label-lg font-semibold tracking-wide text-foreground">
						{m.footer_legal_title({}, messageOptions)}
					</h2>
					<button type="button" class={linkClass}>{m.footer_terms({}, messageOptions)}</button>
					<button type="button" class={linkClass}>{m.footer_privacy({}, messageOptions)}</button>
					<button type="button" class={linkClass}>{m.footer_cookies({}, messageOptions)}</button>
				</div>
			</div>
		</div>

		<div class="mt-10 border-t border-border/70 pt-6">
			<p class="text-body-sm text-muted-foreground">{m.footer_rights({}, messageOptions)}</p>
		</div>
	</div>
</footer>
