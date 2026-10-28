<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { StepProgress } from '$shared/ui/primitives/step-progress';

	const thicknesses = ['sm', 'md', 'lg'] as const;

	// The application's meta (`atoms/step-progress`), in its 16-inset column 16 apart; the web names the bar.
	const { Story } = defineMeta({
		title: 'Primitives/StepProgress',
		component: StepProgress,
		tags: ['autodocs'],
		args: { steps: 3, currentStep: 1, progress: 0.6, 'aria-label': 'Πρόοδος βημάτων' },
		argTypes: {
			steps: { control: { type: 'range', min: 1, max: 8, step: 1 } },
			currentStep: { control: { type: 'range', min: 0, max: 7, step: 1 } },
			progress: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
			thickness: { control: 'radio', options: thicknesses }
		}
	});
</script>

<Story name="Playground">
	{#snippet template(args)}
		<div class="flex w-full flex-col gap-4 p-4"><StepProgress {...args} /></div>
	{/snippet}
</Story>

<Story name="Stages">
	{#snippet template(args)}
		<div class="flex w-full flex-col gap-4 p-4">
			<div class="flex flex-col gap-5">
				<StepProgress {...args} steps={3} currentStep={0} progress={0} />
				<StepProgress {...args} steps={3} currentStep={1} progress={0.6} />
				<StepProgress {...args} steps={3} currentStep={2} progress={1} />
			</div>
		</div>
	{/snippet}
</Story>

<!-- The segments' thickness (U-06.9): steps of the scale, `md` the default. -->
<Story name="Thicknesses">
	{#snippet template(args)}
		<div class="flex w-full flex-col gap-4 p-4">
			<div class="flex flex-col gap-5">
				{#each thicknesses as thickness (thickness)}
					<StepProgress {...args} steps={3} currentStep={1} progress={0.6} {thickness} />
				{/each}
			</div>
		</div>
	{/snippet}
</Story>
