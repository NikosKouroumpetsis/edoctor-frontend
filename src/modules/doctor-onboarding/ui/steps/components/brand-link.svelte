<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';

	let { href, locale }: { href: string; locale: SupportedLocale } = $props();
</script>

<!-- Record §6.3 (`doctor.css` `.d-brand`): from 744 the steps' own top bar starts with the eDoctor mark — the «e+» square
     and the word — leading home, as the site's bar does; no colour under the pointer (U-100). -->
<!-- The home's address, already resolved by the screen. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={m.brand_name({}, { locale })}
	data-slot="doctor-onboarding-brand"
	class="flex min-h-touch min-w-touch shrink-0 flex-row items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<span
		aria-hidden="true"
		class="grid size-brand-mark place-items-center rounded-sm bg-primary text-label-md font-bold text-primary-foreground"
	>
		e+
	</span>
	<span aria-hidden="true" class="text-title-xs font-semibold text-foreground">
		{m.brand_name({}, { locale })}
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
