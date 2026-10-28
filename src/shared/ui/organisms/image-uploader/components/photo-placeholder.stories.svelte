<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect } from 'storybook/test';
	import PhotoPlaceholder from './photo-placeholder.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo placeholder',
		component: PhotoPlaceholder,
		tags: ['autodocs']
	});
</script>

<!-- Presentational empty placeholder tile (no context) -->
<Story
	name="Placeholder"
	play={async () => {
		await expect(document.querySelector('[data-slot="photo-placeholder"]')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="w-full max-w-narrow">
			<PhotoPlaceholder />
		</div>
	{/snippet}
</Story>
