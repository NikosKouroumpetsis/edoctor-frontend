<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { controls, step } from '$shared/design/tokens';
	import { UploadRing } from '$shared/ui/primitives/upload-ring';

	// The application's meta (`atoms/upload-ring`), centred in its 16-inset column; sizes come from the scale.
	const { Story } = defineMeta({
		title: 'Primitives/UploadRing',
		component: UploadRing,
		tags: ['autodocs'],
		args: {
			progress: 0.6,
			size: controls['control-md'],
			strokeWidth: step(1),
			indeterminate: false,
			'aria-label': 'Ανέβασμα'
		},
		argTypes: {
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
			size: { control: { type: 'range', min: 24, max: 96, step: 4 } },
			strokeWidth: { control: { type: 'range', min: 2, max: 10, step: 1 } },
			indeterminate: { control: 'boolean' }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="flex flex-col items-center gap-4 p-4"><UploadRing {...args} /></div>
	{/snippet}
</Story>

<Story name="Determinate">
	{#snippet template()}
		<div class="flex flex-col items-center gap-4 p-4">
			<div class="flex flex-row gap-5">
				{#each [0.25, 0.5, 0.75, 1] as progress (progress)}
					<UploadRing {progress} aria-label="Ανέβασμα" />
				{/each}
			</div>
		</div>
	{/snippet}
</Story>

<Story name="Indeterminate" args={{ indeterminate: true }}>
	{#snippet template(args)}
		<div class="flex flex-col items-center gap-4 p-4"><UploadRing {...args} /></div>
	{/snippet}
</Story>

<!-- The ring as it appears on an uploading tile: over the dark scrim. -->
<Story name="On Scrim">
	{#snippet template()}
		<div class="flex flex-col items-center gap-4 p-4">
			<div class="flex size-placeholder-lg items-center justify-center rounded-xl bg-overlay">
				<UploadRing progress={0.4} size={controls['control-md'] + step(1)} aria-label="Ανέβασμα" />
			</div>
		</div>
	{/snippet}
</Story>
