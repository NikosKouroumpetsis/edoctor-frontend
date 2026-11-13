<script lang="ts">
	import { untrack } from 'svelte';
	import type { SupportedLocale } from '$shared/preferences/i18n/locales';
	import { setToasts, Toaster, ToastState } from '$shared/ui/molecules/toast';
	import LanguageSection from './index.svelte';

	let {
		locale = 'el',
		member = true,
		onReady
	}: {
		locale?: SupportedLocale;
		member?: boolean;
		onReady?: (handle: { toasts: ToastState }) => void;
	} = $props();

	const toasts = setToasts(new ToastState());
	untrack(() => onReady?.({ toasts }));
</script>

<!-- Tests only: screen 61 under the frame's toast, with the address of this same page in each language. -->
<LanguageSection
	{locale}
	{member}
	languageHref={(next) => `${next === 'en' ? '/en' : ''}/profile/account-settings/language`}
/>
<Toaster {toasts} />
