<script lang="ts">
	import { onMount } from 'svelte';
	import MoonIcon from '~icons/lucide/moon';
	import SunIcon from '~icons/lucide/sun';
	import { Button } from '$shared/ui/primitives/button';
	import { theme } from '$shared/preferences/theme';

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
	class="size-9 rounded-md"
	aria-label={theme.resolved === 'dark' ? 'Light theme' : 'Dark theme'}
	title={theme.resolved === 'dark' ? 'Light theme' : 'Dark theme'}
	onclick={toggleTheme}
>
	{#if theme.resolved === 'dark'}
		<SunIcon class="size-4" />
	{:else}
		<MoonIcon class="size-4" />
	{/if}
</Button>
