<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, screen, userEvent, within } from 'storybook/test';
	import PhotoItemMenu from './photo-item-menu.svelte';
	import StoryHarness from './story-harness.svelte';
	import { remoteItem } from '../lib/mocks';
	import type { ImageUploaderController } from '../lib/create-image-uploader.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Photo item menu',
		component: PhotoItemMenu,
		tags: ['autodocs']
	});

	const item = remoteItem('a', '#2563eb');
	const openMenu = (c: ImageUploaderController) => c.setMenuOpen('a');
</script>

<!-- shot7/8 — menu open with Edit / Move forward / Delete -->
<Story
	name="Open menu"
	play={async () => {
		const menu = await screen.findByRole('menu');
		await expect(within(menu).getByRole('menuitem', { name: 'Επεξεργασία' })).toBeInTheDocument();
		await expect(
			within(menu).getByRole('menuitem', { name: 'Μετακίνηση προς τα εμπρός' })
		).toBeInTheDocument();
		await expect(within(menu).getByRole('menuitem', { name: 'Διαγραφή' })).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="relative grid aspect-square w-narrow place-items-center">
			<StoryHarness items={[item]} setup={openMenu}>
				<PhotoItemMenu id="a" />
			</StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- Closed by default; opens on trigger click -->
<Story
	name="Trigger"
	play={async ({ canvas }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Επιλογές φωτογραφίας' }));
		await expect(await screen.findByRole('menu')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="relative grid aspect-square w-narrow place-items-center">
			<StoryHarness items={[item]}>
				<PhotoItemMenu id="a" />
			</StoryHarness>
		</div>
	{/snippet}
</Story>
