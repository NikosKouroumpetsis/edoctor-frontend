<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { MediaPlaceholder } from '$shared/ui/primitives/media-placeholder';

	// The application's meta (`atoms/media-placeholder`): the rail card's photo frame, the screen wide.
	const { Story } = defineMeta({
		title: 'Primitives/MediaPlaceholder',
		component: MediaPlaceholder,
		tags: ['autodocs'],
		args: { class: 'h-card-rail-media rounded-xl' },
		argTypes: {
			class: { control: 'text' },
			fill: { control: 'select', options: ['border', 'muted-foreground'] }
		}
	});
</script>

<Story name="Playground" />

<Story name="Frames">
	{#snippet template()}
		<div class="flex flex-col gap-3">
			<MediaPlaceholder class="h-card-rail-media rounded-xl" />
			<MediaPlaceholder class="size-avatar-xl rounded-full" />
		</div>
	{/snippet}
</Story>
