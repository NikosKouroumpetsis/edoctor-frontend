<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import SiteFooter from '$shared/ui/organisms/site-footer';

	const { Story } = defineMeta({
		title: 'Organisms/Site footer',
		component: SiteFooter,
		tags: ['autodocs']
	});
</script>

<!-- Reads $app/state (page.url) + Paraglide; provided by @storybook/sveltekit. -->
<Story name="Default">
	{#snippet template()}
		<SiteFooter />
	{/snippet}
</Story>
