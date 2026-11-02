<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { RevealingPhoto } from '$shared/ui/molecules/revealing-photo';
	import { samplePhotos } from '$shared/ui/organisms/media-card/media-card.sample';

	// U-14 / U-14.6 (wave 1.5): one photo that lights up in 0.8 s the first time this session shows it. Local
	// pictures only (no network).
	const { Story } = defineMeta({
		title: 'Molecules/RevealingPhoto',
		component: RevealingPhoto,
		tags: ['autodocs'],
		args: { url: samplePhotos[0], alt: 'Φωτογραφία 1 από 1', fit: 'cover' },
		render: template
	});
</script>

{#snippet template(args: Record<string, unknown>)}
	<div class="relative aspect-square w-full max-w-full overflow-hidden rounded-lg bg-foreground/5">
		<RevealingPhoto
			{...args}
			url={(args.url as string) ?? samplePhotos[0]}
			alt="Φωτογραφία 1 από 1"
		/>
	</div>
{/snippet}

<Story name="Cover" />

<Story name="Contain" args={{ url: samplePhotos[1], fit: 'contain' }} />
