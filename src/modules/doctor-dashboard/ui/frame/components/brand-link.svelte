<script lang="ts">
	import { m } from '$paraglide/messages.js';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';

	let { href, locale }: { href: string; locale: SupportedLocale } = $props();
</script>

<!-- The eDoctor mark of the doctor's bar (`64-switch/sw.js:864`, the site's own mark): the «e+» square, with the word from
     1128 — home is the doctor's «Σήμερα» while in the doctor's mode. No colour under the pointer (U-100). -->
<!-- The address, already resolved in the page's language. -->
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a
	{href}
	aria-label={m.brand_name({}, { locale })}
	data-slot="doctor-brand-link"
	class="flex min-h-touch min-w-touch shrink-0 flex-row items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
>
	<span
		aria-hidden="true"
		class="grid size-brand-mark place-items-center rounded-sm bg-primary text-label-md font-bold text-primary-foreground"
	>
		e+
	</span>
	<span aria-hidden="true" class="hidden text-title-xs font-semibold text-foreground laptop:inline">
		{m.brand_name({}, { locale })}
	</span>
</a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
