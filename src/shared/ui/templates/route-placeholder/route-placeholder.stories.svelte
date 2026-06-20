<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoutePlaceholder from '$shared/ui/templates/route-placeholder';

	const { Story } = defineMeta({
		title: 'Templates/Route placeholder',
		component: RoutePlaceholder,
		tags: ['autodocs']
	});
</script>

<!-- Screen-level template for not-yet-built routes. Reads $app/state for navigation links. -->
<Story name="Default">
	{#snippet template()}
		<RoutePlaceholder
			eyebrow="Coming soon"
			title="Clinics directory"
			body="This section is under construction. In the meantime, browse doctors or manage your appointments."
		/>
	{/snippet}
</Story>
