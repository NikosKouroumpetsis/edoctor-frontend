<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { IconButton } from '$shared/ui/primitives/icon-button';
	import { PageBar } from '$shared/ui/organisms/page-bar';

	const { Story } = defineMeta({
		title: 'Organisms/PageBar',
		component: PageBar,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		globals: { viewport: { value: 'z375' } }
	});
</script>

<Story name="The application's text page (title always)">
	{#snippet template()}
		<PageBar backHref="#" backLabel="Πίσω" title="Όροι χρήσης" look="app" />
	{/snippet}
</Story>

<Story name="With a share button (title after the scroll)">
	{#snippet template()}
		<PageBar backHref="#" backLabel="Πίσω" title="Ένας τίτλος" watch={null}>
			{#snippet actions()}
				<IconButton icon="share-outline" iconSize="md" aria-label="Κοινοποίηση" />
			{/snippet}
		</PageBar>
	{/snippet}
</Story>
