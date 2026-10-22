<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import MoonIcon from '~icons/lucide/moon';
	import SunIcon from '~icons/lucide/sun';
	import { Button } from '$shared/ui/primitives/button';
	import { theme } from '$shared/preferences/theme';
	import { getPageLocale } from '$shared/preferences/i18n/page-locale';
	import { m } from '$paraglide/messages.js';

	const currentLocale = $derived(getPageLocale(page.url));
	const messageOptions = $derived({ locale: currentLocale });
	const label = $derived(
		theme.resolved === 'dark'
			? m.theme_toggle_light({}, messageOptions)
			: m.theme_toggle_dark({}, messageOptions)
	);

	onMount(() => {
		theme.init();
	});

	const toggleTheme = () => {
		theme.set(theme.resolved === 'dark' ? 'light' : 'dark');
	};
</script>

<Button
	variant="outline"
	size="icon"
	class="rounded-md"
	aria-label={label}
	title={label}
	onclick={toggleTheme}
>
	{#if theme.resolved === 'dark'}
		<SunIcon class="size-4" />
	{:else}
		<MoonIcon class="size-4" />
	{/if}
</Button>
