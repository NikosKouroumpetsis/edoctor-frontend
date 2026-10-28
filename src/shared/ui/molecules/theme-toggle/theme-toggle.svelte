<script lang="ts">
	import { onMount } from 'svelte';
	import { theme } from '$shared/preferences/theme';
	import { IconButton } from '$shared/ui/primitives/icon-button';

	let {
		lightLabel,
		darkLabel
	}: {
		/** The name of the action that turns the light theme on, already localized. */
		lightLabel: string;
		/** The name of the action that turns the dark theme on. */
		darkLabel: string;
	} = $props();

	const label = $derived(theme.resolved === 'dark' ? lightLabel : darkLabel);

	onMount(() => {
		theme.init();
	});

	const toggleTheme = () => {
		theme.set(theme.resolved === 'dark' ? 'light' : 'dark');
	};
</script>

<IconButton
	appearance="outline"
	icon={theme.resolved === 'dark' ? 'sunny-outline' : 'moon-outline'}
	iconSize="md"
	aria-label={label}
	title={label}
	onclick={toggleTheme}
/>
