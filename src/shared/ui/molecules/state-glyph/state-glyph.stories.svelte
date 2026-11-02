<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StateGlyph } from '$shared/ui/molecules/state-glyph';

	// MINOR-6 (U-29): the glyph of an empty or failed state (the home's and the results' `EmptyState` / `ErrorState`).
	const { Story } = defineMeta({
		title: 'Molecules/StateGlyph',
		component: StateGlyph,
		tags: ['autodocs'],
		args: { name: 'search-outline' }
	});
</script>

<Story name="Search" />

<Story name="No Connection" args={{ name: 'cloud-offline-outline' }} />

<Story name="Location" args={{ name: 'location-outline' }} />
