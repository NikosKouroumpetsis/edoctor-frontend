<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { expect, userEvent, screen } from 'storybook/test';
	import UploaderEmpty from './uploader-empty.svelte';
	import StoryHarness from './story-harness.svelte';

	const { Story } = defineMeta({
		title: 'Organisms/Image uploader/Parts/Uploader empty',
		component: UploaderEmpty,
		tags: ['autodocs']
	});
</script>

<!-- shot1 — empty/entry surface; CTA opens the dialog -->
<Story
	name="Empty (shot1)"
	play={async ({ canvas }) => {
		await expect(canvas.getByText('Προσθέστε μερικές φωτογραφίες')).toBeInTheDocument();
		await userEvent.click(canvas.getByRole('button', { name: 'Προσθέστε φωτογραφίες' }));
		await expect(await screen.findByRole('dialog')).toBeInTheDocument();
	}}
>
	{#snippet template()}
		<div class="mx-auto max-w-form">
			<StoryHarness minCount={5}>
				<UploaderEmpty />
			</StoryHarness>
		</div>
	{/snippet}
</Story>

<!-- Overridable copy + illustration (decision D-3 / A6) -->
<Story name="Custom copy">
	{#snippet template()}
		<div class="mx-auto max-w-form">
			<StoryHarness minCount={3}>
				<UploaderEmpty
					title="Ανεβάστε τις φωτογραφίες σας"
					subtitle="Προσθέστε καθαρές, φωτεινές φωτογραφίες."
					cta="Επιλογή φωτογραφιών"
				/>
			</StoryHarness>
		</div>
	{/snippet}
</Story>
