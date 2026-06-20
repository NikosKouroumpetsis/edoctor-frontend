<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LanguageSwitcher from '$shared/ui/molecules/language-switcher';

	const { Story } = defineMeta({
		title: 'Molecules/Language switcher',
		component: LanguageSwitcher,
		tags: ['autodocs']
	});
</script>

<!-- Reads $app/state (page.url) + Paraglide runtime, both provided by @storybook/sveltekit. -->
<Story name="Default">
	{#snippet template()}
		<LanguageSwitcher />
	{/snippet}
</Story>
