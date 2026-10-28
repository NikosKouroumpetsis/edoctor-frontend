<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { Slider } from '$shared/ui/primitives/slider';

	// The application's meta (`atoms/slider`); its `accessibilityLabel` is the web's `aria-label`.
	const { Story } = defineMeta({
		title: 'Primitives/Slider',
		component: Slider,
		tags: ['autodocs'],
		args: { 'aria-label': 'Ένταση', min: 0, max: 100, step: 1, disabled: false, value: 40 },
		argTypes: {
			min: { control: 'number' },
			max: { control: 'number' },
			step: { control: 'number' },
			disabled: { control: 'boolean' },
			size: { control: 'select', options: ['sm', 'default', 'lg'] },
			tone: { control: 'select', options: ['primary', 'accent'] }
		}
	});
</script>

<script lang="ts">
	type SliderValue = number | number[];
	let single = $state<SliderValue>(40);
	let range = $state<SliderValue>([25, 75]);
	const toned = $state<Record<string, SliderValue>>({ primary: [25, 75], accent: [25, 75] });
	const sized = $state<Record<string, SliderValue>>({
		sm: [25, 75],
		default: [25, 75],
		lg: [25, 75]
	});
	let stepped = $state<SliderValue>(40);
</script>

<Story name="Single">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			<Slider aria-label="Ένταση" bind:value={single} />
		</div>
	{/snippet}
</Story>

<Story name="Range">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			<Slider aria-label="Εύρος" bind:value={range} />
		</div>
	{/snippet}
</Story>

<Story name="Tones">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-6">
			{#each ['primary', 'accent'] as const as tone (tone)}
				<p class="text-label-lg text-muted-foreground">{tone}</p>
				<Slider aria-label="Εύρος" {tone} bind:value={toned[tone]} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex w-full max-w-narrow flex-col gap-6">
			{#each ['sm', 'default', 'lg'] as const as size (size)}
				<p class="text-label-lg text-muted-foreground">{size}</p>
				<Slider aria-label="Εύρος" {size} bind:value={sized[size]} />
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4"><Slider {...args} value={40} /></div>
	{/snippet}
</Story>

<!-- Stops every 10. -->
<Story name="Stepped" args={{ max: 100, min: 0, step: 10 }}>
	{#snippet template(args)}
		<div class="flex w-full max-w-narrow flex-col gap-4">
			<Slider {...args} aria-label="Ένταση" bind:value={stepped} />
		</div>
	{/snippet}
</Story>
