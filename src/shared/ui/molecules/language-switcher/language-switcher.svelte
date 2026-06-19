<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Button } from '$shared/ui/primitives/button';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { languages, type SupportedLocale } from '$shared/preferences/i18n/locales';
	import { deLocalizeHref, localizeHref } from '$paraglide/runtime';

	const currentLocale = $derived(getPageLocale(page.url));
	const basePath = $derived(deLocalizeHref(page.url.pathname));

	const localizedHref = (locale: SupportedLocale) =>
		resolve(localizeHref(basePath, { locale }) as Pathname);
</script>

<div class="flex items-center rounded-md border border-border bg-background p-0.5 shadow-xs">
	{#each languages as language (language.locale)}
		<Button
			href={localizedHref(language.locale)}
			variant={currentLocale === language.locale ? 'secondary' : 'ghost'}
			size="sm"
			class="h-7 min-w-8 rounded-[calc(var(--radius)-2px)] px-2 text-label-md"
			aria-label={language.label}
		>
			{language.shortLabel}
		</Button>
	{/each}
</div>
